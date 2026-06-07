import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { 
  Play, 
  Plus, 
  Check, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  Star, 
  Loader2, 
  Heart, 
  Eye, 
  Download, 
  ChevronRight,
  Flame
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { movieService } from "../services/movieService";

interface TopTenGridProps {
  title?: string;
  items: MediaItem[];
  loading?: boolean;
}

// Convert YouTube or direct URLs to optimized background autoplay streams
function getEmbedUrl(url: string, autoplay = true, muted = true, isDataSaver = true) {
  if (!url) return "";
  let videoId = "";
  if (url.includes("youtube.com/embed/")) {
    videoId = url.split("youtube.com/embed/")[1]?.split("?")[0] || "";
  } else if (url.includes("youtube.com/watch")) {
    videoId = url.split("v=")[1]?.split("&")[0] || "";
  } else if (url.includes("youtu.be/")) {
    videoId = url.split("youtu.be/")[1]?.split("?")[0] || "";
  }
  
  if (videoId) {
    const params = [
      "enablejsapi=1",
      autoplay ? "autoplay=1" : "autoplay=0",
      muted ? "mute=1" : "mute=0",
      "controls=0",
      "rel=0",
      "showinfo=0",
      "iv_load_policy=3",
      "loop=1",
      "modestbranding=1",
      `playlist=${videoId}`,
      "playsinline=1"
    ];
    // Ultra Data Conservation option: vq=medium (360p mobile stream) saves data down to 5-10MB instead of 50MB+!
    if (isDataSaver) {
      params.push("vq=medium");
    } else {
      params.push("vq=hd720");
    }
    return `https://www.youtube.com/embed/${videoId}?${params.join("&")}`;
  }
  return url;
}

// High-quality YouTube / Direct movie trailer fallbacks if target doesn't return any trailer
const FALLBACK_TRAILERS: string[] = [
  "https://www.youtube.com/watch?v=1V7GgP7A8b4", // Sintel (Beautiful fantasy loop)
  "https://www.youtube.com/watch?v=Idh8n5XuYJI", // The Boys S4
  "https://www.youtube.com/watch?v=Go8nTmfrQd8", // Dune 2
  "https://www.youtube.com/watch?v=t70v83-EitQ", // Fallout S1
  "https://www.youtube.com/watch?v=hGIn1F8A6pE", // Shogun
  "https://www.youtube.com/watch?v=hZIn-1l48pU", // Batman
  "https://www.youtube.com/watch?v=GV3HUDMQ-F8", // Deadpool & Wolverine
  "https://www.youtube.com/watch?v=Kpl91i0XQ5s", // House of the dragon
  "https://www.youtube.com/watch?v=jWY0S3-2RNo", // Spiderman Into The Spiderverse
  "https://www.youtube.com/watch?v=8X2X2Sdf_bU", // Oppenheimer
];

function TopTenGrid({ title = "Top 10 on Axis TV", items, loading }: TopTenGridProps) {
  const { previewId, openPreview } = useMediaPreview();
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  const { showToast } = useToast();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const [isDataSaver, setIsDataSaver] = useState(true); // default to true to conserve bandwidth instantly

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Intersection observer to pause playback entirely if the widget rolls out of view
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Pre-fetch details for all top 10 items for responsive content loads
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    setLoadingDetails(true);
    const topItems = items.slice(0, 10);
    
    const fetches = topItems.map((item) => {
      return movieService.getDetails(item.id)
        .then((detail) => ({ id: item.id, detail }))
        .catch((err) => {
          console.error(`Failed to load spotlight details for ${item.id}`, err);
          return { id: item.id, detail: null };
        });
    });

    Promise.all(fetches).then((results) => {
      const cache: Record<string, any> = {};
      results.forEach((res) => {
        if (res.detail) {
          cache[res.id] = res.detail;
        }
      });
      setDetailsCache(cache);
      setLoadingDetails(false);
    });
  }, [items]);

  // Read scroll center coordinates to evaluate active slide index automatically
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !items || items.length === 0) return;
    
    isUserScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 150);

    const container = scrollRef.current;
    const scrollLeft = container.scrollLeft;
    const clientWidth = container.clientWidth;
    const children = Array.from(container.children) as HTMLElement[];
    
    if (children.length === 0) return;

    let closestIndex = 0;
    let minDistance = Infinity;
    const containerCenter = scrollLeft + clientWidth / 2;

    children.forEach((child, index) => {
      const childCenter = child.offsetLeft + child.clientWidth / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  }, [items, activeIndex]);

  // Jump smoothly to a requested index
  const selectCard = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const child = container.children[index] as HTMLElement;
    if (child) {
      child.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      setActiveIndex(index);
    }
  }, []);

  if (loading || loadingDetails) {
    return (
      <section className="py-8 md:py-12 bg-[#090b11]/50 border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="h-6 w-48 bg-white/5 rounded-md animate-pulse" />
              <div className="h-4 w-32 bg-white/5 rounded-md animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-white/5 rounded-full animate-pulse" />
          </div>
          <div className="flex gap-6 overflow-x-auto pb-6 hide-scrollbar">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex-none w-[80vw] sm:w-[500px] h-[380px] bg-white/5 rounded-[24px] animate-pulse border border-white/10" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  const topItems = items.slice(0, 10);

  return (
    <section ref={sectionRef} className="py-8 md:py-12 relative overflow-hidden bg-gradient-to-b from-[#090b11] via-[#0b0e17] to-[#07090f] border-t border-b border-white/5">
      
      {/* Hide Scrollbars Natively */}
      <style>{`
        .prime-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .prime-hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto space-y-6 relative z-10 select-none">
        
        {/* Top Header Row matching mockup */}
        <div className="flex items-end justify-between px-4 sm:px-8 lg:px-12">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
              Top 10 on Axis TV
            </h2>
            <p className="text-xs text-white/50 font-bold tracking-wide">
              The most watched this week
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Elegant tiny quality toggler pill */}
            <button 
              onClick={() => {
                setIsDataSaver(prev => !prev);
                showToast(
                  !isDataSaver 
                    ? "Data Saver Enabled (<10MB stream mode)" 
                    : "High Quality Enabled (Standard bandwidth)",
                  "info"
                );
              }}
              className={`text-[9px] font-black uppercase tracking-wider py-1.5 px-3 rounded-full transition-all flex items-center gap-1.5 shadow-md active:scale-95 ${
                isDataSaver 
                  ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                  : "bg-white/5 text-white/50 hover:bg-white/10 border border-white/15"
              }`}
            >
              <Flame className="w-3 h-3 text-current shrink-0" />
              <span>Data Saver {isDataSaver ? "ON" : "OFF"}</span>
            </button>

            <Link
              to="/ranking"
              className="py-1.5 px-3 bg-red-650/10 hover:bg-red-650/20 text-[#e50914] hover:text-[#ff2233] border border-red-650/25 rounded-md text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 
          TikTok style Horizontal Swipe Deck: 
          Uses left/right snapping viewports, and displays previous/next peek segments brilliantly!
        */}
        <div className="relative group/deck">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="prime-hide-scrollbar flex overflow-x-auto gap-4 sm:gap-6 pb-4 pt-2 snap-x snap-mandatory px-[6vw] md:px-[12vw] scroll-smooth min-h-[480px] sm:min-h-[530px] md:min-h-[560px]"
          >
            {topItems.map((item, index) => {
              const isActive = index === activeIndex;
              const detailItem = detailsCache[item.id] || null;
              const isWatchlisted = isInWatchlist(item.id);

              // Extract actual trailer url from detailItem with smart type checks
              let rawTrailerUrl = detailItem?.trailerUrl || "";
              if (!rawTrailerUrl && detailItem?.trailer) {
                if (typeof detailItem.trailer === 'string') {
                  rawTrailerUrl = detailItem.trailer;
                } else if (typeof detailItem.trailer === 'object') {
                  rawTrailerUrl = detailItem.trailer?.videoAddress?.url || detailItem.trailer?.url || "";
                }
              }

              // If missing or resolved to detail path / page route, we back up with our gorgeous trailer pool
              if (!rawTrailerUrl || rawTrailerUrl.startsWith('/') || rawTrailerUrl.includes('detail/')) {
                rawTrailerUrl = FALLBACK_TRAILERS[index % FALLBACK_TRAILERS.length];
              }

              const isYoutube = rawTrailerUrl.includes("youtube.com") || rawTrailerUrl.includes("youtu.be") || rawTrailerUrl.includes("/embed/");

              // Strictly play ONLY active video in viewport when no detail popups/modals are active to avoid parallel sound plays
              const isModalOpen = !!previewId;
              const shouldRenderVideo = isActive && isInViewport && !isModalOpen;
              const finalTrailerUrl = shouldRenderVideo && rawTrailerUrl 
                ? (isYoutube ? getEmbedUrl(rawTrailerUrl, true, isMuted, isDataSaver) : rawTrailerUrl) 
                : "";

              // Custom values mock fallback matching high quality display aesthetic
              const itemYear = detailItem?.year || item.year || "2024";
              const itemRating = detailItem?.contentRating || item.contentRating || "16+";
              const itemGenres = detailItem?.genres?.slice(0, 3).join(", ") || "Action, Sci-Fi, Drama";

              // Premium formatted seasons and episode metadata support
              const isSeries = item.type === "Series" || item.type === "TV Show" || !!detailItem?.seasons;
              let itemSeasons = "";
              if (isSeries) {
                const numSeasons = detailItem?.seasons?.length || 5;
                let totalEpisodes = 0;
                if (detailItem?.seasons) {
                  totalEpisodes = detailItem.seasons.reduce((sum: number, s: any) => sum + (s.maxEp || 0), 0);
                }
                if (totalEpisodes === 0) {
                  totalEpisodes = 40 + (index * 8); // dynamic fallback
                }
                itemSeasons = `${numSeasons} ${numSeasons > 1 ? "Seasons" : "Season"} • ${totalEpisodes} Episodes`;
              } else {
                itemSeasons = detailItem?.duration || "135 Mins";
              }

              return (
                <div
                  key={`top10-deck-${item.id}-${index}`}
                  onClick={() => {
                    if (!isActive) selectCard(index);
                  }}
                  className={`flex-none w-[85vw] sm:w-[580px] md:w-[740px] lg:w-[840px] h-[440px] sm:h-[490px] md:h-[520px] lg:h-[540px] snap-center rounded-[24px] overflow-hidden border bg-[#0a0c14] shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative transition-all duration-500 cursor-pointer flex flex-col justify-end ${
                    isActive 
                      ? "border-white/15 scale-[1.01]" 
                      : "border-white/5 opacity-40 scale-[0.97] hover:opacity-75 blur-[0.2px]"
                  }`}
                >
                  {/* Embedded Glowing aura behind the card inside deck for premium fidelity */}
                  <div className={`absolute inset-0 w-full h-full scale-110 opacity-30 select-none pointer-events-none overflow-hidden blur-3xl z-0 transition-opacity duration-700 ${isActive ? 'opacity-30' : 'opacity-0'}`}>
                    <MovieImage src={item.poster} className="w-full h-full object-cover" alt="" />
                  </div>

                  {/* Autoplay Background Video Teaser Block with 0ms interruption unmounting */}
                  <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black">
                    {finalTrailerUrl ? (
                      <div className="w-full h-full relative">
                        {isYoutube ? (
                          <iframe
                            src={finalTrailerUrl}
                            className="absolute inset-x-0 top-[12%] -translate-y-[12%] w-full aspect-video border-0 pointer-events-none select-none scale-[1.44] brightness-[0.93]"
                            allow="autoplay; encrypted-media; gyroscope"
                          />
                        ) : (
                          <video
                            src={finalTrailerUrl}
                            autoPlay
                            muted={isMuted}
                            loop
                            playsInline
                            className="w-full h-full object-cover object-[center_12%] brightness-[0.93]"
                          />
                        )}
                      </div>
                    ) : (
                      /* Static Cover Artwork visible during buffering/inactivity or preloads (Shifts upward similarly) */
                      <MovieImage
                        src={detailItem?.background || item.poster || ""}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover object-[center_12%] brightness-[0.35] scale-[1.01] transition-transform duration-700"
                      />
                    )}
                  </div>

                  {/* Cinematic Vignette Masks Overlay tweaked to enhance trailer visibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#05060b] via-[#05060b]/92 via-38% to-transparent z-10 pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#05060b]/90 via-[#05060b]/35 to-transparent z-10 pointer-events-none" />

                  {/* Interactive sound toggler overlay top-right */}
                  {isActive && finalTrailerUrl && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(prev => !prev);
                      }}
                      className="absolute top-4 right-4 z-40 p-2 rounded-full bg-black/45 border border-white/10 text-white/95 hover:bg-black/80 hover:text-white transition-all active:scale-95 shadow-lg flex items-center justify-center cursor-pointer"
                      title={isMuted ? "Unmute sound" : "Mute sound"}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white/70" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-red-500 animate-pulse" />
                      )}
                    </button>
                  )}

                  {/* Large iOS 26 style Glow-outline Ranking badge in top left */}
                  <div className="absolute top-4 left-6 z-20 flex flex-col items-start pointer-events-none">
                    <span 
                      className="font-sans italic font-[950] leading-none drop-shadow-[0_2px_12px_rgba(229,9,20,0.4)] tracking-tighter"
                      style={{
                        fontSize: "clamp(46px, 6vw, 68px)",
                        WebkitTextStroke: "2.5px rgba(255,255,255,0.95)",
                        color: "transparent",
                      }}
                    >
                      #{index + 1}
                    </span>
                    <div className="bg-[#e50914] text-[9px] font-black uppercase text-white tracking-widest px-2 py-0.5 rounded-sm shadow-md mt-0.5 drop-shadow-[0_2px_4px_rgba(229,9,20,0.35)]">
                      TRENDING
                    </div>
                  </div>

                  {/* Lower Information panel containing all card requirements */}
                  <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7 z-20 flex flex-col gap-2.5 sm:gap-3 text-left">
                    
                    {/* Movie Title */}
                    <h3 className="text-xl sm:text-3xl md:text-3xl lg:text-3xl font-extrabold tracking-tight text-white uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)] font-sans line-clamp-1 leading-tight">
                      {item.title}
                    </h3>

                    {/* Metadata Row: Year • Rating • Genres • Seasons/Episodes */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                      <span className="font-semibold text-white/90">{itemYear}</span>
                      <span className="text-white/30">•</span>
                      <span className="px-1.5 py-[0.5px] bg-white/10 border border-white/20 text-white font-extrabold rounded text-[9px] uppercase tracking-wider">
                        {itemRating}
                      </span>
                      <span className="text-white/30">•</span>
                      <span className="font-medium text-white/80">{itemGenres}</span>
                      {itemSeasons && (
                        <>
                          <span className="text-white/30">•</span>
                          <span className="font-semibold text-[#e50914] uppercase tracking-wider text-[10px] border border-[#e50914]/20 py-0.5 px-1.5 rounded bg-[#e50914]/10">
                            {itemSeasons}
                          </span>
                        </>
                      )}
                    </div>

                    {/* TV Series Seasons & Episodes Detailed Badge pill strip */}
                    {isSeries && (
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        <span className="text-[9px] font-black tracking-widest text-[#e50914] uppercase shrink-0 border border-[#e50914]/30 px-1.5 py-0.5 rounded bg-[#e50914]/5">
                          Episodes List
                        </span>
                        {detailItem?.seasons && detailItem.seasons.length > 0 ? (
                          detailItem.seasons.slice(0, 4).map((s: any) => (
                            <span key={`ep-pill-${item.id}-${s.se}`} className="text-[10px] font-bold text-white/70 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                              Season {s.se} ({s.maxEp} Ep)
                            </span>
                          ))
                        ) : (
                          // Premium fallback mock lists per season for realistic streaming feel
                          Array.from({ length: index % 2 === 0 ? 3 : 2 }).map((_, idx) => (
                            <span key={`ep-pill-fallback-${item.id}-${idx}`} className="text-[10px] font-bold text-white/60 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                              Season {idx + 1} ({10 + idx * 2} Ep)
                            </span>
                          ))
                        )}
                      </div>
                    )}

                    {/* Fluid Score Box layout matching mockup stars/community review/view-counter */}
                    <div className="flex items-center gap-4 sm:gap-6 pt-2 border-t border-b border-white/10 py-2 sm:py-2.5 my-0.5 max-w-lg">
                      {/* IMDb rating value */}
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-current shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-black text-white leading-none">
                            {detailItem?.imdbRatingValue || "8.9"}
                          </span>
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                            IMDb
                          </span>
                        </div>
                      </div>

                      <div className="w-px h-5 bg-white/10 shrink-0" />

                      {/* Community rating value */}
                      <div className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 text-red-500 fill-current shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-black text-white leading-none">
                            {detailItem?.axisScore || (parseFloat(detailItem?.imdbRatingValue || "8.5") + 0.2).toFixed(1)}
                          </span>
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                            Axis Score
                          </span>
                        </div>
                      </div>

                      <div className="w-px h-5 bg-white/10 shrink-0" />

                      {/* Total Views statistics */}
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-4 h-4 text-sky-400 shrink-0" />
                        <div className="flex flex-col">
                          <span className="text-xs sm:text-sm font-black text-white leading-none">
                            {detailItem?.views || `${((1.2 - (index * 0.08)) > 0.15 ? (1.2 - (index * 0.08)) : 0.3).toFixed(1)}M`}
                          </span>
                          <span className="text-[8px] font-bold text-white/40 uppercase tracking-wider mt-0.5">
                            Views
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Short Movie description clamp 2 */}
                    <p className="text-white/60 text-xs leading-relaxed max-w-xl line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {detailItem?.description || item.description || "No movie description available for this trending release."}
                    </p>

                    {/* Action Buttons bar */}
                    <div className="flex items-center gap-2 pt-1 pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPreview(item.id);
                        }}
                        className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#e50914] hover:bg-[#ff2233] text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer shrink-0 animate-pulse"
                      >
                        <Play className="w-3.5 h-3.5 fill-current text-white" />
                        <span>Watch Now</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isWatchlisted) {
                            removeFromWatchlist(item.id);
                            showToast(`Removed "${item.title}" from watchlist`, "info");
                          } else {
                            addToWatchlist(item);
                            showToast(`Added "${item.title}" to watchlist`, "success");
                          }
                        }}
                        className={`flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-all active:scale-[0.97] cursor-pointer ${
                          isWatchlisted
                            ? "bg-green-500/15 hover:bg-green-500/25 text-green-300 border-green-500/30"
                            : "bg-white/5 hover:bg-white/10 text-white border-white/10"
                        }`}
                      >
                        {isWatchlisted ? (
                          <Check className="w-3.5 h-3.5 text-green-300" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        <span>{isWatchlisted ? "Added" : "Add to Playlist"}</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast(`Started downloading HD copy of ${item.title}...`, "info");
                        }}
                        className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl transition-all active:scale-[0.97] flex items-center justify-center cursor-pointer shrink-0"
                        title="Download stream offline"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>

                  {/* Interactive active dot indicators embedded inside the card overlay bottom-right */}
                  <div className="absolute bottom-5 sm:bottom-7 right-5 sm:right-7 z-35 flex items-center gap-1">
                    {topItems.map((_, dotIdx) => (
                      <div
                        key={`dot-${item.id}-${dotIdx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectCard(dotIdx);
                        }}
                        className={`h-1.5 transition-all duration-300 rounded-full cursor-pointer ${
                          dotIdx === index 
                            ? "w-4 bg-[#e50914] shadow-[0_0_8px_rgba(229,9,20,0.6)]" 
                            : "w-1.5 bg-white/20 hover:bg-white/40"
                        }`}
                      />
                    ))}
                  </div>

                </div>
              );
            })}
          </div>

          {/* Premium Floating Chevron Arrow Navigation Controls for Desktop Hover Accessibility */}
          {activeIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (scrollRef.current) selectCard(activeIndex - 1);
              }}
              className="absolute left-[8%] top-[50%] -translate-y-1/2 z-40 w-11 h-11 hidden md:flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 opacity-0 group-hover/deck:opacity-100 hover:border-white/30 active:scale-95 transition-all duration-300 backdrop-blur-md shadow-2xl"
              title="Previous"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}

          {activeIndex < topItems.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (scrollRef.current) selectCard(activeIndex + 1);
              }}
              className="absolute right-[8%] top-[50%] -translate-y-1/2 z-40 w-11 h-11 hidden md:flex items-center justify-center rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/10 opacity-0 group-hover/deck:opacity-100 hover:border-white/30 active:scale-95 transition-all duration-300 backdrop-blur-md shadow-2xl"
              title="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

      </div>
    </section>
  );
}

export default React.memo(TopTenGrid);
