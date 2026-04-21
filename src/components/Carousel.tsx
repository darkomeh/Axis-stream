import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, ChevronLeft, ChevronRight, Star, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { PlaylistModal } from "./PlaylistModal";

interface CarouselProps {
  items: MediaItem[];
}

export default function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);

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
      className="relative w-full h-[90vh] md:h-[95vh] overflow-hidden bg-black group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          {currentItem.poster ? (
            <MovieImage
              src={currentItem.poster}
              alt={currentItem.title}
              className="w-full h-full object-cover object-center opacity-70"
            />
          ) : (
            <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center text-gray-500">
              No Image Available
            </div>
          )}
          {/* Gradients for cinematic effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent h-[20%]" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center md:items-end md:pb-32">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="max-w-2xl mt-40 md:mt-0"
          >
            <div className="mb-2">
              <span className="text-brand font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase">
                {currentItem.year && new Date().getFullYear().toString() === currentItem.year ? "New Release" : "Featured"}
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white mb-4 tracking-tighter leading-[1] uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]" style={{ transform: 'scaleY(1.1)', transformOrigin: 'bottom left' }}>
              {currentItem.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 text-gray-300 mb-6 text-sm md:text-base font-medium">
              {currentItem.year && <span>{currentItem.year}</span>}
              {currentItem.year && <span className="text-gray-500">•</span>}
              
              <span>{currentItem.contentRating || '18+'}</span>
              <span className="text-gray-500">•</span>
              
              <span>{currentItem.category || (currentItem.type == 1 || currentItem.type === '1' || currentItem.type === 'Movie' ? 'Movie' : 'Series')}</span>
              
              {currentItem.rating && (
                <>
                  <span className="text-gray-500">•</span>
                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f5c518] text-black font-bold text-xs rounded-sm">
                     IMDb {currentItem.rating}
                  </span>
                </>
              )}
            </div>

            {currentItem.description ? (
              <p className="text-gray-400 text-sm md:text-base line-clamp-3 mb-8 max-w-lg leading-relaxed">
                {currentItem.description}
              </p>
            ) : (
              <p className="text-gray-400 text-sm md:text-base line-clamp-3 mb-8 max-w-lg leading-relaxed">
                A team of astronauts discovers a signal from the edge of the universe that challenges everything we know about reality.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 bg-brand text-white rounded-md font-bold hover:bg-brand/90 transition-all text-sm md:text-lg shadow-[0_4px_15px_rgba(229,9,20,0.4)]"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </Link>
              <button
                onClick={() => {
                  if (!user) {
                    alert("Please sign in to add to your playlists.");
                    return;
                  }
                  setIsPlaylistModalOpen(true);
                }}
                className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 bg-transparent text-white rounded-md font-bold hover:bg-white/10 transition-all backdrop-blur-sm text-sm md:text-lg border border-white/40 hover:border-white"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden md:inline">Save to Playlist</span>
                <span className="md:hidden">Playlist</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {isPlaylistModalOpen && (
        <PlaylistModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          item={currentItem}
        />
      )}

      {/* Navigation Arrows (Desktop Only) */}
      <button
        onClick={prevSlide}
        className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronLeft className="w-8 h-8 ml-[-2px]" />
      </button>
      <button
        onClick={nextSlide}
        className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/20 backdrop-blur-sm items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-all opacity-0 group-hover:opacity-100"
      >
        <ChevronRight className="w-8 h-8 mr-[-2px]" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 md:bottom-32 right-6 md:right-12 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === currentIndex ? "w-6 bg-brand shadow-[0_0_10px_rgba(229,9,20,0.5)]" : "w-1.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
