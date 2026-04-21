import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, ChevronLeft, ChevronRight, Star, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useAuth } from "../contexts/AuthContext";

interface CarouselProps {
  items: MediaItem[];
}

export default function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();

  useEffect(() => {
    if (items.length === 0 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length, isHovered]);

  if (!Array.isArray(items) || items.length === 0) return null;

  const currentItem = items[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div 
      className="relative w-full h-[65vh] md:h-[90vh] overflow-hidden bg-bg-base transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {currentItem.poster ? (
            <div className="relative w-full h-full">
               <MovieImage
                src={currentItem.poster}
                alt={currentItem.title}
                className="w-full h-full object-cover md:object-[center_20%] lg:ml-[20%] transition-opacity duration-1000"
              />
              {/* Cinematic Gradients matched to reference */}
              <div className="absolute inset-0 hero-gradient-mobile lg:hidden" />
              <div className="absolute inset-0 hidden lg:block hero-gradient-overlay" />
              <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-bg-base via-bg-base/20 to-transparent" />
            </div>
          ) : (
            <div className="w-full h-full bg-[#0A0A0A]" />
          )}
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-end md:items-center pb-12 md:pb-0">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl lg:max-w-3xl animate-fade-in"
          >
            <div className="mb-2 md:mb-4">
              <span className="text-brand font-black text-[10px] md:text-sm tracking-[0.3em] uppercase italic">
                NEW RELEASE
              </span>
            </div>

            <h1 className="text-4xl md:text-8xl lg:text-[100px] font-black text-white mb-4 md:mb-6 tracking-tighter leading-[0.9] uppercase drop-shadow-2xl font-sans" style={{ transform: 'scaleY(1.1)', transformOrigin: 'left' }}>
              {currentItem.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-gray-400 mb-6 md:mb-8 text-[11px] md:text-[15px] font-bold tracking-wide">
              <span>{currentItem.year || '2024'}</span>
              <span className="text-white/20">•</span>
              
              <span className="px-1.5 py-0.5 border border-white/20 rounded text-[10px] md:text-[11px] leading-none uppercase">
                {currentItem.contentRating || '18+'}
              </span>
              <span className="text-white/20">•</span>

              <span className="text-white/80 uppercase">{currentItem.category || (currentItem.type == 1 || currentItem.type === 'Movie' ? 'Sci-Fi' : 'Thriller')}</span>
              
              {currentItem.rating && (
                <>
                  <span className="text-white/20">•</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f5c518] text-black font-black text-[9px] md:text-[10px] rounded-sm tracking-tighter">
                     IMDb {currentItem.rating}
                  </span>
                </>
              )}
            </div>

            <p className="text-gray-300 text-[13px] md:text-base line-clamp-2 md:line-clamp-3 mb-8 md:mb-10 max-w-xl leading-relaxed font-semibold">
              {currentItem.description && currentItem.description.trim().length > 10 
                ? currentItem.description 
                : `${currentItem.title} - Dive into an unparalleled cinematic experience on AXIS TV. Explore the depths of this ${currentItem.category || (currentItem.type == 1 || currentItem.type === 'Movie' ? 'Sci-Fi' : 'Thriller')} journey as secrets unfold and destinies collide in this high-definition masterpiece.`}
            </p>

            <div className="flex items-center gap-3 md:gap-4">
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 bg-brand text-white rounded-md font-black uppercase text-[13px] md:text-[15px] hover:bg-brand-hover transition-all active:scale-95 shadow-xl glow-brand"
              >
                <Play className="w-4 h-4 md:w-5 md:h-5 fill-current" />
                Play Now
              </Link>
              <button
                onClick={() => {
                  if (!user) {
                    alert("Please sign in to add to your list.");
                    return;
                  }
                  if (isInWatchlist(currentItem.id)) {
                    removeFromWatchlist(currentItem.id);
                  } else {
                    addToWatchlist(currentItem);
                  }
                }}
                className={`flex items-center gap-2 px-6 md:px-8 py-3.5 md:py-4 rounded-md font-black uppercase text-[13px] md:text-[15px] transition-all border active:scale-95 ${isInWatchlist(currentItem.id) ? 'bg-brand border-brand text-white shadow-brand' : 'bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white'}`}
              >
                {isInWatchlist(currentItem.id) ? (
                   <>
                     <Check className="w-4 h-4 md:w-5 md:h-5" />
                     <span>In Playlist</span>
                   </>
                ) : (
                   <>
                     <Plus className="w-4 h-4 md:w-5 md:h-5" />
                     <span>Playlist</span>
                   </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Indicators matched to right side */}
      <div className="absolute bottom-10 md:bottom-20 right-6 md:right-16 flex items-center gap-2.5">
        {items.slice(0, 5).map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-2.5 rounded-full transition-all duration-500 ease-in-out ${
              idx === currentIndex ? "w-8 bg-brand" : "w-2.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
