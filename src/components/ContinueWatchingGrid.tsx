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
                className="flex-none w-[240px] sm:w-[280px] md:w-[320px] snap-start group"
              >
                <Link 
                  to={`/details/${item.id}`} 
                  className="relative block aspect-video rounded-xl overflow-hidden bg-white/5 transition-all duration-300 group-hover:scale-105 border border-white/5 group-hover:border-white/20 shadow-lg"
                >
                  {item.poster ? (
                    <MovieImage
                      src={item.background || item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover object-top opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center text-gray-500">
                      No Image
                    </div>
                  )}

                  {/* Gradient overlay for text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-end justify-between mb-2">
                       <h3 className="font-bold text-white text-lg tracking-wide uppercase truncate pr-4 drop-shadow-md">
                         {item.title}
                       </h3>
                       <PlayCircle className="w-8 h-8 text-brand flex-shrink-0 bg-white/20 rounded-full" />
                    </div>

                    {/* Meta info row */}
                    <div className="flex items-center gap-2 text-[10px] text-gray-300 font-bold tracking-widest uppercase mb-3">
                      {item.year && <span>{item.year}</span>}
                      {item.rating && (
                        <span className="flex items-center gap-0.5 text-[#f5c518]">
                           ★ {item.rating}
                        </span>
                      )}
                    </div>

                    {/* Progress Bar Container */}
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mb-2">
                       <div 
                         className="h-full bg-brand rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(229,9,20,0.8)]" 
                         style={{ width: `${progressPercent}%` }} 
                       />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium tracking-wider">
                      <span>
                        {item.season && item.episode ? `S${item.season} • E${item.episode}` : 'Movie'}
                      </span>
                      <span>{timeLeft > 0 ? `${timeLeft}m left` : 'Resume'}</span>
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
