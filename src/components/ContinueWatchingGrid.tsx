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
            <h2 className="text-fluid-lg md:text-2xl font-bold text-white tracking-tight">
              {title}
            </h2>
            <Link to="/profile" className="text-fluid-xs font-bold text-brand hover:text-white transition-colors uppercase tracking-widest">
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
                className="flex-none w-[clamp(240px,60vw,400px)] md:w-[400px] snap-start animate-fade-in"
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
                  <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20">
                    <div className="w-9 h-9 md:w-12 md:h-12 rounded-full border-2 border-white flex items-center justify-center bg-black/20 backdrop-blur-sm group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                      <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white group-hover:text-black group-hover:fill-black pl-0.5" />
                    </div>
                  </div>

                  {/* Bottom Content */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4 md:p-5 pt-10">
                    <div className="space-y-0.5 md:space-y-1 mb-2 md:mb-4">
                      <h3 className="font-black text-white text-fluid-base md:text-2xl tracking-tighter uppercase line-clamp-1 md:line-clamp-2 drop-shadow-lg leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-[9px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2">
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
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex-1 h-[2px] md:h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          whileInView={{ width: `${progressPercent}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className="h-full bg-brand shadow-[0_0_10px_rgba(255,45,45,0.8)]"
                        />
                      </div>
                      <span className="text-[8px] md:text-[10px] font-black text-gray-300 uppercase tracking-widest whitespace-nowrap">
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
