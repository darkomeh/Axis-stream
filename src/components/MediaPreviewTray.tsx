import React, { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, Play, Download, Plus, Check, Star, 
  Info, Volume2, VolumeX, Share2, Users,
  ChevronDown, MessageCircle, MoreVertical, MoreHorizontal, Film
} from "lucide-react";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaItem, MediaData } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { MovieImage } from "./MovieImage";
import { SmartActorImage } from "./SmartActorImage";
import { useNavigate } from "react-router-dom";
import SignInPromptPopup from "./SignInPromptPopup";
import Tray from "./Tray";

export default function MediaPreviewTray() {
  const { previewId, triggerSource, closePreview, openPreview } = useMediaPreview();
  const { user, addToWatchlist, removeFromWatchlist, isInWatchlist, preferences } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDownloadTrayOpen, setIsDownloadTrayOpen] = useState(false);
  const [playData, setPlayData] = useState<MediaData | null>(null);
  const [sourceSizes, setSourceSizes] = useState<Record<string, string>>({});
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const fetchSourceSize = async (url: string) => {
    if (sourceSizes[url]) return;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      if (size) {
        const bytes = parseInt(size, 10);
        const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
        const mb = (bytes / (1024 * 1024)).toFixed(0);
        const formattedSize = bytes > 1024 * 1024 * 1024 ? `${gb} GB` : `${mb} MB`;
        setSourceSizes(prev => ({ ...prev, [url]: formattedSize }));
      }
    } catch (e) {
      console.warn("Could not fetch size for source", url);
    }
  };

  useEffect(() => {
    if (playData?.sources && isDownloadTrayOpen) {
      playData.sources.forEach(source => {
        const url = source.downloadUrl || source.url;
        fetchSourceSize(url);
      });
    }
  }, [playData, isDownloadTrayOpen]);

  useEffect(() => {
    if (!previewId) {
      setDetails(null);
      setRecommendations([]);
      setPlayData(null);
      setSourceSizes({});
      return;
    }

    const loadPreviewData = async () => {
      setLoading(true);
      try {
        const [itemDetails, itemRecs] = await Promise.all([
          movieService.getDetails(previewId),
          movieService.getRecommendations(previewId).catch(() => [])
        ]);
        setDetails(itemDetails);
        setRecommendations(itemRecs);

        // Preload play data for download options
        const media = await movieService.getPlay(previewId, itemDetails.type === 'Series' ? 1 : 0, itemDetails.type === 'Series' ? 1 : 0);
        setPlayData(media);
      } catch (err) {
        console.error("Failed to load preview:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPreviewData();
  }, [previewId]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    closePreview();
  };

  const handlePlay = () => {
    if (!user) {
      setIsPromptOpen(true);
      return;
    }
    if (!details) return;
    const slug = details.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    handleClose();
    navigate(`/watch/${details.id}/${slug}`);
  };

  const toggleWatchlist = () => {
    if (!details || !user) {
      setIsPromptOpen(true);
      return;
    }
    if (isInWatchlist(details.id)) {
      removeFromWatchlist(details.id);
      showToast("Removed from My List", "info");
    } else {
      addToWatchlist({
        id: details.id,
        title: details.title,
        poster: details.poster,
        type: details.type,
        year: details.year,
        rating: details.rating
      });
      showToast("Added to My List", "success");
    }
  };

  const handleDownload = (url: string) => {
    if (!details) return;
    const isSeries = details.type === 'Series';
    // For series, try to get current selected from state or just default to 1-1
    const dlTitle = isSeries
      ? `${details.title} S1 E1` 
      : details.title;
    const cleanTitle = dlTitle.replace(/[^a-zA-Z0-9 -]/g, '');

    const fileName = `[${cleanTitle}] [Axis TV].mp4`;
    const finalUrl = url.includes('download=1') ? url : (url.includes('?') ? `${url}&download=1` : `${url}?download=1`);
    
    // Direct browser download prompt via <a> tag
    const a = document.createElement("a");
    a.href = finalUrl;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    showToast(`Download started: ${cleanTitle}`, "success");
    setIsDownloadTrayOpen(false);
  };

  const autoDownload = () => {
    if (!user) {
      setIsPromptOpen(true);
      return;
    }
    if (!details || !details.sources || details.sources.length === 0) {
      showToast("No download sources available", "error");
      return;
    }
    // Try to find the best MP4 source (usually the first one)
    const bestSource = details.sources.find(s => (s.downloadType || s.type) !== 'hls') || details.sources[0];
    handleDownload(bestSource.downloadUrl || bestSource.url);
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const isContinueWatching = triggerSource === 'continue-watching';
  const isTrailerSuppressed = !preferences.showTrailers || (isMobile && !user); // Auto-suppress for guests on mobile to save data
  const trailerUrl = details?.trailerUrl || 
                     (typeof details?.trailer === 'object' ? (details.trailer?.videoAddress?.url || (details.trailer as any)?.url) : details?.trailer) || 
                     (details as any)?.trailer_url;

  // Derive slideshow images
  const slideImages = useMemo(() => {
    if (!details) return [];
    let imgs = [...(details.images || [])];
    if (details.cast) {
      const castAvatars = (Array.isArray(details.cast) ? details.cast : []).map(c => c.avatarUrl || c.avatar).filter(url => url && url.startsWith('http'));
      imgs = [...imgs, ...castAvatars];
    }
    if (imgs.length === 0) {
       imgs = [details.background || details.poster || ""];
    }
    return imgs.filter(Boolean) as string[];
  }, [details]);

  useEffect(() => {
    if (details && (!trailerUrl || isContinueWatching) && slideImages.length > 1) {
      const interval = setInterval(() => {
        setSlideIndex(prev => (prev + 1) % slideImages.length);
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [details, trailerUrl, isContinueWatching, slideImages.length]);

  // Ambient Backlighting Logic
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    
    if (isMobile) return;

    const renderFrame = () => {
      if (videoRef.current && canvasRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (ctx) {
          // Low resolution draw for massive performance gain on the blur
          canvasRef.current.width = 120;
          canvasRef.current.height = 68;
          ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
      timeoutId = setTimeout(renderFrame, 100);
    };
    if (trailerUrl && !isTrailerSuppressed) {
      renderFrame();
    }
    return () => clearTimeout(timeoutId);
  }, [trailerUrl, isTrailerSuppressed]);

  const isTrailerEmbed = trailerUrl?.includes('youtube.com') || trailerUrl?.includes('youtu.be') || trailerUrl?.includes('vimeo.com') || trailerUrl?.includes('/embed/');

  // Autoplay Unmute Logic Callback
  const handleCanPlay = () => {
    if (videoRef.current) {
      const promise = videoRef.current.play();
      if (promise !== undefined) {
        promise.catch(err => {
          if (err.name === 'NotAllowedError') {
            // Autoplay blocked without interaction; fallback to muted
            setIsMuted(true);
            if (videoRef.current) {
               videoRef.current.muted = true;
               videoRef.current.play().catch(() => {});
            }
          }
        });
      }
    }
  };

  return (
    <AnimatePresence>
      {previewId && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-8">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl"
          />

          {/* Modal Content */}
          <motion.div
            id="media-preview-modal"
            initial={{ y: "100%", opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] bg-[#0c0c0c] sm:rounded-3xl overflow-y-auto no-scrollbar shadow-2xl border-t sm:border border-white/5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Trailer/Hero Section */}
            <div className="relative aspect-video w-full bg-black overflow-hidden group">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : trailerUrl ? (
                <>
                  <canvas 
                    ref={canvasRef} 
                    className="absolute inset-x-0 bottom-0 top-1/2 w-full h-[150%] object-cover blur-[80px] opacity-70 scale-125 z-0 saturate-200 pointer-events-none origin-bottom mix-blend-screen"
                    aria-hidden="true"
                  />
                  {isTrailerEmbed ? (
                    <iframe
                      src={trailerUrl.includes('?') ? `${trailerUrl}&autoplay=${isTrailerSuppressed ? 0 : 1}&mute=1` : `${trailerUrl}?autoplay=${isTrailerSuppressed ? 0 : 1}&mute=1`}
                      className="w-full h-full border-none relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black"
                      allow="autoplay; fullscreen"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={trailerUrl?.includes('youtube.com') || trailerUrl?.includes('youtu.be') ? undefined : trailerUrl}
                      autoPlay={Boolean(trailerUrl) && !isTrailerSuppressed}
                      muted={isMuted}
                      loop={false}
                      playsInline
                      preload="metadata"
                      onCanPlay={handleCanPlay}
                      className="w-full h-full object-cover relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black"
                      onEnded={() => setTrailerEnded(true)}
                      onError={(e) => {
                        console.error("Trailer playback error", e);
                        setTrailerEnded(true);
                      }}
                    />
                  )}
                  {isTrailerSuppressed && !trailerEnded && !isTrailerEmbed && user && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           if (videoRef.current) {
                             videoRef.current.muted = false;
                             setIsMuted(false);
                             videoRef.current.play();
                           }
                         }}
                         className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto"
                       >
                         <Play className="w-8 h-8 fill-current ml-1" />
                       </button>
                       <p className="mt-4 text-xs font-black uppercase tracking-widest text-white/80">Play Trailer</p>
                    </div>
                  )}
                  {!isTrailerEmbed && !trailerEnded && (
                    <button
                      onClick={() => setIsMuted(prev => !prev)}
                      className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                    </button>
                  )}
                  {!isTrailerEmbed && trailerEnded && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-30">
                      <button 
                         onClick={() => { setTrailerEnded(false); videoRef.current?.play(); }} 
                         className="flex items-center gap-2 text-white font-black uppercase tracking-widest text-lg hover:text-brand transition-colors"
                      >
                       <Play className="w-5 h-5"/> Replay
                      </button>
                      <button 
                         onClick={handlePlay}
                         className="flex items-center gap-2 text-black bg-brand px-6 py-2 rounded-full font-black uppercase tracking-widest text-lg"
                      >
                       Watch Now
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative w-full h-full">
                  {!user && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md text-center p-6">
                      <h3 className="text-xl font-black italic uppercase tracking-tighter mb-2">Member Only Content</h3>
                      <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest max-w-[240px]">This item has restricted access. Sign in to see more or stream.</p>
                      <button 
                        onClick={() => { handleClose(); navigate('/profile'); }}
                        className="mt-4 px-6 py-2 bg-brand text-white rounded-full font-black uppercase tracking-widest text-[10px]"
                      >
                        Sign In
                      </button>
                    </div>
                  )}
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={slideIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 w-full h-full"
                    >
                      <MovieImage 
                        src={slideImages[slideIndex] || details?.background || details?.poster || ""} 
                        alt={details?.title || ""} 
                        avgHueDark={details?.avgHueDark}
                        className="w-full h-full object-cover opacity-60"
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}

              {/* Gradient Overlays */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#0c0c0c] to-transparent pointer-events-none" />
              <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-[#0c0c0c]/80 via-[#0c0c0c]/40 to-transparent pointer-events-none" />

              {/* Header Controls */}
              <div className="absolute top-0 inset-x-0 p-fluid-sm flex justify-end z-20">
                <button 
                  onClick={handleClose}
                  className="w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mute/Unmute Float */}
              {!loading && trailerUrl && !isTrailerEmbed && (
                <div className="absolute bottom-fluid-sm right-fluid-sm z-20">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              )}

              {/* Mini Info Overlay */}
              <div className="absolute bottom-fluid-sm left-fluid right-fluid z-20 pointer-events-none">
                {details && (
                  <motion.div
                    key={details.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-lg md:text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl mb-2 md:mb-4 max-w-[90%] md:max-w-[70%] line-clamp-2 md:line-clamp-none">
                      {details.title}
                    </h2>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Detailed Content */}
            <div className="px-fluid py-fluid-sm space-y-6 md:space-y-10">
              {/* Meta Info Row - Based on reference image */}
              <div className="flex flex-col gap-1.5 md:gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-sm font-bold text-gray-300">
                  {details?.year && (
                    <span className="hover:text-white transition-colors">{details.year}</span>
                  )}
                  {details?.rating && (
                    <>
                      <span className="text-gray-700 font-normal">|</span>
                      <span className="px-1.5 py-0.5 rounded border border-white/20 text-[8px] md:text-[10px] font-black tracking-widest text-gray-300">
                        {details.rating}
                      </span>
                    </>
                  )}
                  {details?.duration && (
                    <>
                      <span className="text-gray-700 font-normal">|</span>
                      <span>{details.duration}</span>
                    </>
                  )}
                  {details?.imdbRatingValue && (
                    <>
                      <span className="text-gray-700 font-normal">|</span>
                      <div className="flex items-center gap-1 md:gap-1.5 bg-[#f5c518] px-1.5 py-0.5 rounded overflow-hidden">
                        <span className="text-[7px] md:text-[10px] text-black font-black uppercase tracking-tighter">IMDb</span>
                        <span className="text-black font-black text-[9px] md:text-xs leading-none">{details?.imdbRatingValue}</span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Genres row - wrapped separately for better flow */}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] md:text-xs text-gray-400 font-bold uppercase tracking-wider">
                  {(Array.isArray(details?.genres) ? details.genres : (details?.genres as any)?.split(',') || []).slice(0, 4).map((g: string, i: number, arr: string[]) => (
                    <span key={i} className="flex items-center">
                      {g.trim()}
                      {i < arr.length - 1 && <span className="ml-2 text-gray-700">•</span>}
                    </span>
                  ))}
                </div>
              </div>
              
              <p className="text-white/80 leading-relaxed text-[13px] md:text-[15px] font-medium max-w-3xl line-clamp-3 md:line-clamp-none">
                {details?.description || "No description available."}
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <button 
                  onClick={handlePlay}
                  className="flex-1 flex items-center justify-center gap-2 md:gap-3 bg-brand text-white py-3.5 md:py-4 rounded-xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] shadow-[0_10px_30px_rgba(229,9,20,0.3)] active:scale-[0.98] transition-all text-sm md:text-base"
                >
                  <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                  Watch Now
                </button>
                <button 
                  onClick={autoDownload}
                  className="flex-1 flex items-center justify-center gap-2 md:gap-3 bg-white/10 hover:bg-white/20 text-white py-3.5 md:py-4 rounded-xl font-black uppercase tracking-[0.15em] md:tracking-[0.2em] border border-white/10 active:scale-[0.98] transition-all text-sm md:text-base"
                >
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  Download
                </button>
              </div>

              {/* Starring Section */}
              <div className="space-y-4 md:space-y-6">
                <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-[3px] md:tracking-[4px]">Starring</h3>
                <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-2">
                  {Array.isArray(details?.cast) && details.cast.slice(0, 10).map((actor: any, index: number) => (
                    <div 
                      key={`${actor.id}-${index}`} 
                      className="flex flex-col items-center gap-3 md:gap-4 min-w-[100px] md:min-w-[120px] group cursor-pointer" 
                      onClick={() => { 
                        handleClose(); 
                        setTimeout(() => navigate(`/actor/${actor.id}`), 300);
                      }}
                    >
                      <div className="relative">
                        <SmartActorImage 
                          staffId={actor.id}
                          initialAvatar={actor.avatar}
                          alt={actor.name} 
                          className="w-20 h-20 md:w-24 md:h-24 rounded-full object-cover border-2 md:border-4 border-white/5 bg-[#1a1a1a] group-hover:border-brand/40 transition-all shadow-2xl !rounded-full" 
                        />
                      </div>
                      <div className="text-center w-full px-1 md:px-2">
                        <p className="text-white text-[10px] md:text-xs font-black leading-tight group-hover:text-brand transition-colors line-clamp-1">{actor.name}</p>
                        <p className="text-gray-500 text-[9px] md:text-[10px] font-bold mt-1 uppercase tracking-tighter leading-tight whitespace-normal break-words line-clamp-1">
                          as {actor.character ? actor.character : "Supporting Role"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons Circular Style */}
              <div className="flex items-center justify-around md:justify-start gap-6 md:gap-10 py-4 md:py-6 border-t border-white/5">
                <button 
                  onClick={toggleWatchlist} 
                  className="flex flex-col items-center gap-2 md:gap-3 group transition-transform active:scale-95"
                >
                  <div className={`w-11 h-11 md:w-14 md:h-14 flex items-center justify-center rounded-full border-[1.5px] md:border-2 transition-all ${
                    details && isInWatchlist(details.id) 
                      ? "bg-brand border-brand shadow-[0_0_20px_rgba(229,9,20,0.4)]" 
                      : "bg-white/5 border-white/10 group-hover:border-white/20"
                  }`}>
                    {details && isInWatchlist(details.id) ? (
                      <Check className="w-5 h-5 md:w-7 md:h-7 text-white stroke-[3]" />
                    ) : (
                      <Plus className="w-5 h-5 md:w-7 md:h-7 text-white stroke-[3]" />
                    )}
                  </div>
                  <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 group-hover:text-white tracking-[1.5px] md:tracking-[2px] transition-colors">My List</span>
                </button>

                <button 
                         onClick={() => {
                           const url = window.location.origin + '/details/' + details?.id;
                           if (navigator.share) {
                             navigator.share({ title: details?.title, url: url }).catch((err) => {
                               if (err.name !== 'AbortError' && err.message !== 'Share canceled') {
                                 console.error("Share failed:", err);
                               }
                             });
                           } else {
                             navigator.clipboard.writeText(url);
                             showToast("Link copied to clipboard", "success");
                           }
                         }}
                         className="flex flex-col items-center gap-2 md:gap-3 group transition-transform active:scale-95">
                  <div className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border-[1.5px] md:border-2 border-white/10 group-hover:border-white/20 transition-all">
                    <Share2 className="w-5 h-5 md:w-7 md:h-7 text-white stroke-[3]" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 group-hover:text-white tracking-[1.5px] md:tracking-[2px] transition-colors">Share</span>
                </button>
                
                <button 
                         onClick={() => {
                           handleClose();
                           navigate(`/details/${details?.id}`);
                         }} 
                         className="flex flex-col items-center gap-2 md:gap-3 group transition-transform active:scale-95">
                  <div className="w-11 h-11 md:w-14 md:h-14 flex items-center justify-center rounded-full bg-white/5 border-[1.5px] md:border-2 border-white/10 group-hover:border-white/20 transition-all">
                    <Info className="w-5 h-5 md:w-7 md:h-7 text-white stroke-[3]" />
                  </div>
                  <span className="text-[8px] md:text-[10px] font-black uppercase text-gray-400 group-hover:text-white tracking-[1.5px] md:tracking-[2px] transition-colors">Details</span>
                </button>
              </div>

              {/* Recommendations Section */}
              <div className="space-y-4 md:space-y-6 pt-6 md:pt-10 border-t border-white/5">
                <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-[3px] md:tracking-[4px]">Recommendations</h3>
                <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2">
                  {Array.isArray(recommendations) && recommendations.slice(0, 10).map((item, index) => (
                    <div 
                      key={`${item.id}-${index}`} 
                      className="flex-none w-[130px] md:w-[170px] group cursor-pointer space-y-3"
                      onClick={() => {
                        handleClose();
                        setTimeout(() => openPreview(item.id), 300);
                      }}
                    >
                      <div className="aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden bg-[#121212] relative shadow-2xl border border-white/5 group-hover:border-brand/50 transition-colors">
                        <MovieImage 
                          src={item.poster} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stills & Trailer Section */}
              <div className="space-y-4 md:space-y-6 pt-6 md:pt-10 border-t border-white/5">
                <h3 className="text-white font-black text-xs md:text-sm uppercase tracking-[3px] md:tracking-[4px]">Stills & Trailer</h3>
                <div className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-6">
                  {/* Stills */}
                  {Array.isArray(details?.images) && details.images.slice(0, 5).map((img, i) => (
                    <div 
                      key={i} 
                      className="flex-none w-[220px] md:w-[280px] aspect-video rounded-lg md:rounded-xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl cursor-pointer group"
                      onClick={handlePlay}
                    >
                      <MovieImage src={img} alt={`Still ${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                  ))}
                  
                  {/* Trailer Thumbnail */}
                  {details?.images && details.images.length > 0 && (
                     <div 
                        className="relative flex-none w-[220px] md:w-[280px] aspect-video rounded-lg md:rounded-xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl group cursor-pointer"
                        onClick={() => {
                          if (trailerUrl && videoRef.current) {
                            setTimeout(() => {
                               setTrailerEnded(false);
                               videoRef.current?.play();
                               document.getElementById('media-preview-modal')?.scrollTo({ top: 0, behavior: 'smooth' });
                            }, 50);
                          } else {
                            handlePlay();
                          }
                        }}
                     >
                        <MovieImage src={details.images[0]} alt="Trailer thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-11 h-11 md:w-14 md:h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110">
                            <Play className="w-5 h-5 md:w-7 md:h-7 text-white fill-current ml-0.5 md:ml-1" />
                          </div>
                        </div>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Download Tray Overlay */}
          <Tray 
            isOpen={isDownloadTrayOpen} 
            onClose={() => setIsDownloadTrayOpen(false)} 
            title="Choose Quality"
          >
            <div className="grid grid-cols-1 gap-4">
              {playData?.sources && playData.sources.length > 0 ? (
                playData.sources.map((source, idx) => {
                  let estimatedSize = "Unknown Size";
                  if (source.quality.includes("1080")) estimatedSize = "1.2 GB";
                  else if (source.quality.includes("720")) estimatedSize = "800 MB";
                  else if (source.quality.includes("480")) estimatedSize = "400 MB";
                  else if (source.quality.includes("360")) estimatedSize = "250 MB";
                  else if (source.quality.includes("auto")) estimatedSize = "Variable";

                  const downloadTargetUrl = source.downloadUrl || source.url;
                  const isHls = (source.downloadType || source.type) === 'hls';
                  const dlSize = sourceSizes[downloadTargetUrl] || estimatedSize;

                  return (
                    <button
                      key={`${source.url}-${idx}`}
                      onClick={() => handleDownload(downloadTargetUrl)}
                      disabled={isHls}
                      className={`flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-xl transition-all group ${isHls ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:border-brand/50 active:scale-[0.98]'}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-brand/20 group-hover:border-brand/50 group-hover:text-brand transition-all">
                          <Film className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-white text-lg">{source.quality}</p>
                          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-medium">
                            <span className="flex items-center gap-1.5">
                              {dlSize || "Checking Size..."}
                              <span className="text-white/10">•</span>
                              {(source.downloadType || source.type || 'mp4').toUpperCase()}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Download className="w-6 h-6 text-gray-500 group-hover:text-brand transition-colors" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">
                  No resolutions found
                </div>
              )}
            </div>
          </Tray>

          <SignInPromptPopup 
            isOpen={isPromptOpen} 
            onClose={() => setIsPromptOpen(false)}
            onConfirm={() => {
              setIsPromptOpen(false);
              handleClose();
              navigate("/profile");
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
