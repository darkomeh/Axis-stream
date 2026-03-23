import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CarouselProps {
  items: MediaItem[];
}

export default function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (items.length === 0 || isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [items.length, isHovered]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div 
      className="relative w-full h-[85vh] md:h-[90vh] overflow-hidden bg-[#050505]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${currentIndex}`}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {currentItem.poster ? (
            <img
              src={currentItem.poster}
              alt={currentItem.title}
              className="w-full h-full object-cover object-top opacity-70"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-[#121212] flex items-center justify-center text-gray-500">
              No Image Available
            </div>
          )}
          {/* Gradients for cinematic effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/50 to-transparent w-[85%]" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-3xl mt-20 md:mt-0"
          >
            {currentItem.type && (
              <span className="inline-block px-3 py-1 mb-6 text-xs font-bold tracking-[0.2em] text-white uppercase bg-white/10 backdrop-blur-md rounded-sm">
                {currentItem.type}
              </span>
            )}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tighter leading-[1.1] drop-shadow-2xl">
              {currentItem.title}
            </h1>
            
            <div className="flex items-center gap-4 text-gray-300 mb-10 text-sm md:text-base font-medium">
              {currentItem.year && <span>{currentItem.year}</span>}
              {currentItem.rating && (
                <span className="flex items-center gap-1 text-white">
                  <Star className="w-4 h-4 fill-white text-white" /> {currentItem.rating}
                </span>
              )}
              {currentItem.quality && (
                <span className="px-2 py-0.5 border border-white/30 rounded-sm text-xs text-white">
                  {currentItem.quality}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-3 px-10 py-4 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform text-base shadow-[0_0_30px_rgba(255,255,255,0.2)]"
              >
                <Play className="w-5 h-5 fill-black" />
                Watch Now
              </Link>
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-3 px-10 py-4 bg-white/10 text-white rounded-full font-bold hover:bg-white/20 transition-colors backdrop-blur-md text-base border border-white/10"
              >
                <Info className="w-5 h-5" />
                Details
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
      >
        <ChevronLeft className="w-8 h-8 ml-[-2px]" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
      >
        <ChevronRight className="w-8 h-8 mr-[-2px]" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-10 left-6 lg:left-12 flex items-center gap-2">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentIndex ? "w-8 bg-white" : "w-2 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
