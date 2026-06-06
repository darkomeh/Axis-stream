import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { ListSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

import { useMediaPreview } from "../contexts/MediaPreviewContext";

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

 return (
 <section className="py-fluid-sm md:py-8">
 <div className="max-w-[1400px] mx-auto px-fluid">
 {title && (
 <div className="flex items-center justify-between mb-5 md:mb-8">
 <h2 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
 {title}
 </h2>
 {viewAllLink && (
 <Link to={viewAllLink} className="text-fluid-sm font-semibold tracking-wide text-white/50 hover:text-white transition-colors">
 View All
 </Link>
 )}
 </div>
 )}

 {loading ? (
 <ListSkeleton count={items.length > 0 ? items.length : 12} />
 ) : (
 <div className={isGrid 
 ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 md:gap-x-6 gap-y-6 md:gap-y-12 pb-12 pt-2" 
 : "flex overflow-x-auto gap-3 md:gap-5 pb-12 pt-2 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid"
 }>
 {Array.isArray(items) && items.map((item, index) => (
 <div
 key={`${item.id}-${index}`}
 className={isGrid 
 ? "animate-fade-in" 
 : "flex-none w-[32vw] sm:w-[150px] md:w-[180px] lg:w-[200px] snap-start animate-fade-in"
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
 whileHover={{ scale: 1.04, y: -6 }}
 whileTap={{ scale: 0.96 }}
 transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
 className="relative block aspect-[2/3] rounded-[20px] md:rounded-3xl overflow-hidden bg-white/5 group shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)] border border-white/10 hover:border-white/20 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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
 <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
 {(item as any).isNew && (
 <span className="px-2 py-1 rounded-full bg-white/20 backdrop-blur-md font-bold text-white tracking-wider border border-white/20 shadow-lg text-fluid-xs">
 NEW
 </span>
 )}
 </div>

 {/* Rating Badge */}
 {item.rating && (
 <div className="absolute top-2 right-2 z-20">
 <div className="px-1.5 md:px-2 py-0.5 md:py-1 glass-panel rounded-full flex items-center gap-1 shadow-lg">
 <Star className="w-2.5 md:w-3 h-2.5 md:h-3 text-white fill-white" />
 <span className="font-bold text-white text-fluid-sm">{item.rating}</span>
 </div>
 </div>
 )}

 {/* Content Info */}
 <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 pt-8 md:pt-12 flex flex-col justify-end">
 <h3 className="text-white font-semibold leading-[1.1] mb-1 line-clamp-2 drop-shadow-md tracking-tight text-fluid-lg">
 {item.title}
 </h3>
 <div className="flex items-center justify-between font-medium tracking-wide text-white/50 text-fluid-sm">
 <span>{item.year || '2024'}</span>
 <span className="text-white/40">{item.type == 2 || item.type === 'Series' ? 'Series' : 'Movie'}</span>
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
