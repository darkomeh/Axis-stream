import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { PlayCircle } from "lucide-react";
import { motion } from "motion/react";
import { MovieImage } from "./MovieImage";

interface ContinueWatchingGridProps {
  title?: string;
  items: any[];
}

export default function ContinueWatchingGrid({ title, items }: ContinueWatchingGridProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-6 md:py-10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              {title}
            </h2>
            <Link to="/profile" className="text-sm font-medium text-brand hover:text-white transition-colors">
              See All
            </Link>
          </div>
        )}

        <div className="flex overflow-x-auto gap-4 pb-8 pt-2 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:-mx-12 lg:px-12">
          {items.slice(0, 10).map((item, index) => {
            // Assume media item format from continue watching state
            const progressPercent = item.duration ? Math.min(100, (item.progress / item.duration) * 100) : 50;
            const timeLeft = item.duration ? Math.max(0, Math.floor((item.duration - item.progress) / 60)) : 0;
            
            return (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex-none w-[260px] sm:w-[300px] md:w-[360px] snap-start"
              >
                <Link 
                  to={`/details/${item.id}`} 
                  className="relative block aspect-video rounded-[14px] overflow-hidden bg-[#141414] transition-all duration-300 hover:scale-[1.03] border border-white/5 active:scale-95 group shadow-2xl"
                >
                  {item.poster ? (
                    <MovieImage
                      src={item.background || item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center text-gray-500" />
                  )}

                  {/* Gradient overlay for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                  {/* Content Overlay */}
                  <div className="absolute inset-0 flex flex-col justify-end p-5">
                    {/* Title */}
                    <h3 className="font-black text-white text-xl md:text-2xl tracking-tighter uppercase truncate mb-4 drop-shadow-2xl">
                      {item.title}
                    </h3>

                    {/* Progress Bar Container */}
                    <div className="relative w-full h-[3px] bg-white/20 rounded-full overflow-hidden mb-3">
                       <div 
                         className="h-full bg-brand rounded-full transition-all duration-700 shadow-[0_0_10px_rgba(229,9,20,1)]" 
                         style={{ width: `${progressPercent}%` }} 
                       />
                    </div>

                    <div className="flex items-center justify-between">
                       {/* Metadata */}
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white text-xs font-black uppercase tracking-tighter">
                            {item.title}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                            <span>
                              {item.season && item.episode ? `S${item.season} • E${item.episode}` : 'MOVIE'}
                            </span>
                            <span className="text-white/20">•</span>
                            <span>{timeLeft > 0 ? `${timeLeft}m left` : 'Resume'}</span>
                          </div>
                        </div>

                        {/* Play Icon - Small circle on bottom right */}
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                           <PlayCircle className="w-5 h-5 text-black fill-current" />
                        </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
