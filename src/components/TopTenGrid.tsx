import React from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { CardSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

import { useMediaPreview } from "../contexts/MediaPreviewContext";

interface TopTenGridProps {
 title?: string;
 items: MediaItem[];
 loading?: boolean;
 showNumbers?: boolean;
}

function TopTenGrid({ title, items, loading, showNumbers = true }: TopTenGridProps) {
 const { openPreview } = useMediaPreview();

 if (loading) {
 return (
 <section className="py-6 md:py-10">
 <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
 {title && (
 <div className="flex items-end justify-between mb-6">
 <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
 </div>
 )}
 <div className="flex overflow-x-auto gap-6 pb-8 pt-4 hide-scrollbar">
 {[...Array(5)].map((_, i) => (
 <div key={i} className="flex-none w-[280px] sm:w-[320px] flex items-end">
 {showNumbers && <div className="w-16 h-24 bg-white/5 rounded-lg animate-pulse mr-4" />}
 <CardSkeleton />
 </div>
 ))}
 </div>
 </div>
 </section>
 );
 }

 if (!items || items.length === 0) return null;

 return (
 <section className="py-fluid-sm md:py-10">
 <div className="max-w-[1400px] mx-auto px-fluid">
 {title && (
 <div className="flex items-center justify-between mb-4">
 <h2 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
 {title}
 </h2>
 <Link to="/ranking" className="text-fluid-sm font-semibold tracking-wide text-white/50 hover:text-white transition-colors">
 See All
 </Link>
 </div>
 )}

 <div className="flex overflow-x-auto gap-10 md:gap-14 pb-12 pt-8 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
 {Array.isArray(items) && items.slice(0, 10).map((item, index) => {
 const isDoubleDigit = (index + 1) >= 10;
 return (
 <div
 key={`${item.id}-${index}`}
 className="flex-none w-[140px] sm:w-[180px] md:w-[240px] snap-start relative group animate-fade-in"
 style={{ animationDelay: `${Math.min(index * 0.1, 0.4)}s`, animationFillMode: 'both' }}
 >
 <div 
 role="button"
 onClick={() => openPreview(item.id)}
 className="block relative h-full cursor-pointer"
 >
 {/* Huge Number behind card - Frosted Glass Version */}
 {showNumbers && (
 <div 
 className={`absolute -bottom-2 z-0 font-semibold leading-none select-none transition-all duration-700 pointer-events-none group-hover:scale-105 group-hover:-translate-y-2 mix-blend-overlay ${isDoubleDigit ? '-left-8 md:-left-16 text-[100px] sm:text-[140px] md:text-[220px] tracking-[-0.1em]' : '-left-6 md:-left-12 text-[120px] sm:text-[160px] md:text-[260px] tracking-tight' }`} 
 style={{ 
 color: 'rgba(255,255,255,0.1)',
 textShadow: '0 0 40px rgba(255, 255, 255, 0.2)',
 WebkitTextStroke: '1px rgba(255,255,255,0.15)',
 fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display"',
 }}
 >
 {index + 1}
 </div>
 )}
 
 {/* Card Container inline animation handling */}
 <div className={`relative flex flex-col items-center z-10 transition-all duration-500 transform group-hover:scale-[1.04] group-hover:-translate-y-2 group-hover:shadow-[0_30px_60px_rgba(255,255,255,0.15)] rounded-[20px] md:rounded-3xl ${showNumbers ? (isDoubleDigit ? 'ml-14 md:ml-18' : 'ml-12 md:ml-16') : ''}`}>
 {/* Poster */}
 <div className="relative w-full aspect-[2/3] rounded-[20px] md:rounded-3xl overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500">
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
 
 {/* Dark overlay liquid glass */}
 <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mix-blend-overlay" />
 
 {/* Hover State: Play Button */}
 <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-95 group-hover:scale-100">
 <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-[20px] flex items-center justify-center border border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-110 active:scale-95">
 <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current translate-x-[2px]" />
 </div>
 </div>

 {/* Poster Bottom Info */}
 <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 pb-6 md:pb-8 flex flex-col justify-end pointer-events-none">
 <h3 className="text-white font-semibold tracking-tight mb-0.5 leading-tight whitespace-normal break-words line-clamp-2 drop-shadow-md text-fluid-lg">
 {item.title}
 </h3>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 );
}

export default React.memo(TopTenGrid);
