import React from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play } from "lucide-react";
import { motion } from "motion/react";
import { MovieImage } from "./MovieImage";

import { useMediaPreview } from "../contexts/MediaPreviewContext";

interface ContinueWatchingGridProps {
 title?: string;
 items: any[];
}

function ContinueWatchingGrid({ title, items }: ContinueWatchingGridProps) {
 const { openPreview } = useMediaPreview();

 if (!items || items.length === 0) return null;

 return (
 <section className="py-fluid-sm md:py-10">
 <div className="max-w-[1400px] mx-auto px-fluid">
 {title && (
 <div className="flex items-center justify-between mb-4 md:mb-6">
 <h2 className="text-fluid-xl font-bold text-white tracking-tight">
 {title}
 </h2>
 <Link to="/profile" className="text-fluid-sm font-bold text-brand hover:text-white transition-colors tracking-wide">
 See All
 </Link>
 </div>
 )}

 <div className="flex overflow-x-auto gap-3 md:gap-5 pb-8 pt-2 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
 {items.slice(0, 10).map((item, index) => {
 const progressPercent = item.duration ? Math.min(100, (item.progress / item.duration) * 100) : 50;
 const timeLeft = item.duration ? Math.max(0, Math.floor((item.duration - item.progress) / 60)) : 0;
 
 return (
 <div
 key={`${item.id}-${index}`}
 className="flex-none w-[60vw] md:w-[320px] lg:w-[400px] snap-start animate-fade-in"
 style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: 'both' }}
 >
 <div 
 role="button"
 onClick={() => openPreview(item.id, 'continue-watching')}
 className="relative block aspect-video rounded-xl md:rounded-2xl overflow-hidden bg-white/5 transition-all duration-500 hover:scale-[1.02] border border-white/10 active:scale-95 group shadow-2xl cursor-pointer"
 >
 {/* Background Image */}
 <div className="absolute inset-0 z-0">
 <MovieImage
 src={item.background || item.poster}
 alt={item.title}
 avgHueDark={item.avgHueDark}
 className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
 </div>

 {/* Play Button Overlay */}
 <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
 <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-white/20 flex items-center justify-center bg-white/20 backdrop-blur-xl group-hover:scale-110 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.5)] cursor-pointer">
 <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white pl-1" />
 </div>
 </div>

 {/* Bottom Content */}
 <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5 pt-16 bg-gradient-to-t from-black via-black/60 to-transparent">
 <div className="space-y-1 mb-3">
 <h3 className="font-bold text-white tracking-tight line-clamp-1 drop-shadow-md text-fluid-xl">
 {item.title}
 </h3>
 <p className="font-semibold text-white/60 tracking-wider flex items-center gap-2 text-fluid-sm">
 {item.season && item.episode ? (
 <>
 <span>S{item.season}</span>
 <span className="w-1 h-1 bg-white/30 rounded-full" />
 <span>E{item.episode}</span>
 </>
 ) : (
 <span>MOVIE</span>
 )}
 </p>
 </div>

 {/* Progress Bar & Time Left */}
 <div className="flex items-center gap-3">
 <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
 <motion.div 
 initial={{ width: 0 }}
 whileInView={{ width: `${progressPercent}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] relative"
 >
 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full scale-[1.5] shadow-[0_0_10px_#fff]" />
 </motion.div>
 </div>
 <span className="text-fluid-sm font-semibold text-white/50 whitespace-nowrap">
 {timeLeft > 0 ? `${timeLeft}m left` : 'Resume'}
 </span>
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

export default React.memo(ContinueWatchingGrid);
