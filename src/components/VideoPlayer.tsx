import { useEffect, useRef, useState, MouseEvent, TouchEvent } from "react";
import type Hls from 'hls.js';
import { MediaData, ItemDetails } from "../types";
import PopcornLoader from "./PopcornLoader";
import { Download, Settings, Check, ChevronDown, MonitorPlay, Gauge, Maximize, Cast, Play, Pause, Volume2, VolumeX, Info, X, ArrowLeft, Sun, Lock, Unlock } from "lucide-react";
import { useDownloadManager } from "../services/downloadService";
import { motion, AnimatePresence } from "motion/react";

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
  isOffline?: boolean;
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
  isOffline
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const { startDownload } = useDownloadManager();
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Quality
  const [selectedSourceIdx, setSelectedSourceIdx] = useState(0);
  const [hlsLevels, setHlsLevels] = useState<any[]>([]);
  const [hlsCurrentLevel, setHlsCurrentLevel] = useState<number>(-1); // -1 is Auto
  
  // Menus
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [isLocked, setIsLocked] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  
  // Playback Speed
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const speeds = [0.5, 1, 1.5, 2];

  // Subtitles - Removed as requested
  // const [activeSubtitle, setActiveSubtitle] = useState<number>(-1); 
  // const [subSize, setSubSize] = useState<number>(100);
  // const [subPosition, setSubPosition] = useState<number>(0);
  
  // Zoom
  const [zoom, setZoom] = useState<'contain' | 'cover' | 'fill'>('contain');
  
  // Double Tap Feedback
  const [feedback, setFeedback] = useState<{ type: 'back' | 'forward' | 'fullscreen', side: 'left' | 'right' | 'center' } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setLoading(true);
  };

  const skipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime += 85;
      setFeedback({ type: 'forward', side: 'right' });
      setTimeout(() => setFeedback(null), 500);
    }
  };

  const sources = mediaData.sources || [];
  const currentSource = sources[selectedSourceIdx];

  const handleMouseMove = () => {
    if (isLocked) return;
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isDragging && !activeMenu) setShowControls(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      handleMouseMove();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateState = () => {
      setIsPlaying(!video.paused);
      setIsMuted(video.muted);
      setVolume(video.volume);
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    video.addEventListener("play", updateState);
    video.addEventListener("pause", updateState);
    video.addEventListener("volumechange", updateState);
    video.addEventListener("timeupdate", updateState);
    video.addEventListener("loadedmetadata", updateState);

    return () => {
      video.removeEventListener("play", updateState);
      video.removeEventListener("pause", updateState);
      video.removeEventListener("volumechange", updateState);
      video.removeEventListener("timeupdate", updateState);
      video.removeEventListener("loadedmetadata", updateState);
    };
  }, []);

  useEffect(() => {
    setSelectedSourceIdx(0);
    setActiveMenu(null);
    setHlsLevels([]);
    setHlsCurrentLevel(-1);
  }, [mediaData]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || sources.length === 0) {
      setError("No video sources available.");
      setLoading(false);
      return;
    }

    const source = currentSource.url;
    const currentTime = video.currentTime;
    const isPaused = video.paused;

    setLoading(true);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const initPlayer = async () => {
      const isHlsSource = currentSource.type === 'hls' || source.includes(".m3u8") || source.includes("m3u8");
      
      if (isHlsSource) {
        const HlsClass = await loadHls();
        if (HlsClass.isSupported()) {
          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: true,
            capLevelToPlayerSize: true,
            backBufferLength: 90,
          });
          hlsRef.current = hls;

          hls.loadSource(source);
          hls.attachMedia(video);

          hls.on(HlsClass.Events.MANIFEST_PARSED, (event: any, data: any) => {
            setHlsLevels(data.levels);
            setLoading(false);
            if (currentTime > 0) {
              video.currentTime = currentTime;
              if (!isPaused) {
                const playPromise = video.play();
                if (playPromise !== undefined) {
                  playPromise.catch(() => {});
                }
              }
            }
          });

          hls.on(HlsClass.Events.ERROR, (event: any, data: any) => {
            if (data.fatal) {
              switch (data.type) {
                case HlsClass.ErrorTypes.NETWORK_ERROR:
                  console.error("Network error encountered, trying to recover...");
                  hls?.startLoad();
                  break;
                case HlsClass.ErrorTypes.MEDIA_ERROR:
                  console.error("Media error encountered, trying to recover...");
                  hls?.recoverMediaError();
                  break;
                default:
                  hls?.destroy();
                  setError("Network Error: Failed to connect to the video stream. Please check your internet connection or try another source.");
                  break;
              }
            }
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = source;
          video.addEventListener('loadedmetadata', () => {
            setLoading(false);
            if (currentTime > 0) video.currentTime = currentTime;
          });
        } else {
          setError("HLS is not supported in this browser.");
          setLoading(false);
        }
      } else {
        // Fallback for MP4, MKV, or proxy URLs
        video.src = source;
        const handleLoaded = () => {
          setLoading(false);
          if (currentTime > 0) {
            video.currentTime = currentTime;
            if (!isPaused) {
              const playPromise = video.play();
              if (playPromise !== undefined) {
                playPromise.catch(() => {});
              }
            }
          }
        };
        video.addEventListener("loadedmetadata", handleLoaded);
        video.addEventListener("error", () => setError("Network Error: Unable to load video file. This might be due to a slow connection or an invalid source."));
        
        return () => {
          video.removeEventListener("loadedmetadata", handleLoaded);
        };
      }
    };

    initPlayer();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedSourceIdx, mediaData, retryCount]);

  // Apply playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      // Don't trigger if user is typing in an input
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "ArrowRight":
        case "l":
          videoRef.current.currentTime += 10;
          break;
        case "ArrowLeft":
        case "j":
          videoRef.current.currentTime -= 10;
          break;
        case " ":
        case "k":
          e.preventDefault();
          if (videoRef.current.paused) {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {});
            }
          } else {
            videoRef.current.pause();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDownload = () => {
    if (!currentSource) return;
    startDownload(id, title, currentSource.url);
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    // Check if metadata is loaded (HAVE_METADATA is 1)
    if (videoRef.current.readyState < 1) {
      console.warn("PiP failed: Metadata not loaded yet.");
      return;
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error("PiP failed", err);
    }
  };

  const toggleFullScreen = async () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
          await (container as any).mozRequestFullScreen();
        } else if ((container as any).msRequestFullscreen) {
          await (container as any).msRequestFullscreen();
        }

        // Try to lock orientation to landscape on mobile
        if (window.screen?.orientation && (window.screen.orientation as any).lock) {
          try {
            await (window.screen.orientation as any).lock('landscape');
          } catch (e) {
            console.warn("Orientation lock failed", e);
          }
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }

        if (window.screen?.orientation && (window.screen.orientation as any).unlock) {
          try {
            (window.screen.orientation as any).unlock();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error(`Error attempting to toggle full-screen mode:`, err);
    }
  };

  const handleCast = () => {
    const video = videoRef.current as any;
    if (video && typeof video.webkitShowPlaybackTargetPicker === 'function') {
      video.webkitShowPlaybackTargetPicker();
    } else {
      console.warn("Cast not supported or not available.");
    }
  };

  const handleHlsLevelChange = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      setHlsCurrentLevel(levelIndex);
    }
    setActiveMenu(null);
  };

  const seek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const touch = e.touches[0];
    (window as any).touchStartX = touch.clientX;
    (window as any).touchStartY = touch.clientY;
    (window as any).initialVolume = videoRef.current?.volume || 1;
    (window as any).initialBrightness = brightness;
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isLocked) return;
    const touch = e.touches[0];
    const deltaY = (window as any).touchStartY - touch.clientY;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.4) {
      // Left side - Brightness
      const newBrightness = Math.min(2, Math.max(0.2, (window as any).initialBrightness + deltaY / 200));
      setBrightness(newBrightness);
      setShowBrightnessIndicator(true);
      setTimeout(() => setShowBrightnessIndicator(false), 2000);
    } else if (x > width * 0.6) {
      // Right side - Volume
      if (videoRef.current) {
        const newVolume = Math.min(1, Math.max(0, (window as any).initialVolume + deltaY / 200));
        videoRef.current.volume = newVolume;
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        setShowVolumeIndicator(true);
        setTimeout(() => setShowVolumeIndicator(false), 2000);
      }
    }
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    if (x < width * 0.4) {
      // Left 40% - Seek back
      if (videoRef.current) videoRef.current.currentTime -= 10;
      setFeedback({ type: 'back', side: 'left' });
    } else if (x > width * 0.6) {
      // Right 40% - Seek forward
      if (videoRef.current) videoRef.current.currentTime += 10;
      setFeedback({ type: 'forward', side: 'right' });
    }

    setTimeout(() => setFeedback(null), 500);
  };

  const togglePlay = () => {
    if (isLocked || !videoRef.current) return;
    if (videoRef.current.paused) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (isLocked || !videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullScreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "l":
          e.preventDefault();
          seek(10);
          break;
        case "j":
          e.preventDefault();
          seek(-10);
          break;
        case "arrowright":
          e.preventDefault();
          seek(5);
          break;
        case "arrowleft":
          e.preventDefault();
          seek(-5);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, togglePlay, toggleFullScreen, toggleMute, seek]);

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden group select-none">
      
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <PopcornLoader />
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 p-6 text-center">
          <div className="max-w-md">
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Double Tap Feedback Overlay */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute inset-y-0 z-30 flex items-center justify-center pointer-events-none ${
              feedback.side === 'left' ? 'left-0 w-[30%]' : 
              feedback.side === 'right' ? 'right-0 w-[30%]' : 
              'left-[30%] w-[40%]'
            }`}
          >
            <div className="bg-black/40 backdrop-blur-md rounded-full p-6 flex flex-col items-center gap-2">
              {feedback.type === 'back' && (
                <>
                  <div className="flex gap-1">
                    <Play className="w-6 h-6 rotate-180 fill-white" />
                    <Play className="w-6 h-6 rotate-180 fill-white" />
                  </div>
                  <span className="text-white font-bold">-10s</span>
                </>
              )}
              {feedback.type === 'forward' && (
                <>
                  <div className="flex gap-1">
                    <Play className="w-6 h-6 fill-white" />
                    <Play className="w-6 h-6 fill-white" />
                  </div>
                  <span className="text-white font-bold">+10s</span>
                </>
              )}
              {feedback.type === 'fullscreen' && (
                <>
                  <Maximize className="w-8 h-8 text-white" />
                  <span className="text-white font-bold">Fullscreen</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Volume & Brightness Indicators */}
      <AnimatePresence>
        {showVolumeIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            className="absolute top-1/2 right-12 -translate-y-1/2 z-40 flex flex-col items-center gap-4"
          >
            <div className="h-48 w-2 bg-white/10 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-white"
                style={{ height: `${volume * 100}%` }}
              />
            </div>
            <div className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10">
              {volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </div>
          </motion.div>
        )}
        {showBrightnessIndicator && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            className="absolute top-1/2 left-12 -translate-y-1/2 z-40 flex flex-col items-center gap-4"
          >
            <div className="h-48 w-2 bg-white/10 rounded-full overflow-hidden relative">
              <motion.div 
                className="absolute bottom-0 left-0 right-0 bg-white"
                style={{ height: `${(brightness / 2) * 100}%` }}
              />
            </div>
            <div className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10">
              <Sun className="w-6 h-6" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <video
        key={`${mediaData.sources[0]?.url || "no-source"}`}
        ref={videoRef}
        poster={poster}
        playsInline
        autoPlay
        className={`w-full h-full object-${zoom}`}
        style={{ filter: `brightness(${brightness})` }}
        crossOrigin="anonymous"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      >
      </video>

      {/* Center Play/Pause Button */}
      <AnimatePresence>
        {!isPlaying && !loading && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
          >
            <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-2xl border border-white/10">
              <Play className="w-10 h-10 ml-1 fill-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction Layer */}
      <div 
        className="absolute inset-0 z-10"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const width = rect.width;
          const isCenter = x > width * 0.4 && x < width * 0.6;

          if (e.detail === 1) {
            const timeout = setTimeout(() => {
              if (isCenter) {
                togglePlay();
              } else {
                setShowControls(!showControls);
              }
            }, 250);
            (e.currentTarget as any)._clickTimeout = timeout;
          } else if (e.detail === 2) {
            clearTimeout((e.currentTarget as any)._clickTimeout);
            handleDoubleClick(e);
          }
        }}
      />

      {/* Lock Button (Always visible when controls are shown, even if locked) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-50"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsLocked(!isLocked);
              }}
              className="w-12 h-12 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-colors"
            >
              {isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episode Drawer */}
      <AnimatePresence>
        {showEpisodes && seasons && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            className="absolute inset-y-0 right-0 z-40 w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Episodes</h3>
              <button onClick={() => setShowEpisodes(false)} className="text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Season Selector */}
            <div className="mb-6">
               <select 
                 value={selectedSeason}
                 onChange={(e) => onEpisodeChange?.(Number(e.target.value), 1)}
                 className="w-full bg-white/10 text-white rounded-lg p-2"
               >
                 {seasons.map((s) => (
                   <option key={s.se} value={s.se}>Season {s.se}</option>
                 ))}
               </select>
            </div>

            {/* Episode List */}
            <div className="space-y-2">
              {Array.from({ length: seasons.find(s => s.se === selectedSeason)?.maxEp || 0 }).map((_, idx) => {
                const ep = idx + 1;
                const isActive = selectedEpisode === ep;
                return (
                  <button
                    key={ep}
                    onClick={() => onEpisodeChange?.(selectedSeason || 1, ep)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      isActive 
                        ? "bg-white text-black" 
                        : "bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="font-medium">Episode {ep}</span>
                    {isActive && <span className="text-xs font-bold uppercase">Playing</span>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar (Title & Back) */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none"
          >
            <div className="flex items-center gap-4 pointer-events-auto">
              {onClose && (
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                  <ArrowLeft className="w-6 h-6 md:w-8 md:h-8" />
                </button>
              )}
              <h2 className="text-white font-bold text-lg md:text-xl drop-shadow-md line-clamp-1">{title}</h2>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLocked && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute inset-0 z-20 flex flex-col justify-end pointer-events-none"
          >
            {/* Gradient Background */}
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
            
            <div className="relative px-4 md:px-6 pb-4 md:pb-6 pointer-events-auto w-full">
              {/* Progress Bar */}
              <div className="w-full h-1.5 md:h-2 bg-white/20 rounded-full mb-6 relative group/progress transition-all">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    if (videoRef.current) videoRef.current.currentTime = time;
                    setCurrentTime(time);
                  }}
                  onMouseDown={() => setIsDragging(true)}
                  onMouseUp={() => setIsDragging(false)}
                  onTouchStart={() => setIsDragging(true)}
                  onTouchEnd={() => setIsDragging(false)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute inset-y-0 left-0 bg-red-600 rounded-full pointer-events-none" 
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} 
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-lg pointer-events-none transition-transform group-hover/progress:scale-125" 
                  style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 8px)` }} 
                />
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-8">
                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }} className="text-white/80 hover:text-white transition-colors hidden md:block">
                    <div className="relative flex flex-col items-center">
                      <Play className="w-5 h-5 rotate-180 fill-current" />
                      <span className="text-[8px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">10</span>
                    </div>
                  </button>

                  <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
                    {isPlaying ? <Pause className="w-8 h-8 md:w-10 md:h-10 fill-white" /> : <Play className="w-8 h-8 md:w-10 md:h-10 fill-white ml-1" />}
                  </button>

                  <button onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }} className="text-white/80 hover:text-white transition-colors hidden md:block">
                    <div className="relative flex flex-col items-center">
                      <Play className="w-5 h-5 fill-current" />
                      <span className="text-[8px] font-bold absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white">10</span>
                    </div>
                  </button>

                  {currentTime > 0 && currentTime < 300 && (
                    <button 
                      onClick={skipIntro}
                      className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-all border border-white/10"
                    >
                      Skip Intro
                    </button>
                  )}
                  
                  <div className="flex items-center gap-3 group/volume relative">
                    <button onClick={toggleMute} className="text-white hover:text-gray-300 transition-colors">
                      {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                    </button>
                    <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-300 flex items-center">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          setVolume(v);
                          if (videoRef.current) {
                            videoRef.current.volume = v;
                            videoRef.current.muted = v === 0;
                            setIsMuted(v === 0);
                          }
                        }}
                        className="w-24 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
                      />
                    </div>
                  </div>
                  
                  <span className="text-white text-xs md:text-sm font-medium opacity-90 tracking-wide">
                    {formatTime(currentTime)} <span className="opacity-50 mx-1">/</span> {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-4 md:gap-6">
                  {seasons && (
                    <button onClick={() => setShowEpisodes(!showEpisodes)} className="text-white hover:text-gray-300 transition-colors flex items-center gap-2" title="Episodes">
                      <MonitorPlay className="w-5 h-5 md:w-6 md:h-6" />
                      <span className="hidden lg:block text-sm font-medium">Episodes</span>
                    </button>
                  )}
                  
                  {/* PiP Button */}
                  {document.pictureInPictureEnabled && (
                    <button
                      onClick={togglePiP}
                      className="text-white hover:text-gray-300 transition-colors"
                      title="Picture in Picture"
                    >
                      <MonitorPlay className="w-5 h-5 md:w-6 md:h-6" />
                    </button>
                  )}

                  {/* Cast Button */}
                  <button
                    onClick={handleCast}
                    className="text-white hover:text-gray-300 transition-colors"
                    title="Cast"
                  >
                    <Cast className="w-5 h-5 md:w-6 md:h-6" />
                  </button>

                  {/* Full Screen Button */}
                  <button
                    onClick={toggleFullScreen}
                    className="text-white hover:text-gray-300 transition-colors"
                    title="Full Screen"
                  >
                    <Maximize className="w-6 h-6 md:w-7 md:h-7" />
                  </button>

                  {/* Settings Menu */}
                  <div className="relative">
                    <button
                      onClick={() => toggleMenu("settings")}
                      className="text-white hover:text-gray-300 transition-colors"
                      title="Settings"
                    >
                      <Settings className="w-6 h-6 md:w-7 md:h-7" />
                    </button>

                    <AnimatePresence>
                      {activeMenu === "settings" && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className="absolute bottom-full right-0 mb-4 w-72 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 space-y-4"
                        >
                          {/* Speed */}
                          <div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                              <Gauge className="w-3 h-3" /> Playback Speed
                            </div>
                            <div className="grid grid-cols-4 gap-1">
                              {speeds.map((speed) => (
                                <button
                                  key={speed}
                                  onClick={() => setPlaybackSpeed(speed)}
                                  className={`py-2 text-xs rounded-lg transition-all ${
                                    playbackSpeed === speed 
                                      ? "bg-white text-black font-bold" 
                                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quality */}
                          <div className="pt-4 border-t border-white/10">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                              <Settings className="w-3 h-3" /> Video Quality
                            </div>
                            <div className="space-y-1 max-h-40 overflow-y-auto no-scrollbar">
                              {hlsLevels.length > 0 ? (
                                <>
                                  <button
                                    onClick={() => handleHlsLevelChange(-1)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                                      hlsCurrentLevel === -1 ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:bg-white/5"
                                    }`}
                                  >
                                    <span>Auto (Adaptive)</span>
                                    {hlsCurrentLevel === -1 && <Check className="w-4 h-4" />}
                                  </button>
                                  {hlsLevels.map((level, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => handleHlsLevelChange(idx)}
                                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                                        hlsCurrentLevel === idx ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:bg-white/5"
                                      }`}
                                    >
                                      <span>{level.height}p</span>
                                      {hlsCurrentLevel === idx && <Check className="w-4 h-4" />}
                                    </button>
                                  ))}
                                </>
                              ) : (
                                sources.map((source, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedSourceIdx(idx)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all ${
                                      selectedSourceIdx === idx ? "bg-white/10 text-white font-bold" : "text-gray-400 hover:bg-white/5"
                                    }`}
                                  >
                                    <span>{source.quality}</span>
                                    {selectedSourceIdx === idx && <Check className="w-4 h-4" />}
                                  </button>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Zoom Mode */}
                          <div className="pt-4 border-t border-white/10">
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                              <Maximize className="w-3 h-3" /> Aspect Ratio
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {(['contain', 'cover', 'fill'] as const).map((mode) => (
                                <button
                                  key={mode}
                                  onClick={() => setZoom(mode)}
                                  className={`py-2 text-xs rounded-lg transition-all capitalize ${
                                    zoom === mode 
                                      ? "bg-white/10 text-white font-bold" 
                                      : "text-gray-400 hover:bg-white/5"
                                  }`}
                                >
                                  {mode}
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Download Button */}
                  {!isOffline && (
                    <button
                      onClick={handleDownload}
                      className="text-white hover:text-gray-300 transition-colors"
                      title="Download Video"
                    >
                      <Download className="w-6 h-6 md:w-7 md:h-7" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Overlay */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-black/90 p-8 flex flex-col justify-center"
          >
            <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-white">
              <X className="w-8 h-8" />
            </button>
            <h2 className="text-4xl font-bold mb-4">{title}</h2>
            <p className="text-gray-300 text-lg">{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
