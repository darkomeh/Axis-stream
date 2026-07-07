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
 className="relative w-full h-[70vh] md:h-[95vh] overflow-hidden bg-bg-base transition-all group"
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
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent lg:hidden" />
 <div className="absolute inset-0 hidden lg:block hero-gradient-overlay" />
 <div className="absolute inset-0 hidden lg:block bg-gradient-to-t from-black via-black/20 to-transparent" />
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
 <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-white/90 font-bold text-fluid-sm tracking-wide border border-white/20 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
 {getBadges(currentItem)}
 </span>
 </div>

 <h1 className="text-fluid-6xl font-bold text-white mb-3 md:mb-5 tracking-tight leading-[1.1] drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
 {currentItem.title}
 </h1>
 
 <div className="flex flex-wrap items-center gap-3 md:gap-5 text-white/70 mb-5 md:mb-8 font-medium tracking-wide text-fluid-base">
 <span>{currentItem.year || '2024'}</span>
 <span className="text-white/20">•</span>
 
 <span className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded leading-none text-fluid-sm">
 {currentItem.contentRating || '18+'}
 </span>
 <span className="text-white/20">•</span>

 <span className=" tracking-wide">{currentItem.category || (currentItem.type == 2 || currentItem.type === 'Series' ? 'Series' : 'Movie')}</span>
 
 {currentItem.rating && (
 <>
 <span className="text-white/20">•</span>
 <span className="flex items-center gap-1.5 px-2 py-0.5 bg-white text-black font-bold rounded-sm tracking-tight shadow-[0_4px_10px_rgba(255,255,255,0.2)] text-fluid-sm">
 IMDb {currentItem.rating}
 </span>
 </>
 )}
 </div>

 <p className="text-white/80 line-clamp-3 mb-8 md:mb-10 max-w-2xl leading-relaxed font-normal text-fluid-lg">
 {currentItem.description || ''}
 </p>

 <div className="flex items-center gap-3 md:gap-4">
 <Link
 to={`/details/${currentItem.id}`}
 className="flex items-center justify-center gap-2 px-6 py-3.5 md:px-8 md:py-4 bg-white text-black rounded-full font-semibold transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:bg-white/90 text-fluid-lg"
 >
 <Play className="w-5 h-5 fill-current" />
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
 className={`flex items-center justify-center gap-2 px-6 py-3.5 md:px-8 md:py-4 rounded-full font-semibold transition-all active:scale-95 border ${isInWatchlist(currentItem.id) ? 'bg-white/20 border-white/40 text-white backdrop-blur-xl' : 'bg-black/40 backdrop-blur-3xl border-white/20 text-white hover:bg-white/10 hover:border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'} text-fluid-lg`}
 >
 {isInWatchlist(currentItem.id) ? (
 <>
 <Check className="w-5 h-5" />
 <span>In Playlist</span>
 </>
 ) : (
 <>
 <Plus className="w-5 h-5" />
 <span>Playlist</span>
 </>
 )}
 </button>
 </div>
 </motion.div>
 </div>
 </div>

 {/* Manual Controls */}
 <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-fluid opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
 <button 
 onClick={() => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length)}
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
 <div className="absolute bottom-8 md:bottom-12 right-px-fluid left-px-fluid flex items-center justify-center lg:justify-end gap-2 overflow-x-auto pb-2 hide-scrollbar">
 {items.map((_, idx) => (
 <button
 key={idx}
 onClick={() => setCurrentIndex(idx)}
 className={`min-w-[6px] h-1.5 md:h-2 rounded-full transition-all duration-500 flex-shrink-0 ${ idx === currentIndex ? "w-8 md:w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]" : "w-1.5 md:w-2 bg-white/30 hover:bg-white/60" }`}
 />
 ))}
 </div>
 </div>
 );
}
