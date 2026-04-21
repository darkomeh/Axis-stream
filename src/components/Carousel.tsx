import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "./MovieImage";

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
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent w-full" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent h-[30%]" />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 w-full">
          <motion.div
            key={`content-${currentIndex}`}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-4xl mt-20 md:mt-0"
          >
            <div className="flex items-center gap-3 mb-6">
              {currentItem.type && (
                <span className="inline-block px-4 py-1.5 text-[11px] font-black tracking-[0.3em] text-white uppercase bg-brand rounded-full shadow-[0_0_20px_rgba(229,9,20,0.4)]">
                  {currentItem.type == 1 || currentItem.type === '1' || currentItem.type === 'Movie' || currentItem.category === 'Movies' ? 'Movie' : 'Series'}
                </span>
              )}
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-md border border-white/10 rounded-full text-[11px] font-bold text-white uppercase tracking-widest">
                <Star className="w-3.5 h-3.5 fill-brand text-brand" /> {currentItem.rating || 'N/A'}
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-white mb-8 tracking-tighter leading-[0.9] drop-shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
              {currentItem.title}
            </h1>
            
            <div className="flex items-center gap-6 text-gray-300 mb-12 text-sm md:text-lg font-medium tracking-wide">
              {currentItem.year && <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-brand" /> {currentItem.year}</span>}
              {currentItem.quality && (
                <span className="px-3 py-1 bg-white/5 border border-white/20 rounded-md text-xs text-white font-black uppercase tracking-widest">
                  {currentItem.quality}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Link
                to={`/details/${currentItem.id}`}
                className="group relative flex items-center gap-4 px-12 py-5 bg-white text-black rounded-2xl font-black hover:scale-105 transition-all duration-500 text-lg shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-brand translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                <Play className="w-6 h-6 fill-current relative z-10 group-hover:text-white transition-colors" />
                <span className="relative z-10 group-hover:text-white transition-colors">WATCH NOW</span>
              </Link>
              <Link
                to={`/details/${currentItem.id}`}
                className="flex items-center gap-4 px-12 py-5 bg-white/10 text-white rounded-2xl font-black hover:bg-white/20 transition-all duration-500 backdrop-blur-xl text-lg border border-white/10 hover:border-white/30"
              >
                <Info className="w-6 h-6" />
                MORE INFO
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-white/10 hover:border-brand"
      >
        <ChevronLeft className="w-8 h-8 ml-[-2px]" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-brand hover:text-white transition-all opacity-0 group-hover:opacity-100 border border-white/10 hover:border-brand"
      >
        <ChevronRight className="w-8 h-8 mr-[-2px]" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-10 left-6 lg:left-12 flex items-center gap-3">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentIndex ? "w-10 bg-brand shadow-[0_0_10px_rgba(229,9,20,0.5)]" : "w-3 bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
