import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence, useMotionValue } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

interface CarouselProps {
  items: MediaItem[];
}

const DRAG_THRESHOLD = 50;

export default function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  const { showToast } = useToast();
  const { openPreview } = useMediaPreview();

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
      className="relative w-full h-[65vh] md:h-[90vh] overflow-hidden bg-bg-base transition-all group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${currentIndex}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
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
                className="w-full h-full object-cover lg:object-[center_20%] lg:ml-[20%] transition-opacity duration-1000"
              />
              {/* Cinematic Gradients */}
              <div className="absolute inset-0 hero-gradient-mobile lg:hidden" />
              <div className="absolute inset-0 hidden lg:block hero-gradient-overlay" />
              <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-bg-base via-bg-base/40 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-[#0A0A0A]" />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end md:items-center pb-16 md:pb-0 pointer-events-none">
        <div className="max-w-[1400px] mx-auto px-fluid w-full pointer-events-auto">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl lg:max-w-3xl"
          >
            <div className="mb-2 md:mb-4 flex items-center gap-2 md:gap-3">
              <div className="w-6 md:w-8 h-[2px] bg-brand shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
              <span className="text-brand font-black text-[9px] md:text-sm tracking-[0.3em] md:tracking-[0.4em] uppercase italic">
                {getBadges(currentItem)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white mb-2 md:mb-4 tracking-tighter leading-tight uppercase drop-shadow-2xl font-sans">
              {currentItem.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-gray-400 mb-4 md:mb-8 text-fluid-xs md:text-[15px] font-bold tracking-wide">
              <span>{currentItem.year || '2024'}</span>
              <span className="text-white/20">•</span>
              
              <span className="px-1.5 py-0.5 border border-white/20 rounded text-[9px] md:text-[11px] leading-none uppercase">
                {currentItem.contentRating || '18+'}
              </span>
              <span className="text-white/20">•</span>

              <span className="text-white/80 uppercase tracking-widest">{currentItem.category || (currentItem.type == 2 || currentItem.type === 'Series' ? 'Series' : 'Movie')}</span>
              
              {currentItem.rating && (
                <>
                   <span className="text-white/20">•</span>
                   <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f5c518] text-black font-black text-[8px] md:text-[10px] rounded-sm tracking-tighter shadow-[0_4px_10px_rgba(245,197,24,0.2)]">
                      IMDb {currentItem.rating}
                   </span>
                </>
              )}
            </div>

            <p className="text-gray-300 text-fluid-sm md:text-base line-clamp-2 md:line-clamp-3 mb-6 md:mb-10 max-w-xl leading-relaxed font-semibold opacity-90 italic">
              {currentItem.description || ''}
            </p>

            <div className="flex items-center gap-2 md:gap-4">
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-2 px-fluid-sm py-3 md:py-4 bg-brand text-white rounded-md font-black uppercase text-fluid-sm md:text-[15px] hover:bg-brand-hover transition-all active:scale-95 shadow-xl shadow-brand/20"
              >
                <Play className="w-3.5 h-3.5 md:w-5 md:h-5 fill-current" />
                Play Now
              </Link>
              <button
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
                className={`flex items-center gap-2 px-fluid-sm py-3 md:py-4 rounded-md font-black uppercase text-fluid-sm md:text-[15px] transition-all border active:scale-95 ${isInWatchlist(currentItem.id) ? 'bg-brand border-brand text-white shadow-brand/30' : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white'}`}
              >
                {isInWatchlist(currentItem.id) ? (
                   <>
                     <Check className="w-3.5 h-3.5 md:w-5 md:h-5" />
                     <span>In Playlist</span>
                   </>
                ) : (
                   <>
                     <Plus className="w-3.5 h-3.5 md:w-5 md:h-5" />
                     <span>Playlist</span>
                   </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Manual Controls */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-fluid opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <button 
          onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
          className="p-3 rounded-full bg-black/50 premium-blur text-white/50 hover:text-white transition-colors pointer-events-auto border border-white/10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setCurrentIndex((prev) => (prev + 1) % items.length)}
          className="p-3 rounded-full bg-black/50 premium-blur text-white/50 hover:text-white transition-colors pointer-events-auto border border-white/10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Full 20 dots indicators */}
      <div className="absolute bottom-6 md:bottom-20 right-px-fluid left-px-fluid flex items-center justify-center lg:justify-end gap-1.5 md:gap-2 overflow-x-auto pb-2 scrollbar-none">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`min-w-[6px] h-1.5 md:h-2 rounded-full transition-all duration-500 ease-in-out flex-shrink-0 ${
              idx === currentIndex ? "w-6 md:w-8 bg-brand shadow-[0_0_8px_rgba(229,9,20,0.6)]" : "w-1.5 md:w-2 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
