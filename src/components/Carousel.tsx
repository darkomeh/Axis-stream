import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MediaItem, slugify } from "../types";
import { Play, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { ShimmerButton } from "./ShimmerButton";
import { movieService } from "../services/movieService";

interface CarouselProps {
  items: MediaItem[];
}

const DRAG_THRESHOLD = 50;

export default function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } =
    useAuth();
  const { showToast } = useToast();
  const { openPreview } = useMediaPreview();
  const navigate = useNavigate();

  const [enrichedItems, setEnrichedItems] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!items || items.length === 0) return;
    
    const fetchEnrichedData = async () => {
      const enriched: Record<string, any> = {};
      const promises = items.map(async (item) => {
        try {
          const details = await movieService.getDetails(item.id);
          if (details) {
            enriched[item.id] = {
              duration: details.duration,
              genres: details.genres,
              contentRating: details.contentRating,
              year: details.year,
              rating: details.rating || details.imdbRatingValue,
              votes: details.imdbRatingVotes,
            };
          }
        } catch (err) {
          console.warn(`Failed to enrich carousel item ${item.id}`, err);
        }
      });
      await Promise.allSettled(promises);
      setEnrichedItems(enriched);
    };

    fetchEnrichedData();
  }, [items]);

  const dragX = useMotionValue(0);

  useEffect(() => {
    if (items.length === 0 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length, isHovered]);

  const onDragEnd = () => {
    const x = dragX.get();
    if (x <= -DRAG_THRESHOLD) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    } else if (x >= DRAG_THRESHOLD) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  if (!Array.isArray(items) || items.length === 0) return null;

  const currentItem = items[currentIndex];

  const getBadges = (item: MediaItem) => {
    const isModern = item.year && parseInt(item.year) >= 2023;
    return isModern ? "GLOBAL PREMIERE" : "STREAMING NOW";
  };

  return (
    <div
      className="relative w-full h-[70vh] sm:h-[80vh] md:h-[90vh] lg:h-[95vh] xl:h-[100vh] overflow-hidden bg-bg-base transition-all group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          style={{ x: dragX }}
          onDragEnd={onDragEnd}
        >
          {currentItem.poster ? (
            <div
              className="relative w-full h-full"
              onClick={() => {
                if (dragX.get() === 0) openPreview(currentItem.id);
              }}
            >
              <MovieImage
                src={currentItem.poster}
                alt={currentItem.title}
                avgHueDark={currentItem.avgHueDark}
                isHero={true}
                className="w-full h-full object-cover lg:object-[center_20%] lg:ml-[20%] transition-opacity duration-1500"
              />
              {/* Cinematic Gradients - Liquid Glass Style */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/50 to-transparent lg:hidden" />
              <div className="absolute inset-0 hidden lg:block hero-gradient-overlay" />
              <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-[#080808] via-[#080808]/20 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-transparent" />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end md:items-center pb-20 md:pb-0 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-fluid w-full pointer-events-auto">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl lg:max-w-3xl"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="px-2.5 py-0.5 bg-white/10 backdrop-blur-md rounded-full text-white/90 font-bold text-fluid-xs tracking-wide border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                {getBadges(currentItem)}
              </span>
            </div>

            <h1 className="text-fluid-2xl sm:text-fluid-3xl md:text-fluid-4xl lg:text-fluid-5xl xl:text-fluid-6xl font-bold text-white mb-1.5 md:mb-3 tracking-tight leading-[1.1] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              {currentItem.title}
            </h1>

            {(() => {
              const enriched = enrichedItems[currentItem.id] || {};
              const isSeries = currentItem.type === "Series" || currentItem.type === 2 || enriched.type === "Series" || (enriched.seasons && enriched.seasons.length > 0);
              
              const displayYear = enriched.year || currentItem.year || "2026";
              const displayType = isSeries ? "Series" : "Movies";
              
              let displayDuration = "";
              if (isSeries) {
                const seasonsCount = (enriched.seasons && enriched.seasons.length) || 1;
                displayDuration = `${seasonsCount} Season${seasonsCount !== 1 ? "s" : ""}`;
              } else {
                const rawDuration = enriched.duration || currentItem.duration;
                if (rawDuration) {
                  let totalMinutes = 0;
                  if (typeof rawDuration === 'number') {
                    if (rawDuration > 600) {
                      totalMinutes = Math.floor(rawDuration / 60);
                    } else {
                      totalMinutes = rawDuration;
                    }
                  } else {
                    const cleaned = String(rawDuration).replace(/[^0-9]/g, '');
                    const num = parseInt(cleaned, 10);
                    if (!isNaN(num)) {
                      if (num > 600) {
                        totalMinutes = Math.floor(num / 60);
                      } else {
                        totalMinutes = num;
                      }
                    }
                  }

                  if (totalMinutes > 0) {
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    if (hours > 0) {
                      displayDuration = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                    } else {
                      displayDuration = `${totalMinutes}m`;
                    }
                  } else {
                    displayDuration = "2h 16m";
                  }
                } else {
                  displayDuration = "2h 16m";
                }
              }

              const displayGenres = enriched.genres && enriched.genres.length > 0
                ? enriched.genres.slice(0, 3).join(", ")
                : (currentItem.category || (isSeries ? "Action, Drama, Thriller" : "Action, Drama, Horror"));
              const displayRating = enriched.rating || currentItem.rating || "8.1";
              const displayVotes = enriched.votes || "106K votes";

              return (
                <>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-white/70 mb-4 md:mb-6 font-medium tracking-wide text-fluid-xs sm:text-fluid-sm">
                    <span>{displayYear}</span>
                    <span className="text-white/20">•</span>
                    <span>{displayType}</span>
                    <span className="text-white/20">•</span>
                    <span>{displayDuration}</span>
                    <span className="text-white/20">•</span>
                    <span className="tracking-wide">{displayGenres}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-5 md:mb-7 font-medium tracking-wide">
                    {displayRating && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-md border border-white/10 text-[#FFB400] font-bold rounded-lg tracking-tight text-fluid-xs shadow-sm">
                        ★ {displayRating}
                      </span>
                    )}
                    {displayRating && (
                      <span className="flex items-center gap-1 px-2.5 py-1 bg-black/40 backdrop-blur-md border border-[#FFB400]/40 text-[#FFB400] font-black rounded-lg tracking-tight text-fluid-xs shadow-sm uppercase font-black">
                        IMDb
                      </span>
                    )}
                    <span className="text-white/60 text-fluid-xs font-medium">{displayVotes}</span>
                  </div>
                </>
              );
            })()}

            <div className="flex items-center gap-3 md:gap-4">
              <ShimmerButton
                soundType="play"
                onClick={() => navigate(`/details/${slugify(currentItem.title)}`)}
                className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 bg-brand text-white rounded-xl font-bold transition-all active:scale-95 shadow-[0_8px_20px_rgba(229,9,20,0.4)] hover:shadow-[0_8px_30px_rgba(229,9,20,0.6)] hover:bg-brand-hover text-fluid-sm sm:text-fluid-base"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </ShimmerButton>
              <ShimmerButton
                soundType="click"
                onClick={() => {
                  if (!user) {
                    showToast("Please sign in to add to your list.", "error");
                    return;
                  }
                  if (isInWatchlist(currentItem.id)) {
                    removeFromWatchlist(currentItem.id);
                    showToast("Removed from My List", "info");
                  } else {
                    addToWatchlist(currentItem);
                    showToast("Added to My List", "success");
                  }
                }}
                className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3 rounded-xl font-semibold transition-all active:scale-95 border ${isInWatchlist(currentItem.id) ? "bg-white/20 border-white/40 text-white backdrop-blur-xl" : "bg-white/10 backdrop-blur-xl border-white/20 text-white hover:bg-white/20 hover:border-white/30 shadow-[0_4px_24px_rgba(0,0,0,0.3)]"} text-fluid-sm sm:text-fluid-base`}
              >
                {isInWatchlist(currentItem.id) ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>My List</span>
                  </>
                )}
              </ShimmerButton>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-fluid opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <button
          onClick={() =>
            setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)
          }
          className="p-4 rounded-full bg-black/40 backdrop-blur-3xl text-white hover:bg-white/20 transition-colors pointer-events-auto border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
          className="p-4 rounded-full bg-black/40 backdrop-blur-3xl text-white hover:bg-white/20 transition-colors pointer-events-auto border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-4 right-fluid-px-12 flex items-center justify-end gap-1.5 w-full pr-12 pb-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 flex-shrink-0 ${idx === currentIndex ? "bg-white scale-125" : "bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}
