import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Plus, Check, Volume2, VolumeX, TrendingUp, Sparkles, Star, ShoppingBag, Loader2 } from "lucide-react";
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
  showNumbers?: boolean;
}

// Translate a YouTube URL or direct video URL to autoplay embed structure
function getEmbedUrl(url: string, autoplay = true, muted = true) {
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
      `playlist=${videoId}`
    ].join("&");
    return `https://www.youtube.com/embed/${videoId}?${params}`;
  }
  return url;
}

function TopTenGrid({ title = "Top 10 on Axis TV", items, loading, showNumbers = true }: TopTenGridProps) {
  const { openPreview } = useMediaPreview();
  const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  const { showToast } = useToast();

  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
  const [loadingAllDetails, setLoadingAllDetails] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor visibility of the TopTenGrid container so trailers only stream when in view
  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.15 } // Activate when at least 15% of the widget is visible
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Trigger cache load for top 10 items details on mount/items change
  useEffect(() => {
    if (!items || items.length === 0) return;
    
    setLoadingAllDetails(true);
    const topTen = items.slice(0, 10);
    
    const fetches = topTen.map((item) => {
      return movieService.getDetails(item.id)
        .then((detail) => ({ id: item.id, detail }))
        .catch((err) => {
          console.error(`Failed to fetch details for top item ${item.id}`, err);
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
      setLoadingAllDetails(false);
    });
  }, [items]);

  // Sync index on manual scroll / swiping of bottom carousel
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !items || items.length === 0) return;
    
    // Set user-scrolling flag to prevent programmatic feedback loops
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

    setActiveIndex((prev) => (prev !== closestIndex ? closestIndex : prev));
  }, [items]);

  // Seamless jump to selected rank & scroll it to horizontal viewport center
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

  // Monitor loading of trailers to render loading spin state beautifully
  useEffect(() => {
    setTrailerLoading(true);
    const timer = setTimeout(() => {
      setTrailerLoading(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [activeIndex]);

  if (loading) {
    return (
      <section className="py-6 md:py-10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 space-y-8 animate-pulse">
          <div className="h-[220px] sm:h-[320px] bg-white/5 rounded-3xl" />
          <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-none w-[160px] h-[240px] bg-white/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!items || items.length === 0) return null;

  const currentItem = items[activeIndex] || items[0];
  const activeDetailItem = detailsCache[currentItem.id] || null;
  const rawTrailerUrl = activeDetailItem?.trailerUrl || currentItem.detailPath; // safe fallback
  const isYoutube = rawTrailerUrl?.includes("youtube.com") || rawTrailerUrl?.includes("youtu.be") || rawTrailerUrl?.includes("/embed/");
  // Stream only if component is in visible viewport boundaries
  const activeTrailerSrc = isInViewport && rawTrailerUrl ? (isYoutube ? getEmbedUrl(rawTrailerUrl, true, isMuted) : rawTrailerUrl) : null;

  const currentCategory = currentItem.type === "Series" || currentItem.type === 2 || currentItem.category?.toLowerCase().includes("series") ? "NEW SERIES" : "NEW MOVIE";

  return (
    <section ref={sectionRef} className="py-6 md:py-10 relative overflow-hidden bg-gradient-to-b from-black/40 via-[#0a0e17]/10 to-[#0a0e17]/95">
      
      {/* Self-contained styling module to perfectly hide horizontal scrollbars natively */}
      <style>{`
        .prime-hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .prime-hide-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 space-y-6 relative z-10">
        
        {/* ========================================================
            1. WATCH TRAILER REELS SPOTLIGHT BANNER (Sleeker & More Compact)
           ======================================================== */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 font-sans font-extrabold text-white/95 text-sm sm:text-base tracking-wide uppercase select-none">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span>Watch Trailer Reels & Spotlight Teasers</span>
            <span className="text-white/40 font-normal text-xs ml-0.5">&gt;</span>
          </div>

          {/* Compact visual teaser screen container built with smaller limits */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[21/7.2] max-h-[300px] sm:max-h-[340px] bg-[#141b29] rounded-[20px] md:rounded-2xl overflow-hidden border border-white/5 shadow-2xl group flex flex-col justify-end">
            
            {/* Dark Cinematic Vignette Masks Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30 z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent z-10 pointer-events-none hidden sm:block" />

            {/* Video Player Base or Backdrop image placeholder */}
            <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTrailerSrc ? (
                  <motion.div
                    key={`trailer-${currentItem.id}-${isMuted}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="w-full h-full"
                  >
                    {isYoutube ? (
                      <iframe
                        src={activeTrailerSrc}
                        className="w-full h-full scale-[1.3] pointer-events-none select-none border-none"
                        allow="autoplay; encrypted-media; gyroscope"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        src={activeTrailerSrc}
                        autoPlay
                        muted={isMuted}
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key={`backdrop-${currentItem.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full relative"
                  >
                    <MovieImage
                      src={activeDetailItem?.background || activeDetailItem?.images?.[0] || currentItem.poster || ""}
                      alt={currentItem.title}
                      className="w-full h-full object-cover brightness-[0.55] scale-[1.01] transition-all duration-700"
                    />
                    
                    {/* Rich centered warning callout for missing trailer */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 backdrop-blur-md border border-white/15 px-6 py-4 rounded-2xl flex flex-col items-center gap-1.5 text-xs font-bold text-white/90 shadow-2xl z-20 pointer-events-none uppercase tracking-widest max-w-[80%] text-center">
                      <span className="text-2xl mb-1">🎬</span>
                      <span className="text-brand">No Trailer Available</span>
                      <span className="text-[10px] text-white/50 normal-case font-normal mt-0.5">Showing movie backdrop scene instead</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Premium centered spinner overlay shown when active trailer is transitioning or loading */}
            <AnimatePresence>
              {trailerLoading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 pointer-events-none"
                >
                  <Loader2 className="w-8 h-8 text-brand animate-spin" />
                  <span className="text-xs font-black uppercase text-brand tracking-widest animate-pulse">
                    Streaming Preview...
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sound Toggle Button overlay top right */}
            <div className="absolute top-3 right-3 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
              {activeTrailerSrc && (
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="p-2 sm:p-2.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white hover:bg-black/85 hover:border-white/20 transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center cursor-pointer pointer-events-auto z-40"
                  title={isMuted ? "Unmute Sound" : "Mute Sound"}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white/80" />
                  ) : (
                    <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-brand animate-pulse" />
                  )}
                </button>
              )}
            </div>

            {/* In-Frame Title overlay (Desktop Layout) */}
            <div className="absolute top-5 left-5 md:top-6 md:left-6 z-20 pointer-events-none hidden sm:block">
              <motion.div
                key={`bannerTitle-${currentItem.id}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-1"
              >
                <h1 className="text-lg md:text-2xl font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] uppercase tracking-tight">
                  {currentItem.title}
                </h1>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest bg-black/45 px-2 py-0.5 rounded-sm inline-block border border-white/5">
                  Spotlight Hot Rank #{activeIndex + 1}
                </p>
              </motion.div>
            </div>

            {/* Clickable Card Watch Trigger Layer */}
            <div 
              onClick={() => openPreview(currentItem.id)}
              className="absolute inset-0 z-10 cursor-pointer pointer-events-auto" 
            />
          </div>

          {/* Under-Card Metadata block: Customized for Axis TV Premium Cinematic Aura */}
          <div className="pt-2 space-y-2 select-none">
            <motion.div
              key={`banner-below-meta-${currentItem.id}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-brand/10 hover:bg-brand/20 transition-colors border border-brand/40 text-brand text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wide">
                      {currentCategory}
                    </span>
                    <span className="text-white/40 text-xs">•</span>
                    <span className="text-brand text-[10px] font-bold tracking-wide uppercase flex items-center gap-1 bg-brand/10 px-2 py-0.5 rounded-md">
                      <span>Top {activeIndex + 1} on Axis TV</span>
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-white/95 uppercase font-sans">
                    {currentItem.title}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/60">
                    <span className="font-semibold text-white/80">{activeDetailItem?.year || currentItem.year || "2026"}</span>
                    <span>•</span>
                    <span className="px-1.5 py-[1px] bg-white/10 rounded text-[9px] font-bold text-white/95">
                      {activeDetailItem?.contentRating || currentItem.contentRating || "16+"}
                    </span>
                    <span>•</span>
                    <span className="font-medium text-white/80">
                      {activeDetailItem?.duration || (activeDetailItem?.seasons?.length ? `${activeDetailItem.seasons.length} Seasons` : "106 min")}
                    </span>
                    {activeDetailItem?.category && (
                      <>
                        <span>•</span>
                        <span className="text-brand/90 font-bold tracking-wide uppercase text-[10px]">
                          {activeDetailItem.category}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Play CTA & IMDb Badges */}
                <div className="flex items-center gap-2.5 pt-1 md:pt-0">
                  {activeDetailItem?.imdbRatingValue && (
                    <div className="flex items-center gap-1 text-amber-500 font-extrabold text-xs tracking-tight bg-white/[0.03] py-1.5 px-3 rounded-lg border border-white/5 shadow-inner">
                      <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                      <span>IMDb {activeDetailItem.imdbRatingValue}</span>
                    </div>
                  )}

                  <button
                    onClick={() => openPreview(currentItem.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-brand text-[#0a0e17] rounded-full font-black text-xs uppercase tracking-wider transition-all hover:bg-brand/90 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-brand/10 cursor-pointer pointer-events-auto"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Now</span>
                  </button>
                </div>
              </div>

              {/* Tagline Summary */}
              {activeDetailItem?.description && (
                <p className="text-white/60 text-xs leading-relaxed max-w-4xl line-clamp-2 md:line-clamp-3 bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                  {activeDetailItem.description}
                </p>
              )}
            </motion.div>
          </div>
        </div>


        {/* ========================================================
            2. TOP 10 ON AXIS TV COUNTDOWN DECK (Widescreen Landscape Panels)
           ======================================================== */}
        <div className="space-y-4 pt-1">
          <div className="flex items-end justify-between px-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white/50 animate-pulse" />
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white/95 uppercase font-sans">
                Top 10 on Axis TV
              </h2>
            </div>
            <Link
              to="/ranking"
              className="text-xs font-black text-brand uppercase hover:text-brand/80 transition-colors tracking-wide"
            >
              See All Legends &gt;
            </Link>
          </div>

          {/* Swipeable widescreen landscape cards designed to snap seamlessly and duplicate the Prime top-10 feeling */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="prime-hide-scrollbar flex overflow-x-auto gap-4 sm:gap-6 pb-6 pt-2 snap-x snap-mandatory px-0.5"
            style={{ scrollBehavior: "smooth" }}
          >
            {items.slice(0, 10).map((item, index) => {
              const isActive = index === activeIndex;
              const serialNum = index + 1;
              const detailItem = detailsCache[item.id] || null;

              const itemType = item.type === "Series" || item.type === 2 || item.category?.toLowerCase().includes("series") ? "tv" : "movie";

              return (
                <div
                  key={`top10-slide-${item.id}-${index}`}
                  onClick={() => selectCard(index)}
                  className={`flex-none flex flex-col snap-center relative group w-[75vw] sm:w-[310px] md:w-[360px] lg:w-[390px] cursor-pointer transition-all duration-300 ${
                    isActive ? "scale-[1.01]" : "opacity-55 hover:opacity-85"
                  }`}
                >
                  {/* Upper portion: Artwork overlapping Giant transparent Rank Number */}
                  <div className="relative flex items-end h-[115px] sm:h-[155px] md:h-[180px] w-full select-none">
                    
                    {/* Giant outlined ranking rank count */}
                    {showNumbers && (
                      <div
                        className={`absolute left-0 -bottom-[12px] font-sans font-black italic select-none leading-none z-0 transition-all duration-500 pointer-events-none ${
                          isActive 
                            ? "scale-105 opacity-100 text-brand" 
                            : "opacity-35 text-transparent"
                        }`}
                        style={{
                          fontSize: "clamp(120px, 14vw, 210px)",
                          WebkitTextStroke: isActive ? "3px rgba(255, 255, 255, 0.95)" : "2.5px rgba(255, 255, 255, 0.35)",
                          color: "transparent",
                          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.85))",
                          fontFamily: "'Inter', sans-serif"
                        }}
                      >
                        {serialNum}
                      </div>
                    )}

                    {/* Artwork Container shifted to overlap giant background rank */}
                    <div
                      className={`relative aspect-[16/9] z-10 rounded-xl md:rounded-2xl overflow-hidden bg-[#141b29] border transition-all duration-400 shadow-[0_12px_24px_rgba(0,0,0,0.6)] ${
                        isActive 
                          ? "border-brand shadow-[0_0_20px_rgba(244,196,48,0.25)] scale-[1.02]" 
                          : "border-white/5 group-hover:border-white/15"
                      }`}
                      style={{
                        marginLeft: "clamp(42px, 8vw, 90px)",
                        width: "calc(100% - clamp(42px, 8vw, 90px))"
                      }}
                    >
                      {/* Rich Dark vignette sheen */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent z-10" />

                      <MovieImage
                        src={item.poster || ""}
                        alt={item.title}
                        className="w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105"
                      />

                      {/* Display name tag inside artwork for instant scannability */}
                      <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 z-25 flex flex-col justify-end pointer-events-none">
                        <span className="text-[8px] font-black uppercase text-brand tracking-widest mb-1 font-sans">
                          #{serialNum} Spot on Axis
                        </span>
                        <h4 className="text-white text-xs sm:text-base font-black whitespace-normal break-words line-clamp-1 drop-shadow-md tracking-tight uppercase leading-tight">
                          {item.title}
                        </h4>
                      </div>
                    </div>
                  </div>

                  {/* Under-Artwork Details Meta Row: Perfectly matches left edge position of the artwork */}
                  <div 
                    className="mt-3 space-y-1 block select-none transition-all duration-300"
                    style={{ marginLeft: "clamp(42px, 8vw, 90px)" }}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] font-extrabold text-white/90">
                      {/* Card Type pill tag */}
                      <span className="bg-white text-black text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded-sm tracking-wide">
                        {itemType === "tv" ? "NEW SERIES" : "NEW MOVIE"}
                      </span>
                      
                      {/* Rating pill tag */}
                      <span className="bg-white/10 text-white border border-white/15 text-[9px] sm:text-[10px] font-bold px-1.5 py-[1px] rounded-sm uppercase">
                        {detailItem?.contentRating || item.contentRating || "16+"}
                      </span>
                      
                      {/* Duration/Runtime fallback */}
                      <span className="text-white/60">
                        {detailItem?.duration || (itemType === "tv" ? "1 Season" : "106 min")}
                      </span>

                      <span className="text-white/30">•</span>

                      {/* Year badge fallback */}
                      <span className="text-white/60">
                        {detailItem?.year || item.year || "2026"}
                      </span>
                    </div>

                    {/* Shopping Bag Row - Identical to photo */}
                    <div className="flex items-center gap-1.5 text-amber-500 font-extrabold text-[10.5px] sm:text-xs pt-0.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span className="tracking-wide text-amber-400">Watch free on Axis TV</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}

export default React.memo(TopTenGrid);
