import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star, Bookmark, Flame, Sparkles, Tv, Zap, Compass, Film } from "lucide-react";
import { motion } from "motion/react";
import { ListSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

import { useMediaPreview } from "../contexts/MediaPreviewContext";

const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('watchlist')) return Bookmark;
  if (t.includes('continue')) return Play;
  if (t.includes('top 10') || t.includes('ranking')) return Flame;
  if (t.includes('trending')) return Flame;
  if (t.includes('because you') || t.includes('watched') || t.includes('recommend')) return Sparkles;
  if (t.includes('latest') || t.includes('featured')) return Tv;
  if (t.includes('hot')) return Zap;
  if (t.includes('discover')) return Compass;
  if (t.includes('series') || t.includes('show')) return Tv;
  return Film;
};

interface PosterGridProps {
 title?: string;
 items: MediaItem[];
 viewAllLink?: string;
 loading?: boolean;
 variant?: 'scroll' | 'grid';
}

const PosterGrid = memo(({ title, items, viewAllLink, loading, variant = 'scroll' }: PosterGridProps) => {
 const { openPreview } = useMediaPreview();
 const navigate = useNavigate();

 if (!loading && (!items || items.length === 0)) return null;

 const isGrid = variant === 'grid';
 const Icon = title ? getCategoryIcon(title) : Film;

 return (
 <section className="py-2.5 md:py-4">
 <div className="max-w-[1400px] mx-auto px-fluid">
 {title && (
 <div className="flex items-center justify-between mb-3 md:mb-5 px-1">
 <div className="flex items-center gap-2">
 <Icon className="w-4 h-4 md:w-5 md:h-5 text-[#F5F5F7]" />
 <h2 className="text-sm md:text-base font-semibold tracking-tight text-[#F5F5F7]">
 {title}
 </h2>
 </div>
 {viewAllLink && (
 <Link to={viewAllLink} className="text-[10px] md:text-xs font-semibold tracking-wide text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors">
 View All
 </Link>
 )}
 </div>
 )}

 {loading ? (
 <ListSkeleton count={items.length > 0 ? items.length : 12} />
 ) : (
 <div className={isGrid 
 ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-2.5 sm:gap-x-3 md:gap-x-4 gap-y-4 md:gap-y-6 pb-6 pt-1" 
 : "flex overflow-x-auto gap-2.5 md:gap-4 pb-6 pt-1 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid"
 }>
 {Array.isArray(items) && items.map((item, index) => (
 <div
 key={`${item.id}-${index}`}
 className={isGrid 
 ? "animate-fade-in" 
 : "flex-none w-[26vw] sm:w-[110px] md:w-[130px] lg:w-[150px] snap-start animate-fade-in"
 }
 style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s`, animationFillMode: 'both' }}
 >
 <motion.div 
 role="button"
 tabIndex={0}
 onClick={() => openPreview(item.id)}
 initial={{ opacity: 0, y: 20 }}
 whileInView={{ opacity: 1, y: 0 }}
 viewport={{ once: true, margin: "-50px" }}
 whileHover={{ scale: 1.04, y: -4 }}
 whileTap={{ scale: 0.97 }}
 transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
 className="relative block aspect-[2/3] rounded-[12px] md:rounded-2xl overflow-hidden bg-white/[0.08] group shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_32px_rgba(255,255,255,0.08)] border border-white/5 hover:border-white/15 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50"
 onKeyDown={(e) => {
 if (e.key === 'Enter' || e.key === ' ') {
 e.preventDefault();
 openPreview(item.id);
 }
 }}
 >
 {item.poster ? (
 <MovieImage
 src={item.poster}
 alt={item.title}
 avgHueDark={item.avgHueDark}
 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
 />
 ) : (
 <div className="w-full h-full bg-white/5" />
 )}
 
 {/* Overlay Gradient (Softer Glass) */}
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
 
 {/* Badges */}
 <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-20">
 {(item as any).isNew && (
 <span className="px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md font-bold text-white tracking-wider border border-white/20 shadow-md text-[9px]">
 NEW
 </span>
 )}
 </div>

 {/* Rating Badge */}
 {item.rating && (
 <div className="absolute top-1.5 right-1.5 z-20">
 <div className="px-1 md:px-1.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/5 rounded-full flex items-center gap-0.5 shadow-md">
 <Star className="w-2 md:w-2.5 h-2 md:h-2.5 text-yellow-500 fill-yellow-500" />
 <span className="font-bold text-white text-[9px] md:text-[10px]">{item.rating}</span>
 </div>
 </div>
 )}

 {/* Content Info */}
 <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-3 pt-6 md:pt-10 flex flex-col justify-end">
 <h3 className="text-white font-semibold leading-[1.2] mb-0.5 line-clamp-2 drop-shadow-md tracking-tight text-[10px] sm:text-[11px] md:text-xs">
 {item.title}
 </h3>
 <div className="flex items-center justify-between font-normal tracking-wide text-white/40 text-[9px] md:text-[10px]">
 <span>{item.year || '2024'}</span>
 <span className="text-white/30">{item.type == 2 || item.type === 'Series' ? 'Series' : 'Movie'}</span>
 </div>
 </div>
 </motion.div>
 </div>
 ))}
 </div>
 )}
 </div>
 </section>
 );
});

export default PosterGrid;
