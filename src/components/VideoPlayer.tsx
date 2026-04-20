import { useEffect, useRef, useState, useCallback } from "react";
import type Hls from 'hls.js';
import { MediaData, ItemDetails } from "../types";
import PopcornLoader from "./PopcornLoader";
import { 
  Download, Settings, Check, ChevronDown, MonitorPlay, Gauge, Maximize, 
  Cast, Play, Pause, Volume2, VolumeX, Info, X, ArrowLeft, Sun, Lock, 
  Unlock, FastForward, Keyboard, Clock, Repeat, Globe, Languages, Type,
  RotateCcw, RotateCw, SkipForward, SkipBack, Sliders, Minus, Plus, Maximize2
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
  initialTime
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
    fontSize: 24,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
  });

  // Gestures & UI State
  const [activeMenu, setActiveMenu] = useState<'settings' | 'quality' | 'subtitles' | 'audio' | 'speed' | null>(null);
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

  const { startDownload } = useDownloadManager();

  // Load Subtitles
  useEffect(() => {
    const subs = subtitleTracks.length > 0 ? subtitleTracks : (mediaData.subtitles || []);
    if (currentSubtitleTrack >= 0 && subs[currentSubtitleTrack]?.url) {
      const url = subs[currentSubtitleTrack].url;
      if (url.endsWith('.srt')) {
        fetch(url)
          .then(res => res.text())
          .then(text => {
            setCustomSubtitles(parseSRT(text));
          })
          .catch(err => console.error("Failed to load subtitles", err));
      } else {
        setCustomSubtitles([]);
      }
    } else {
      setCustomSubtitles([]);
    }
  }, [currentSubtitleTrack, subtitleTracks, mediaData.subtitles]);

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

  const seek = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
    setGestureFeedback({ 
      type: seconds > 0 ? 'forward' : 'backward', 
      value: Math.abs(seconds),
      side: seconds > 0 ? 'right' : 'left'
    });
    setTimeout(() => setGestureFeedback(null), 600);
  }, []);

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
      : `${m}:${s.toString().padStart(2, '0')}`;
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
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 text-center w-full px-10 pointer-events-none">
          <span 
            className="inline-block px-4 py-1 rounded-md shadow-lg"
            style={{ 
              fontSize: `${subtitleSettings.fontSize}px`,
              color: subtitleSettings.color,
              backgroundColor: subtitleSettings.backgroundColor,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
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
            className={`absolute inset-0 z-40 flex flex-col justify-between p-4 md:p-8 pointer-events-none ${useIframeFallback ? 'bg-transparent' : 'bg-gradient-to-t from-black/80 via-transparent to-black/60'}`}
          >
            {/* Top Bar - ALWAYS VISIBLE */}
            <div className="flex items-center justify-between pointer-events-auto">
              <button onClick={onClose} className="p-2 bg-black/40 backdrop-blur-md hover:bg-black/80 rounded-full transition-all">
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div className="flex-1 text-center px-4">
                <h1 className="text-white font-medium text-sm md:text-base truncate drop-shadow-lg">{title}</h1>
              </div>
              {!useIframeFallback && (
                <button onClick={() => setIsLocked(true)} className="p-2 hover:bg-white/10 rounded-full transition-all">
                  <Lock className="w-6 h-6 text-white" />
                </button>
              )}
            </div>

            {/* Middle and Bottom Controls - HIDDEN FOR IFRAME */}
            {!useIframeFallback && (
               <>
                {/* Left Side Brightness Slider */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 pointer-events-auto">
                  <Sun className="w-5 h-5 text-white/80" />
                  <div className="relative h-32 w-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-white transition-all duration-100"
                      style={{ height: `${(brightness / 2) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Center Controls */}
                <div className="flex items-center justify-center gap-12 md:gap-24 pointer-events-auto">
                  <button 
                    onClick={() => seek(-10)} 
                    className="group flex flex-col items-center gap-1 text-white/80 hover:text-white transition-all transform active:scale-95"
                  >
                    <div className="relative">
                      <RotateCcw className="w-10 h-10 md:w-14 md:h-14" strokeWidth={1.5} />
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
                      <RotateCw className="w-10 h-10 md:w-14 md:h-14" strokeWidth={1.5} />
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] md:text-xs font-bold mt-1">10</span>
                    </div>
                  </button>
                </div>

                {/* Bottom Controls */}
                <div className="space-y-6 pointer-events-auto">
                  {/* Progress Bar */}
                  <div className="group/progress relative pt-4 pb-2">
                    <div className="relative h-1.5 w-full bg-white/20 rounded-full overflow-hidden transition-all duration-300 group-hover/progress:h-2">
                       <div 
                        className="absolute inset-y-0 left-0 bg-brand rounded-full transition-all duration-100 ease-out"
                        style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                      />
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={currentTime}
                      onChange={(e) => {
                        const time = parseFloat(e.target.value);
                        if (videoRef.current) videoRef.current.currentTime = time;
                      }}
                      className="absolute inset-x-0 bottom-0 top-0 w-full opacity-0 cursor-pointer z-10"
                    />
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-brand rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform duration-200 pointer-events-none"
                      style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 8px)` }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6 md:gap-10">
                      <div className="flex items-center gap-3 text-white/90 text-sm md:text-base font-medium tabular-nums">
                        <span>{formatTime(currentTime)}</span>
                        <span className="text-white/30">/</span>
                        <span className="text-white/60">{formatTime(duration)}</span>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <button 
                          onClick={() => {
                            const currentSource = mediaData.sources[selectedSourceIdx];
                            if (currentSource) {
                              startDownload(id, title, currentSource.downloadUrl || currentSource.url);
                            }
                          }}
                          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
                        >
                          <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">Download</span>
                        </button>
                        
                        <button 
                          onClick={() => setActiveMenu('speed')}
                          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
                        >
                          <Gauge className="w-5 h-5 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">{playbackSpeed}x</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setActiveMenu('settings')}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
                      >
                        <Languages className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest hidden md:inline">Audio & Subtitles</span>
                      </button>
                      
                      <button 
                        onClick={() => {
                          if (containerRef.current?.requestFullscreen) {
                            containerRef.current.requestFullscreen();
                          }
                        }}
                        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group"
                      >
                        <Maximize2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
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

      {/* Settings Modals - Updated to be more compact and centered */}
      <AnimatePresence>
        {activeMenu && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-md bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-lg font-bold text-white capitalize">{activeMenu === 'settings' ? 'Audio & Subtitles' : activeMenu}</h2>
                <button onClick={() => setActiveMenu(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                <div className="grid grid-cols-1 gap-2">
                  {activeMenu === 'settings' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 px-2">Audio</h3>
                        <div className="space-y-1">
                          {/* Use mediaData audioTracks if available, otherwise fallback to HLS tracks */}
                          {(mediaData.audioTracks && mediaData.audioTracks.length > 0 ? mediaData.audioTracks.slice(0, 5) : audioTracks.slice(0, 5)).map((track: any, idx) => {
                            const isSelected = track.subjectId 
                              ? (track.subjectId === id || track.isOriginal)
                              : currentAudioTrack === idx;
                              
                            return (
                              <button 
                                key={idx}
                                onClick={() => handleAudioTrackChangeInternal(track.subjectId ? track : { ...track, idx })}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isSelected ? 'bg-brand text-white shadow-lg' : 'hover:bg-white/5 text-white/60'}`}
                              >
                                <span className="font-bold">{track.language || track.name || `Track ${idx + 1}`}</span>
                                {isSelected && <Check className="w-5 h-5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 px-2">Subtitles</h3>
                        <div className="space-y-1">
                          <button 
                            onClick={() => {
                              if (hlsRef.current) hlsRef.current.subtitleTrack = -1;
                              setCurrentSubtitleTrack(-1);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${currentSubtitleTrack === -1 ? 'bg-brand text-white shadow-lg' : 'hover:bg-white/5 text-white/60'}`}
                          >
                            <span className="font-bold">Off</span>
                            {currentSubtitleTrack === -1 && <Check className="w-5 h-5" />}
                          </button>
                          {(mediaData.subtitles && mediaData.subtitles.length > 0 ? mediaData.subtitles.slice(0, 7) : subtitleTracks.slice(0, 7)).map((track: any, idx) => (
                            <button 
                              key={idx}
                              onClick={() => {
                                if (hlsRef.current) hlsRef.current.subtitleTrack = idx;
                                setCurrentSubtitleTrack(idx);
                              }}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${currentSubtitleTrack === idx ? 'bg-brand text-white shadow-lg' : 'hover:bg-white/5 text-white/60'}`}
                            >
                              <span className="font-bold">{track.language || track.name || `Track ${idx + 1}`}</span>
                              {currentSubtitleTrack === idx && <Check className="w-5 h-5" />}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2">
                        <button 
                          onClick={() => setActiveMenu('quality')}
                          className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-white"
                        >
                          <div className="flex items-center gap-3">
                            <Sliders className="w-5 h-5 text-brand" />
                            <span className="font-bold">Quality</span>
                          </div>
                          <span className="text-white/40 text-sm font-bold">
                            {hlsRef.current && hlsRef.current.currentLevel === -1 ? 'Auto' : 
                             hlsRef.current ? `${hlsLevels[hlsCurrentLevel]?.height}p` : 
                             `${mediaData.sources[selectedSourceIdx]?.quality}p`}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {activeMenu === 'speed' && [0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
                    <button 
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        if (videoRef.current) videoRef.current.playbackRate = speed;
                        updatePreferences({ playbackSpeed: speed });
                        setActiveMenu(null);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${playbackSpeed === speed ? 'bg-brand text-white shadow-lg' : 'hover:bg-white/5 text-white/60'}`}
                    >
                      <span className="font-bold">{speed}x</span>
                      {playbackSpeed === speed && <Check className="w-5 h-5" />}
                    </button>
                  ))}

                  {activeMenu === 'quality' && (
                    <div className="space-y-1">
                      {/* Quality selection for HLS */}
                      {hlsRef.current && (
                        <>
                          <button 
                            onClick={() => {
                              if (hlsRef.current) hlsRef.current.currentLevel = -1;
                              setHlsCurrentLevel(-1);
                              setActiveMenu(null);
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${hlsCurrentLevel === -1 ? 'bg-brand text-white' : 'hover:bg-white/5 text-white/60'}`}
                          >
                            <span className="font-bold">Auto (Adaptive)</span>
                            {hlsCurrentLevel === -1 && <Check className="w-5 h-5" />}
                          </button>
                          {hlsLevels.map((level, idx) => (
                            <button 
                              key={idx}
                              onClick={() => {
                                if (hlsRef.current) hlsRef.current.currentLevel = idx;
                                setHlsCurrentLevel(idx);
                                setActiveMenu(null);
                              }}
                              className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${hlsCurrentLevel === idx ? 'bg-brand text-white' : 'hover:bg-white/5 text-white/60'}`}
                            >
                              <span className="font-bold">{level.height}p</span>
                              {hlsCurrentLevel === idx && <Check className="w-5 h-5" />}
                            </button>
                          ))}
                        </>
                      )}
                      
                      {/* Quality selection for MP4 (static sources) */}
                      {!hlsRef.current && mediaData.sources.map((source, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setSelectedSourceIdx(idx);
                            setActiveMenu(null);
                          }}
                          className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${selectedSourceIdx === idx ? 'bg-brand text-white shadow-lg' : 'hover:bg-white/5 text-white/60'}`}
                        >
                          <span className="font-bold">{source.quality}p</span>
                          {selectedSourceIdx === idx && <Check className="w-5 h-5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
