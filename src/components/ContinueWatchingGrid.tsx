import React from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, PlayCircle } from "lucide-react";
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
 <section className="py-2.5 md:py-4">
 <div className="max-w-[1400px] mx-auto px-fluid">
 {title && (
 <div className="flex items-center justify-between mb-3 md:mb-5 px-1">
 <div className="flex items-center gap-2">
 <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-[#F5F5F7]" />
 <h2 className="text-sm md:text-base font-semibold tracking-tight text-[#F5F5F7]">
 {title}
 </h2>
 </div>
 <Link to="/profile" className="text-[10px] md:text-xs font-semibold text-brand hover:text-[#FF453A] transition-colors tracking-wide">
 See All
 </Link>
 </div>
 )}

 <div className="flex overflow-x-auto gap-2.5 md:gap-4 pb-6 pt-1 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
 {items.slice(0, 10).map((item, index) => {
 const progressPercent = item.duration && item.duration > 1 ? Math.min(100, (item.progress / item.duration) * 100) : Math.min(100, item.progress);
 const timeLeftMinutes = item.duration && item.duration > 1 ? Math.max(0, Math.floor((item.duration - item.progress) / 60)) : 0;
 const timeLeftHours = Math.floor(timeLeftMinutes / 60);
 const timeLeftMins = timeLeftMinutes % 60;
 
 let timeLeftStr = 'Resume';
 if (timeLeftMinutes > 0) {
  if (timeLeftHours > 0) {
   timeLeftStr = `${timeLeftHours}h ${timeLeftMins}m left`;
  } else {
   timeLeftStr = `${timeLeftMins}m left`;
  }
 }
 
 return (
 <div
 key={`${item.id}-${index}`}
 className="flex-none w-[52vw] md:w-[240px] lg:w-[300px] snap-start animate-fade-in"
 style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: 'both' }}
 >
 <div 
 role="button"
 onClick={() => openPreview(item.id, 'continue-watching')}
 className="relative block aspect-video rounded-lg md:rounded-xl overflow-hidden bg-white/[0.08] transition-all duration-500 hover:scale-[1.02] border border-white/5 active:scale-97 group shadow-xl cursor-pointer"
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
 <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 md:p-3.5 pt-12 bg-gradient-to-t from-black via-black/60 to-transparent">
 <div className="space-y-0.5 mb-2">
 <h3 className="font-bold text-white tracking-tight line-clamp-1 drop-shadow-md text-xs md:text-sm">
 {item.title}
 </h3>
 <p className="font-semibold text-white/50 tracking-wider flex items-center gap-1.5 text-[9px] md:text-[10px]">
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
 <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
 <motion.div 
 initial={{ width: 0 }}
 whileInView={{ width: `${progressPercent}%` }}
 transition={{ duration: 1, ease: "easeOut" }}
 className="h-full bg-brand shadow-[0_0_10px_rgba(255,59,48,0.8)] relative"
 >
 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full scale-[1.5] shadow-[0_0_10px_#fff]" />
 </motion.div>
 </div>
 <span className="text-[9px] md:text-[10px] font-semibold text-white/45 whitespace-nowrap">
 {timeLeftStr}
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
