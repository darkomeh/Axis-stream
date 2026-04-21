import { useEffect, useRef, useState, useCallback } from "react";
import type Hls from 'hls.js';
import { MediaData, ItemDetails } from "../types";
import PopcornLoader from "./PopcornLoader";
import { 
  Download, Settings, Check, ChevronDown, MonitorPlay, Gauge, Maximize, 
  Cast, Play, Pause, Volume2, VolumeX, Info, X, ArrowLeft, Sun, Lock, 
  Unlock, FastForward, Keyboard, Clock, Repeat, Globe, Languages, Type,
  RotateCcw, RotateCw, SkipForward, SkipBack, Sliders, Minus, Plus, Maximize2, HelpCircle
} from "lucide-react";
import { useDownloadManager } from "../services/downloadService";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { parseSRT, SubtitleItem } from "../lib/subtitleParser";

// Dynamically import Hls to reduce bundle size
const loadHls = () => import("hls.js").then(m => m.default);

interface VideoPlayerProps {
  mediaData: MediaData;
  poster?: string;
  title: string;
  description: string;
  id: string;
  onClose?: () => void;
  isTrailer?: boolean;
  seasons?: ItemDetails['seasons'];
  selectedSeason?: number;
  selectedEpisode?: number;
  onEpisodeChange?: (s: number, e: number) => void;
  onAudioTrackChange?: (subjectId: string) => void;
  isOffline?: boolean;
  isMiniPlayer?: boolean;
  onCloseMiniPlayer?: () => void;
  initialTime?: number;
}

