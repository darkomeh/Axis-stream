import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, Check, Loader2, Info, ArrowLeft, Tv
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type Hls from "hls.js";

interface LiveTVPlayerProps {
  url: string;
  name: string;
  logo: string;
  description: string;
  currentProgram?: string;
  onBack?: () => void;
}

const loadHls = () => import("hls.js").then((m) => m.default);

export default function LiveTVPlayer({ 
  url, 
  name, 
  logo, 
  description, 
  currentProgram,
  onBack 
}: LiveTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // HLS specific state
  const [levels, setLevels] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is Auto

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkErrorRetryCountRef = useRef(0);

  // Restart control hiding timer
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showQualityMenu) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Keep controls visible when hovering over the control bar
  const handleMouseMove = () => {
    resetControlsTimeout();
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when writing in inputs
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "arrowup":
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case "arrowdown":
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying, isMuted, volume]);

  // Handle M3U8 source setup and HLS loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);
    setLevels([]);
    setCurrentLevel(-1);
    networkErrorRetryCountRef.current = 0;

    // Reset current player instances
    try {
      video.pause();
    } catch (e) {}
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let isHlsSetup = false;

    const setupPlayer = async () => {
      try {
        const HlsClass = await loadHls();
        
        if (HlsClass.isSupported()) {
          const hls = new HlsClass({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
            maxBufferLength: 15,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 6,
            capLevelToPlayerSize: true,
            startLevel: -1,
            fragLoadingTimeOut: 10000,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 500,
            manifestLoadingMaxRetry: 6,
            manifestLoadingRetryDelay: 500,
            levelLoadingMaxRetry: 6,
            levelLoadingRetryDelay: 500,
            appendErrorMaxRetry: 6,
            abrEwmaDefaultEstimate: 500000,
          });

          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);

          hls.on(HlsClass.Events.MANIFEST_PARSED, (_, data) => {
            setLevels(data.levels || []);
            setIsLoading(false);
            networkErrorRetryCountRef.current = 0;
            
            // Try to autoplay
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => {
                // Autoplay blocked
                setIsPlaying(false);
              });
          });

          hls.on(HlsClass.Events.FRAG_LOADED, () => {
            networkErrorRetryCountRef.current = 0;
          });

          hls.on(HlsClass.Events.ERROR, (_, data) => {
            if (data.fatal) {
              switch (data.type) {
                case HlsClass.ErrorTypes.NETWORK_ERROR:
                  console.warn("HLS fatal network error, trying to recover...", data);
                  if (networkErrorRetryCountRef.current < 6) {
                    networkErrorRetryCountRef.current += 1;
                    const delay = Math.min(1000 * networkErrorRetryCountRef.current, 5000);
                    console.log(`Retrying HLS load in ${delay}ms... (Attempt ${networkErrorRetryCountRef.current}/6)`);
                    setTimeout(() => {
                      hls.startLoad();
                    }, delay);
                  } else {
                    console.error("HLS fatal network error, retry limit reached.");
                    setHasError(true);
                    setIsLoading(false);
                    hls.destroy();
                  }
                  break;
                case HlsClass.ErrorTypes.MEDIA_ERROR:
                  console.warn("HLS fatal media error, trying to recover...", data);
                  hls.recoverMediaError();
                  break;
                default:
                  console.error("HLS fatal error, unable to recover.", data);
                  setHasError(true);
                  setIsLoading(false);
                  hls.destroy();
                  break;
              }
            }
          });

          isHlsSetup = true;
        }
      } catch (err) {
        console.error("Failed to load hls.js dynamically, falling back to native.", err);
      }

      // Native fallback (e.g. Safari / iOS)
      if (!isHlsSetup) {
        if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.addEventListener("loadedmetadata", () => {
            setIsLoading(false);
            video.play()
              .then(() => setIsPlaying(true))
              .catch(() => setIsPlaying(false));
          });
          video.addEventListener("error", () => {
            setHasError(true);
            setIsLoading(false);
          });
        } else {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    setupPlayer();

    // Clean up
    return () => {
      try {
        video.pause();
      } catch (e) {}
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url]);

  // Sync volume state to video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted || volume === 0;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || isLoading || hasError) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Playback failed:", err);
          } else {
            console.warn("Playback play() request was interrupted by a new load request (AbortError).");
          }
        });
    }
    resetControlsTimeout();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (volume === 0) {
        setVolume(prevVolume > 0 ? prevVolume : 0.5);
      }
    } else {
      setPrevVolume(volume);
      setIsMuted(true);
    }
    resetControlsTimeout();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (newVol > 0) {
      setIsMuted(false);
    }
    resetControlsTimeout();
  };

  const adjustVolume = (amount: number) => {
    setVolume((prev) => {
      const next = Math.max(0, Math.min(1, prev + amount));
      if (next > 0) setIsMuted(false);
      return next;
    });
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Fullscreen request failed:", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Fullscreen exit failed:", err));
    }
    resetControlsTimeout();
  };

  // Sync fullscreen state when changed externally (like Esc key)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    
    hlsRef.current.currentLevel = levelIndex;
    setCurrentLevel(levelIndex);
    setShowQualityMenu(false);
    resetControlsTimeout();
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video || isLoading || hasError) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Picture-in-Picture failed:", err);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 group shadow-[0_24px_50px_rgba(0,0,0,0.8)]"
      id="live-tv-player"
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        preload="auto"
        onClick={togglePlay}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
      />

      {/* Dynamic Overlay & Buffering State */}
      <AnimatePresence>
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20 pointer-events-none">
            <Loader2 className="w-12 h-12 text-brand animate-spin" />
            <span className="text-fluid-sm font-semibold tracking-wide text-white/80 animate-pulse">
              Buffering Live Feed...
            </span>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-20 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-2">
              <Tv className="w-8 h-8" />
            </div>
            <h3 className="text-fluid-xl font-bold text-white">Stream Currently Offline</h3>
            <p className="text-fluid-sm text-white/50 max-w-sm">
              We encountered a network error or this live feed is temporarily down. Please try again or switch channels.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-2 px-6 py-2.5 bg-brand text-white rounded-full font-bold hover:bg-brand-hover transition-all text-fluid-sm shadow-[0_0_20px_rgba(255,59,48,0.3)]"
            >
              Retry Connection
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/75 flex flex-col justify-between p-6 z-10"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onBack && (
                  <button 
                    onClick={onBack}
                    className="p-2.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white transition-colors cursor-pointer"
                    title="Back to Grid"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-brand text-white text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </span>
                    <h2 className="text-fluid-base font-extrabold text-white tracking-tight leading-none">
                      {name}
                    </h2>
                  </div>
                  {currentProgram && (
                    <p className="text-fluid-xs text-white/60 font-semibold mt-1">
                      Playing: {currentProgram}
                    </p>
                  )}
                </div>
              </div>

              {/* Channel Brand Circle */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand/40 to-white/10 border border-white/20 flex items-center justify-center font-bold text-white text-xs tracking-wider shadow-lg">
                {logo}
              </div>
            </div>

            {/* Centered Large Play Button (For mobile or easy tap) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-16 h-16 rounded-full bg-brand/90 hover:bg-brand border border-white/20 text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,59,48,0.4)] transition-colors pointer-events-auto cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                )}
              </motion.button>
            </div>

            {/* Bottom Bar Controls */}
            <div className="space-y-4">
              {/* Timeline (Disabled seeking for Live stream, just visual) */}
              <div className="relative w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-full bg-brand origin-left scale-x-100" />
              </div>

              <div className="flex items-center justify-between">
                {/* Left controls */}
                <div className="flex items-center gap-4">
                  <button 
                    onClick={togglePlay}
                    className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>

                  {/* Volume Controls */}
                  <div className="flex items-center gap-2 group/volume">
                    <button 
                      onClick={toggleMute}
                      className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input 
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand overflow-hidden"
                    />
                  </div>

                  <span className="text-[11px] font-bold text-white/50 tracking-wider">
                    LIVE STREAM
                  </span>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-4 relative">
                  {/* PiP Button */}
                  <button 
                    onClick={togglePiP}
                    className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                    title="Picture in Picture"
                  >
                    <Tv className="w-5 h-5" />
                  </button>

                  {/* Quality Settings Button */}
                  {levels.length > 0 && (
                    <div>
                      <button 
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className={`text-white/80 hover:text-white p-1 transition-colors cursor-pointer ${showQualityMenu ? "text-brand" : ""}`}
                        title="Quality"
                      >
                        <Settings className="w-5 h-5" />
                      </button>

                      {/* Quality selection dropdown */}
                      <AnimatePresence>
                        {showQualityMenu && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-10 right-0 glass-dropdown z-30 p-2 min-w-32 rounded-xl border border-white/10"
                          >
                            <p className="text-[10px] font-black tracking-widest text-white/40 px-3 py-1 uppercase">
                              QUALITY
                            </p>
                            <button
                              onClick={() => handleQualityChange(-1)}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-fluid-xs font-semibold hover:bg-white/5 transition-colors text-left ${currentLevel === -1 ? "text-brand bg-brand/10" : "text-white/70"}`}
                            >
                              Auto
                              {currentLevel === -1 && <Check className="w-3 h-3" />}
                            </button>
                            {levels.map((lvl, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQualityChange(idx)}
                                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-fluid-xs font-semibold hover:bg-white/5 transition-colors text-left ${currentLevel === idx ? "text-brand bg-brand/10" : "text-white/70"}`}
                              >
                                {lvl.height ? `${lvl.height}p` : `Stream ${idx + 1}`}
                                {currentLevel === idx && <Check className="w-3 h-3" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Fullscreen Button */}
                  <button 
                    onClick={toggleFullscreen}
                    className="text-white/80 hover:text-white p-1 transition-colors cursor-pointer"
                  >
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
