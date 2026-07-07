import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, MoreHorizontal, Clock, PlayCircle, PictureInPicture, Maximize, Pause, Circle, Radio, Tv, Volume2, VolumeX, Play, Loader2, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Hls from "hls.js";
import { LIVE_CHANNELS } from "../data/liveChannels";

export default function LiveTVPlayerScreen() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const { showToast } = useToast(); // Start unmuted if possible, but browsers might block. Let's start unmuted.
  const [isBuffering, setIsBuffering] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const channel = LIVE_CHANNELS.find(c => c.id === channelId) || LIVE_CHANNELS[0];
  
  // Find related channels (same category)
  const relatedChannels = LIVE_CHANNELS.filter(c => c.category === channel.category && c.id !== channel.id);
  const moreChannels = LIVE_CHANNELS.filter(c => c.category !== channel.category);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !channel.url) return;

    let active = true;
    setIsBuffering(true);
    setHasError(false);

    const playVideo = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            if (active) {
              setIsPlaying(true);
            }
          })
          .catch(e => {
            console.log("Initial autoplay prevented or interrupted:", e.message || e);
            if (!active) return;
            // Try playing muted as a fallback
            video.muted = true;
            setIsMuted(true);
            const replayPromise = video.play();
            if (replayPromise !== undefined) {
              replayPromise
                .then(() => {
                  if (active) {
                    setIsPlaying(true);
                  }
                })
                .catch(err => {
                  console.log("Muted autoplay also failed/interrupted:", err.message || err);
                  if (active) {
                    setIsPlaying(false);
                  }
                });
            }
          });
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        enableWorker: true,
      });

      hls.loadSource(channel.url);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (active) {
          playVideo();
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("fatal network error encountered, try to recover");
              if (active) {
                  setErrorMessage("Network error connecting to stream. Trying to recover...");
                  hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("fatal media error encountered, try to recover");
              if (active) hls.recoverMediaError();
              break;
            default:
              if (active) {
                  setHasError(true);
                  setErrorMessage("The broadcast has been interrupted. Please try another channel.");
                  setIsBuffering(false);
                  hls.destroy();
              }
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        active = false;
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // For Safari
      video.src = channel.url;
      const onLoadedMetadata = () => {
        if (active) {
          playVideo();
        }
      };
      
      const onError = () => {
          if (active) {
              setHasError(true);
              setErrorMessage("The broadcast has been interrupted. Please try another channel.");
              setIsBuffering(false);
          }
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);

      return () => {
        active = false;
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
      };
    }
  }, [channel.url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
        setIsBuffering(false);
        setHasError(false);
    };
    const onError = () => {
        setIsBuffering(false);
        setHasError(true);
    };

    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onError);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch(e => {
              console.log("Toggle play interrupted or prevented:", e.message || e);
            });
        }
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(video.muted);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden pb-12">
      {/* Top Navigation */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#080808]/60 backdrop-blur-[40px] border-b border-white/[0.08]">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="text-white hover:text-white/80 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <span className="text-[17px] font-semibold tracking-tight">{channel.name}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#FF453A]/30 bg-[#FF453A]/10 shadow-[0_0_10px_rgba(255,69,58,0.2)]">
          <Radio className="w-3.5 h-3.5 text-[#FF453A] animate-pulse" />
          <span className="text-[10px] font-bold text-[#FF453A] tracking-wider uppercase">LIVE</span>
        </div>
      </header>

      {/* Video Player Area */}
      <div className="w-full aspect-video bg-[#0A0A0A] relative overflow-hidden flex items-center justify-center shadow-[0_15px_40px_rgba(255,69,58,0.08)]">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          muted={isMuted}
          onClick={togglePlay}
        />

        {/* Buffering Overlay */}
        <AnimatePresence>
          {isBuffering && !hasError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none z-10"
            >
              <Loader2 className="w-12 h-12 text-[#FF453A] animate-spin mb-4" />
              <p className="text-white font-medium text-sm tracking-wide">Connecting to stream...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Overlay */}
        <AnimatePresence>
          {hasError && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none z-20"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <WifiOff className="w-8 h-8 text-[#FF453A]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2 tracking-tight">Stream Unavailable</h3>
              <p className="text-white/60 text-sm max-w-xs text-center">{errorMessage || "The broadcast has been interrupted."}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Abstract broadcast visual placeholder (fallback) */}
        {!channel.url && (
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF453A]/10 to-black opacity-80" />
        )}
        
        {/* Wavy line simulation overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
           <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-[#FF453A] stroke-current stroke-[0.2]" fill="none">
             <path d="M0,10 C20,20 30,0 50,10 C70,20 80,0 100,10" />
           </svg>
        </div>

        {/* Player Bottom Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#080808] to-transparent flex flex-col justify-end gap-3 pointer-events-none">
          <div className="flex items-center justify-between w-full pointer-events-auto">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF453A] shadow-[0_0_8px_rgba(255,69,58,0.8)]" />
              <span className="text-xs font-bold text-[#F5F5F7] tracking-widest uppercase">LIVE</span>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={toggleMute} className="text-white/90 hover:text-white transition-colors cursor-pointer">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button onClick={togglePlay} className="text-white/90 hover:text-white transition-colors cursor-pointer">
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <PictureInPicture onClick={() => videoRef.current?.requestPictureInPicture()} className="w-5 h-5 text-white/90 hover:text-white transition-colors cursor-pointer" />
              <Maximize onClick={() => { if(videoRef.current?.requestFullscreen) videoRef.current.requestFullscreen(); else if((videoRef.current as any)?.webkitRequestFullscreen) (videoRef.current as any).webkitRequestFullscreen(); }} className="w-5 h-5 text-white/90 hover:text-white transition-colors cursor-pointer" />
            </div>
          </div>
          {/* Progress Line */}
          <div className="w-full h-1 bg-white/[0.15] rounded-full relative pointer-events-auto cursor-pointer">
             <div className="absolute left-0 top-0 bottom-0 w-3/4 bg-[#FF453A] rounded-full shadow-[0_0_10px_rgba(255,69,58,0.6)]" />
             <div className="absolute left-3/4 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#FF453A] rounded-full shadow-[0_0_12px_rgba(255,69,58,1)]" />
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-8">
        {/* Quick Actions */}
        <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {[
            { icon: Radio, label: "Back to Live", action: () => {
              if (hlsRef.current) {
                const video = videoRef.current;
                if (video) {
                  // Jump to live edge
                  video.currentTime = video.duration || video.currentTime;
                }
              }
            } },
            { icon: Heart, label: "Favorite", action: () => showToast("Added to favorites!", "success") },
            { icon: Circle, label: "Record", action: () => showToast("Recording started.", "success") },
            { icon: Share2, label: "Share", action: () => {
              if (navigator.share) {
                navigator.share({ title: channel.name, text: channel.description, url: window.location.href })
                  .catch(e => {
                    console.log("Share flow completed or cancelled:", e.message || e);
                  });
              } else {
                navigator.clipboard.writeText(window.location.href);
                showToast("Link copied to clipboard!", "success");
              }
            } },
            { icon: MoreHorizontal, label: "More", action: () => {} },
          ].map((action, i) => (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={action.action}
              key={i} 
              className="flex flex-col items-center justify-center gap-2 w-[85px] h-[95px] shrink-0 rounded-[24px] bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.08] hover:bg-white/[0.08] transition-colors shadow-lg"
            >
              <action.icon className="w-6 h-6 text-white/80" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-[#F5F5F7]/80 text-center px-1">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Now Playing */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold tracking-tight">Now Playing</h2>
          <div className="bg-white/[0.04] backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-6 space-y-4 shadow-lg">
            <div className="inline-flex items-center gap-1.5 bg-[#FF453A] text-white text-[10px] font-black tracking-widest px-2.5 py-1 rounded-[6px] shadow-[0_2px_10px_rgba(255,69,58,0.4)]">
              LIVE
            </div>
            <div className="space-y-1.5">
              <h3 className="text-[22px] font-bold tracking-tight text-[#F5F5F7]">{channel.currentProgram}</h3>
              <p className="text-[13px] text-[#F5F5F7]/50 font-medium">10:00 AM - 12:00 PM</p>
            </div>
            <p className="text-[14px] text-white/70 font-medium leading-relaxed">
              {channel.description}
            </p>
            <div className="pt-3">
              <div className="w-full h-1 bg-white/[0.1] rounded-full relative mb-2 overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[70%] bg-[#FF453A] rounded-full" />
              </div>
              <div className="flex justify-end text-[12px] text-[#F5F5F7]/50 font-medium">45:23</div>
            </div>
          </div>
        </div>

        {/* Next Up */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold tracking-tight">Next</h2>
          <div className="bg-white/[0.04] backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-5 flex gap-5 items-center shadow-lg">
            <div className="w-[72px] h-[72px] rounded-[20px] bg-white/[0.06] flex items-center justify-center shrink-0 border border-white/[0.08]">
              <Clock className="w-7 h-7 text-white/50" strokeWidth={1.5} />
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="font-bold text-[16px] text-[#F5F5F7] tracking-tight">Up Next on {channel.name}</h4>
              <p className="text-[12px] text-[#F5F5F7]/50 font-medium">12:00 PM - 02:00 PM</p>
              <p className="text-[13px] text-white/70 mt-1 line-clamp-2 font-medium">
                Stay tuned for more premium entertainment coming right after this broadcast.
              </p>
            </div>
          </div>
        </div>

        {/* Related Channels */}
        {relatedChannels.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold tracking-tight">Related Channels</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-4">
              {relatedChannels.map((c, i) => (
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  key={`rel-${c.id}`}
                  onClick={() => navigate(`/live/${c.id}`)}
                  className="w-[140px] h-[105px] shrink-0 rounded-[16px] bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.08] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors relative shadow-md group overflow-hidden"
                >
                  <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="text-[12px] font-bold text-[#F5F5F7] truncate w-full text-center px-2 absolute bottom-2 z-10">{c.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* About Channel */}
        <div className="space-y-4">
          <h2 className="text-[20px] font-bold tracking-tight">About Channel</h2>
          <div className="bg-white/[0.04] backdrop-blur-[30px] border border-white/[0.08] rounded-[30px] p-6 flex gap-5 items-center shadow-lg">
            <div className="w-[80px] h-[80px] rounded-[16px] bg-[#0A0A0A] flex items-center justify-center shrink-0 border border-white/[0.1] shadow-[0_10px_20px_rgba(255,69,58,0.3)] overflow-hidden">
              <img src={channel.image} alt={channel.name} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-1.5">
              <h4 className="font-bold text-[18px] tracking-tight text-[#F5F5F7]">{channel.name}</h4>
              <p className="text-[13px] text-[#F5F5F7]/50 font-medium">{channel.category}</p>
              <p className="text-[13px] text-white/70 mt-2 font-medium">
                Your go-to channel for the best shows, movies and live programs.
              </p>
            </div>
          </div>
        </div>

        {/* More From Live TV */}
        {moreChannels.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold tracking-tight">More From Live TV</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-4">
              {moreChannels.slice(0, 8).map((c, i) => (
                <motion.div
                  whileTap={{ scale: 0.95 }}
                  key={`more-${c.id}`}
                  onClick={() => navigate(`/live/${c.id}`)}
                  className="w-[140px] h-[105px] shrink-0 rounded-[16px] bg-white/[0.04] backdrop-blur-[20px] border border-white/[0.08] flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors relative shadow-md group overflow-hidden"
                >
                  <img src={c.image} alt={c.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="text-[12px] font-bold text-[#F5F5F7] truncate w-full text-center px-2 absolute bottom-2 z-10">{c.name}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