export default function VideoPlayer({ 
  mediaData, 
  poster, 
  title, 
  description, 
  id, 
  onClose, 
  isTrailer,
  seasons,
  selectedSeason,
  selectedEpisode,
  onEpisodeChange,
  onAudioTrackChange,
  isOffline,
  isMiniPlayer,
  onCloseMiniPlayer,
  initialTime,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { preferences, addWatchTime, user, updateContinueWatching, updatePreferences } = useAuth();
  
  // Track if we need to fall back to an iframe instead of direct video play
  const useIframeFallback = isTrailer || (mediaData.sources.length === 0 && !!mediaData.embedUrl);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  
  // Quality
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState<number>(-1);
  
  // Audio & Subtitles
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<number>(-1);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState<number>(-1);
  
  // Custom Subtitles (SRT)
  const [customSubtitles, setCustomSubtitles] = useState<SubtitleItem[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleItem | null>(null);
  const [subtitleSettings, setSubtitleSettings] = useState({
    fontSize: 18,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.4)',
    verticalPosition: 5, // percentage from bottom
  });

  // Gestures & UI State
  const [activeMenu, setActiveMenu] = useState<'settings' | 'quality' | 'subtitles' | 'audio' | 'speed' | 'caption-settings' | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [zoom, setZoom] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [playbackSpeed, setPlaybackSpeed] = useState(preferences?.playbackSpeed || 1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<{ type: string; value: string | number; side?: 'left' | 'right' } | null>(null);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  // Load Subtitles
  const [sortedSubtitles, setSortedSubtitles] = useState<any[]>([]);

  useEffect(() => {
    const rawSubs = subtitleTracks.length > 0 ? subtitleTracks : (mediaData.subtitles || []);
    // Map languageCodes to full names
    const languageMap: Record<string, string> = {
      'en': 'English', 'ar': 'Arabic', 'es': 'Spanish', 'fr': 'French',
      'de': 'German', 'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian',
      'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean', 'hi': 'Hindi',
      'id': 'Indonesian', 'tr': 'Turkish', 'nl': 'Dutch', 'pl': 'Polish',
      'vi': 'Vietnamese', 'th': 'Thai', 'ms': 'Malay', 'tl': 'Tagalog'
    };
    
    const processedSubs = [...rawSubs].map(sub => ({
      ...sub,
      displayName: languageMap[sub.languageCode] || sub.language || sub.name || sub.languageCode || 'Unknown'
    })).sort((a, b) => {
      if (a.languageCode === 'en') return -1;
      if (b.languageCode === 'en') return 1;
      return 0;
    });

    setSortedSubtitles(processedSubs);
  }, [subtitleTracks, mediaData.subtitles]);

  useEffect(() => {
    if (currentSubtitleTrack >= 0 && sortedSubtitles[currentSubtitleTrack]?.url) {
      const url = sortedSubtitles[currentSubtitleTrack].url;
      // Many stream CDNs block CORS. We can reuse image proxy for fetching text securely.
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
      
      fetch(proxyUrl)
        .then(res => res.text())
        .then(text => {
          setCustomSubtitles(parseSRT(text));
        })
        .catch(err => {
           console.error("Failed to load subtitles via proxy, falling back to direct", err);
           fetch(url)
            .then(res => res.text())
            .then(text => setCustomSubtitles(parseSRT(text)))
            .catch(e => console.error("Total failure loading subtitles:", e));
        });
    } else {
      setCustomSubtitles([]);
    }
  }, [currentSubtitleTrack, sortedSubtitles]);

  // Sync Subtitles
  useEffect(() => {
    if (customSubtitles.length > 0) {
      const sub = customSubtitles.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
      setActiveSubtitle(sub || null);
    } else {
      setActiveSubtitle(null);
    }
  }, [currentTime, customSubtitles]);

  // Handle Controls Visibility
  const showControlsTemporarily = useCallback(() => {
    if (isLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !activeMenu) setShowControls(false);
    }, 3000);
  }, [isPlaying, isLocked, activeMenu]);

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, activeMenu, showControlsTemporarily]);

  // Track watch time and update on unmount
  useEffect(() => {
    return () => {
      // Upon unmounting, if we've watched something, record it
      if (videoRef.current) {
        const timeWatched = videoRef.current.currentTime;
        if (timeWatched > 60) {
          // Add watch time in minutes
          addWatchTime(Math.floor(timeWatched / 60));
        }
      }
    };
  }, [addWatchTime]);

  // Video State Handlers
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
  }, []);

  const seek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, videoRef.current.currentTime + seconds);
    seekTo(newTime);
    
    setGestureFeedback({ 
      type: seconds > 0 ? 'forward' : 'backward', 
      value: Math.abs(seconds),
      side: seconds > 0 ? 'right' : 'left'
    });
    setTimeout(() => setGestureFeedback(null), 600);
  }, [seekTo]);

  // Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Double Tap Detection
    const now = Date.now();
    const timesinceLastTap = now - lastTapRef.current;
    if (timesinceLastTap < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width / 3) {
        seek(-10);
      } else if (x > (rect.width * 2) / 3) {
        seek(10);
      }
      lastTapRef.current = 0; // Reset
      return;
    }
    lastTapRef.current = now;

    // Long Press Detection
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (videoRef.current) videoRef.current.playbackRate = 2;
      setGestureFeedback({ type: 'speed', value: '2x' });
    }, 500);

    // Pinch Detection
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked || !touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Cancel long press if moved significantly
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    }

    // Swipe Gestures (Volume & Brightness)
    if (e.touches.length === 1 && !isLongPressing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touchStartRef.current.x - rect.left;
      
      if (Math.abs(deltaY) > 20) {
        if (x < rect.width / 3) {
          // Left side: Brightness
          const newBrightness = Math.min(2, Math.max(0.1, brightness - deltaY / 200));
          setBrightness(newBrightness);
          setGestureFeedback({ type: 'brightness', value: Math.round(newBrightness * 50) });
        } else if (x > (rect.width * 2) / 3) {
          // Right side: Volume
          const newVolume = Math.min(1, Math.max(0, volume - deltaY / 200));
          setVolume(newVolume);
          if (videoRef.current) videoRef.current.volume = newVolume;
          setGestureFeedback({ type: 'volume', value: Math.round(newVolume * 100) });
        }
        // Update start point to make it feel continuous
        touchStartRef.current.y = touch.clientY;
      }
    }

    // Pinch Zoom
    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistanceRef.current;
      if (ratio > 1.2) setZoom('fill');
      if (ratio < 0.8) setZoom('contain');
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    if (isLongPressing) {
      setIsLongPressing(false);
      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
      setGestureFeedback(null);
    }
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
    setTimeout(() => setGestureFeedback(null), 500);
  };

  // Video Initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const sources = mediaData.sources || [];
    if (sources.length === 0) {
      setError("No video sources available.");
      setLoading(false);
      return;
    }

    const source = sources[selectedSourceIdx];
    const isHls = source.type === 'hls' || source.url.includes('.m3u8');
    
    // Save current time to restore after reload
    const currentTimeToRestore = video.currentTime || initialTime || 0;

    setLoading(true);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const init = async () => {
      try {
        if (isHls) {
          const HlsClass = await loadHls();
          if (HlsClass.isSupported()) {
            const hls = new HlsClass({
              enableWorker: true,
              capLevelToPlayerSize: true,
              startLevel: -1, // Auto
            });
            hlsRef.current = hls;
            hls.loadSource(source.url);
            hls.attachMedia(video);
            hls.on(HlsClass.Events.MANIFEST_PARSED, (_, data) => {
              setHlsLevels(data.levels);
              // Only set from HLS if we don't have them in mediaData
              if ((!mediaData.audioTracks || mediaData.audioTracks.length === 0) && hls.audioTracks) {
                setAudioTracks(hls.audioTracks.map(t => ({ language: t.name || t.lang, subjectId: '', languageCode: t.lang })));
              }
              if ((!mediaData.subtitles || mediaData.subtitles.length === 0) && hls.subtitleTracks) {
                setSubtitleTracks(hls.subtitleTracks.map(t => ({ language: t.name || t.lang, url: '' })));
              }
              setLoading(false);
              if (currentTimeToRestore > 0) video.currentTime = currentTimeToRestore;
              if (isPlaying) video.play().catch(() => {});
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = source.url;
          }
        } else {
          video.src = source.url;
          video.onloadedmetadata = () => {
            setLoading(false);
            if (currentTimeToRestore > 0) video.currentTime = currentTimeToRestore;
            if (isPlaying) video.play().catch(() => {});
          };
          video.onerror = () => {
            // Fallback to next quality if this fails
            if (selectedSourceIdx + 1 < sources.length) {
              setSelectedSourceIdx(prev => prev + 1);
            } else {
              setError("Failed to load video source.");
            }
          };
        }
      } catch (err) {
        console.error("Video init error", err);
        setError("An error occurred while initializing the player.");
      }
    };

    init();

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [selectedSourceIdx, mediaData.sources, initialTime, id]);

  // Handle Audio Track Change (Reloading stream)
  const handleAudioTrackChangeInternal = (track: any) => {
    if (track.subjectId && onAudioTrackChange) {
      // If we have a subjectId, we notify the parent to reload the MediaData
      onAudioTrackChange(track.subjectId);
    } else if (hlsRef.current && track.idx !== undefined) {
      // Standard HLS track change
      hlsRef.current.audioTrack = track.idx;
      setCurrentAudioTrack(track.idx);
    }
    setActiveMenu(null);
  };

  // Sync Video State
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
    };
  }, []);

  const formatTime = (time: number) => {
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60);
    const s = Math.floor(time % 60);
    return h > 0 
      ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none touch-none group"
      style={{ filter: `brightness(${brightness})` }}
      onMouseMove={showControlsTemporarily}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Video Element */}
      {useIframeFallback ? (
        <iframe
          src={mediaData.embedUrl}
          className="w-full h-full border-none absolute inset-0 z-10"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          onLoad={() => setLoading(false)}
        />
      ) : (
        <video
          ref={videoRef}
          className={`w-full h-full transition-all duration-300 relative z-10 ${
            zoom === 'cover' ? 'object-cover' : zoom === 'fill' ? 'object-fill' : 'object-contain'
          }`}
          playsInline
          autoPlay
          crossOrigin="anonymous"
        />
      )}

      {/* Loading Spinner */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20 z-10"
          >
            <PopcornLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gesture Feedback */}
      <AnimatePresence>
        {gestureFeedback && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none ${
              gestureFeedback.side === 'left' ? 'left-1/4' : 
              gestureFeedback.side === 'right' ? 'right-1/4' : 
              'left-1/2 -translate-x-1/2'
            }`}
          >
            <div className="flex flex-col items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-6 py-4 border border-white/10">
              {gestureFeedback.type === 'forward' && <RotateCw className="w-8 h-8 text-white" />}
              {gestureFeedback.type === 'backward' && <RotateCcw className="w-8 h-8 text-white" />}
              {gestureFeedback.type === 'volume' && <Volume2 className="w-8 h-8 text-white" />}
              {gestureFeedback.type === 'brightness' && <Sun className="w-8 h-8 text-white" />}
              {gestureFeedback.type === 'speed' && <Gauge className="w-8 h-8 text-white" />}
              <span className="text-white font-black text-xl">
                {gestureFeedback.type === 'forward' ? `+${gestureFeedback.value}s` : 
                 gestureFeedback.type === 'backward' ? `-${gestureFeedback.value}s` : 
                 gestureFeedback.value}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtitles Overlay */}
      {activeSubtitle && (
        <div 
          className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-30 px-4 transition-all overflow-visible"
          style={{ bottom: `${subtitleSettings.verticalPosition}%` }}
        >
          <span 
            className="font-medium leading-tight inline-block px-3 py-1 rounded backdrop-blur-sm"
            style={{ 
              fontSize: `${subtitleSettings.fontSize}px`,
              color: subtitleSettings.color,
              backgroundColor: subtitleSettings.backgroundColor,
              textShadow: "1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black",
              whiteSpace: "pre-wrap",
              textAlign: "center",
              maxWidth: "90%"
            }}
          >
            {activeSubtitle.text}
          </span>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-40 flex flex-col justify-between pointer-events-none ${useIframeFallback ? 'bg-transparent' : 'bg-gradient-to-t from-black/80 via-transparent to-black/60'}`}
          >
            {/* Top Bar - Matching screenshot */}
            <div className="flex items-center justify-between p-4 md:p-6 pointer-events-auto">
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all text-white">
                <ArrowLeft className="w-8 h-8 drop-shadow-md" />
              </button>
              
              {!useIframeFallback && (
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsLocked(true)} className="p-2 hover:bg-white/20 rounded-full transition-all text-white">
                    <Lock className="w-6 h-6 drop-shadow-md" />
                  </button>
                  <button className="flex flex-col items-center p-2 text-white hover:text-gray-300 transition-colors cursor-help">
                    <HelpCircle className="w-7 h-7 drop-shadow-md mb-1" />
                    <span className="text-[10px] font-medium drop-shadow-md">Help</span>
                  </button>
                </div>
              )}
            </div>

            {/* Middle and Bottom Controls - HIDDEN FOR IFRAME */}
            {!useIframeFallback && (
               <>
                {/* Center Controls (Big Play button for when paused/loading or just keeping the existing one) */}
                <div className="flex items-center justify-center gap-12 md:gap-24 pointer-events-auto">
                  <button 
                    onClick={() => seek(-10)} 
                    className="group flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all transform active:scale-95"
                  >
                    <div className="relative">
                      <RotateCcw className="w-10 h-10 md:w-14 md:h-14 drop-shadow-lg" strokeWidth={1.5} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold mt-1">10</span>
                    </div>
                  </button>
                  
                  <button 
                    onClick={togglePlay} 
                    className="w-20 h-20 md:w-28 md:h-28 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-full border border-white/10 text-white hover:scale-110 active:scale-90 transition-all shadow-2xl group"
                  >
                    {isPlaying ? (
                      <Pause className="w-10 h-10 md:w-14 md:h-14 fill-white transition-transform group-hover:scale-110" />
                    ) : (
                      <Play className="w-10 h-10 md:w-14 md:h-14 fill-white ml-2 transition-transform group-hover:scale-110" />
                    )}
                  </button>

                  <button 
                    onClick={() => seek(10)} 
                    className="group flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all transform active:scale-95"
                  >
                    <div className="relative">
                      <RotateCw className="w-10 h-10 md:w-14 md:h-14 drop-shadow-lg" strokeWidth={1.5} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold mt-1">10</span>
                    </div>
                  </button>
                </div>

                {/* Bottom Controls (Screenshot Match) */}
                <div className="pointer-events-auto bg-gradient-to-t from-black/90 to-transparent p-4 md:p-8">
                  <div className="flex flex-col gap-4">
                    
                    {/* Top Row of Bottom Bar (Optional tools like Download/Settings we kept) */}
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-4">
                         <button 
                            onClick={() => {
                              const currentSource = mediaData.sources[selectedSourceIdx];
                              if (currentSource) {
                                let downloadTargetUrl = currentSource.downloadUrl || currentSource.url;
                                const finalUrl = downloadTargetUrl.includes('download=1') ? downloadTargetUrl : `${downloadTargetUrl}&download=1`;
                                
                                let cleanTitle = title.replace(/[^a-zA-Z0-9 -]/g, '');
                                const fileName = `[${cleanTitle}] [Axis Stream].mp4`;
                                
                                const a = document.createElement('a');
                                a.href = finalUrl;
                                a.download = fileName;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                              }
                            }}
                            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
                          >
                            <Download className="w-5 h-5 drop-shadow-md" />
                         </button>
                       </div>
                       <div className="flex items-center gap-4">
                         <button onClick={() => setActiveMenu('speed')} className="text-white/70 hover:text-white pb-1">
                            <span className="text-sm font-bold uppercase tracking-widest drop-shadow-md">{playbackSpeed}x</span>
                         </button>
                         <button onClick={() => setActiveMenu('settings')} className="text-white/70 hover:text-white">
                           <Settings className="w-5 h-5 drop-shadow-md" />
                         </button>
                       </div>
                    </div>

                    {/* Bottom Row: Play, Progress, Time, Screen Icons */}
                    <div className="flex items-center gap-4 md:gap-6 w-full">
                      <button onClick={togglePlay} className="text-white hover:text-gray-300 transition-colors flex-shrink-0">
                        {isPlaying ? <Pause className="w-6 h-6 md:w-8 md:h-8 fill-white drop-shadow-md" /> : <Play className="w-6 h-6 md:w-8 md:h-8 fill-white drop-shadow-md" />}
                      </button>

                      <div className="group/progress relative flex-1 h-6 flex items-center cursor-pointer">
                        <div className="w-full h-1.5 md:h-2 bg-white/30 rounded-full overflow-hidden relative">
                           <div 
                            className="absolute inset-y-0 left-0 bg-[#00A8E1] rounded-full transition-all duration-100 ease-out"
                            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                          />
                        </div>
                        <input 
                          type="range"
                          min={0}
                          max={duration || 100}
                          step={0.1}
                          value={currentTime}
                          onChange={(e) => {
                            const time = parseFloat(e.target.value);
                            if (videoRef.current) videoRef.current.currentTime = time;
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div 
                          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-lg transition-transform duration-100 pointer-events-none"
                          style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 8px)` }}
                        />
                      </div>

                      <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
                        <div className="text-white/90 text-xs md:text-sm font-mono tracking-wide drop-shadow-md">
                          {formatTime(currentTime)}/{formatTime(duration)}
                        </div>
                        
                        <button className="text-white hover:text-gray-300 transition-colors relative group">
                           {/* Using a screen icon to represent "Episodes" or "Picture in Picture" next to fullscreen */}
                           <MonitorPlay className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md" />
                           {seasons && seasons.length > 0 && (
                             <div className="absolute bottom-full right-0 mb-4 bg-black/90 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                               Episodes
                             </div>
                           )}
                        </button>

                        <button 
                          onClick={() => {
                            if (containerRef.current?.requestFullscreen) {
                              containerRef.current.requestFullscreen();
                            }
                          }}
                          className="text-white hover:text-gray-300 transition-colors"
                        >
                          <Maximize className="w-5 h-5 md:w-6 md:h-6 drop-shadow-md" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
               </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock Button (Always visible when locked) */}
      <AnimatePresence>
        {isLocked && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsLocked(false)}
            className="absolute top-4 right-4 z-50 p-3 bg-black/40 backdrop-blur-xl rounded-full border border-white/20 text-white"
          >
            <Lock className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Settings Modals - Compact Popover matched to screenshot style */}
      <AnimatePresence>
        {activeMenu && (
          <div className="absolute inset-0 z-50" onClick={() => setActiveMenu(null)}>
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-20 right-4 md:right-8 w-60 max-w-[calc(100vw-2rem)] bg-[#e6e6e6] dark:bg-[#1c1c1c] rounded-md shadow-2xl overflow-hidden pointer-events-auto text-[#333] dark:text-[#eee]"
            >
              {activeMenu !== 'settings' && (
                <div className="flex items-center p-3 border-b border-black/5 dark:border-white/5 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" onClick={() => setActiveMenu('settings')}>
                  <ArrowLeft className="w-4 h-4 mr-2 opacity-70" />
                  <span className="font-medium text-[13px] capitalize">{activeMenu}</span>
                </div>
              )}

              <div className="max-h-[60vh] overflow-y-auto no-scrollbar py-2">
                  {activeMenu === 'settings' && (
                    <div className="flex flex-col">
                      <button 
                        onClick={() => setActiveMenu('audio')}
                        className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[14px] font-medium opacity-80">Audio</span>
                        <div className="flex items-center gap-1 text-[13px] opacity-70">
                           <span>{mediaData.audioTracks?.[currentAudioTrack]?.language || 'Default'}</span>
                           <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveMenu('subtitles')}
                        className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[14px] font-medium opacity-80">Captions</span>
                        <div className="flex items-center gap-1 text-[13px] opacity-70">
                           <span>{currentSubtitleTrack === -1 ? 'Off' : sortedSubtitles[currentSubtitleTrack]?.displayName || 'Default'}</span>
                           <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveMenu('caption-settings')}
                        className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[14px] font-medium opacity-80">Caption Style</span>
                        <div className="flex items-center gap-1 text-[13px] opacity-70">
                           <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveMenu('quality')}
                        className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[14px] font-medium opacity-80">Quality</span>
                        <div className="flex items-center gap-1 text-[13px] opacity-70">
                           <span>
                             {hlsRef.current && hlsRef.current.currentLevel === -1 ? 'Auto' : 
                              hlsRef.current ? `${hlsLevels[hlsCurrentLevel]?.height}p` : 
                              selectedSourceIdx >= 0 && mediaData.sources[selectedSourceIdx] ? `${mediaData.sources[selectedSourceIdx]?.quality}p` : 'Auto'}
                           </span>
                           <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                        </div>
                      </button>
                      <button 
                        onClick={() => setActiveMenu('speed')}
                        className="w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                      >
                        <span className="text-[14px] font-medium opacity-80">Speed</span>
                        <div className="flex items-center gap-1 text-[13px] opacity-70">
                           <span>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                           <ChevronDown className="w-3 h-3 -rotate-90 ml-1" />
                        </div>
                      </button>
                    </div>
                  )}

                  {activeMenu === 'caption-settings' && (
                    <div className="flex flex-col text-[14px]">
                      <button onClick={() => setActiveMenu('settings')} className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Back to Settings
                      </button>
                      <div className="px-5 py-2 font-medium opacity-80 text-white/60">Font Size</div>
                      <div className="flex px-5 pb-3 gap-2 border-b border-white/10">
                        {[14, 18, 22, 28].map(size => (
                          <button key={size} onClick={() => setSubtitleSettings(s => ({...s, fontSize: size}))} className={`px-3 py-1.5 rounded transition-colors ${subtitleSettings.fontSize === size ? 'bg-[#00A8E1] text-white' : 'bg-black/20 dark:bg-white/10 hover:bg-white/20'}`}>
                            {size === 14 ? 'S' : size === 18 ? 'M' : size === 22 ? 'L' : 'XL'}
                          </button>
                        ))}
                      </div>
                      
                      <div className="px-5 py-2 font-medium opacity-80 text-white/60 mt-2">Color</div>
                      <div className="flex px-5 pb-3 gap-3 border-b border-white/10">
                        {['#ffffff', '#ffff00', '#00ffff', '#ff00ff'].map(color => (
                          <button key={color} onClick={() => setSubtitleSettings(s => ({...s, color}))} className={`w-8 h-8 rounded-full border-2 transition-transform ${subtitleSettings.color === color ? 'scale-110 border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : 'border-transparent shadow-none'}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>

                      <div className="px-5 py-2 font-medium opacity-80 text-white/60 mt-2">Position</div>
                      <div className="flex px-5 pb-4 gap-2">
                         {[5, 12, 20, 35].map(pos => (
                          <button key={pos} onClick={() => setSubtitleSettings(s => ({...s, verticalPosition: pos}))} className={`px-2 py-1.5 text-xs rounded transition-colors ${subtitleSettings.verticalPosition === pos ? 'bg-[#00A8E1] text-white' : 'bg-black/20 dark:bg-white/10 hover:bg-white/20'}`}>
                            {pos === 5 ? 'Bottom' : pos === 12 ? 'Low' : pos === 20 ? 'Mid' : 'High'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeMenu === 'audio' && (
                    <div className="flex flex-col">
                      <button onClick={() => setActiveMenu('settings')} className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Back 
                      </button>
                      {(mediaData.audioTracks && mediaData.audioTracks.length > 0 ? mediaData.audioTracks.slice(0, 5) : audioTracks.slice(0, 5)).map((track: any, idx) => {
                         const isSelected = track.subjectId ? (track.subjectId === id || track.isOriginal) : currentAudioTrack === idx;
                         return (
                           <button 
                             key={idx}
                             onClick={() => handleAudioTrackChangeInternal(track.subjectId ? track : { ...track, idx })}
                             className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${isSelected ? 'font-bold text-[#00A8E1]' : ''}`}
                           >
                             <span>{track.language || track.name || `Track ${idx + 1}`}</span>
                             {isSelected && <Check className="w-4 h-4" />}
                           </button>
                         );
                      })}
                    </div>
                  )}

                  {activeMenu === 'subtitles' && (
                    <div className="flex flex-col">
                       <button onClick={() => setActiveMenu('settings')} className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Back 
                      </button>
                       <button 
                         onClick={() => {
                           if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                           setCurrentSubtitleTrack(-1);
                           setActiveMenu('settings');
                         }}
                         className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${currentSubtitleTrack === -1 ? 'font-bold text-[#00A8E1]' : ''}`}
                       >
                         <span>Off</span>
                         {currentSubtitleTrack === -1 && <Check className="w-4 h-4" />}
                       </button>
                       {(sortedSubtitles.length > 0 ? sortedSubtitles.slice(0, 10) : subtitleTracks.slice(0, 10)).map((track: any, idx) => (
                         <button 
                           key={idx}
                           onClick={() => {
                             if (hlsRef.current) hlsRef.current.subtitleTrack = idx;
                             setCurrentSubtitleTrack(idx);
                             setActiveMenu('settings');
                           }}
                           className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${currentSubtitleTrack === idx ? 'font-bold text-[#00A8E1]' : ''}`}
                         >
                           <span>{track.displayName || track.language || track.name || (idx === 0 ? 'English (Auto)' : `Track ${idx + 1}`)}</span>
                           {currentSubtitleTrack === idx && <Check className="w-4 h-4" />}
                         </button>
                       ))}
                    </div>
                  )}

                  {activeMenu === 'speed' && (
                    <div className="flex flex-col">
                      <button onClick={() => setActiveMenu('settings')} className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Back 
                      </button>
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                        <button 
                          key={speed}
                          onClick={() => {
                            setPlaybackSpeed(speed);
                            if (videoRef.current) videoRef.current.playbackRate = speed;
                            updatePreferences({ playbackSpeed: speed });
                            setActiveMenu('settings');
                          }}
                          className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${playbackSpeed === speed ? 'font-bold text-[#00A8E1]' : ''}`}
                        >
                          <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                          {playbackSpeed === speed && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {activeMenu === 'quality' && (
                    <div className="flex flex-col">
                      <button onClick={() => setActiveMenu('settings')} className="flex items-center gap-2 px-4 py-3 border-b border-white/10 hover:bg-white/5 transition-colors font-medium">
                        <ChevronDown className="w-4 h-4 rotate-90" />
                        Back 
                      </button>
                      {hlsRef.current && (
                        <>
                          <button 
                            onClick={() => {
                              if (hlsRef.current) hlsRef.current.currentLevel = -1;
                              setHlsCurrentLevel(-1);
                              setActiveMenu('settings');
                            }}
                            className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${hlsCurrentLevel === -1 ? 'font-bold text-[#00A8E1]' : ''}`}
                          >
                            <span>Auto (Adaptive)</span>
                            {hlsCurrentLevel === -1 && <Check className="w-4 h-4" />}
                          </button>
                          {hlsLevels.map((level, idx) => (
                            <button 
                              key={idx}
                              onClick={() => {
                                if (hlsRef.current) hlsRef.current.currentLevel = idx;
                                setHlsCurrentLevel(idx);
                                setActiveMenu('settings');
                              }}
                              className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${hlsCurrentLevel === idx ? 'font-bold text-[#00A8E1]' : ''}`}
                            >
                              <span>{level.height}p</span>
                              {hlsCurrentLevel === idx && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </>
                      )}
                      
                      {!hlsRef.current && mediaData.sources && mediaData.sources.map((source, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedSourceIdx(idx);
                            setActiveMenu('settings');
                          }}
                          className={`w-full flex items-center justify-between px-5 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[14px] ${selectedSourceIdx === idx ? 'font-bold text-[#00A8E1]' : ''}`}
                        >
                          <span>{source.quality}p</span>
                          {selectedSourceIdx === idx && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
