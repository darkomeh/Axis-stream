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
    <section className="py-fluid-sm md:py-10">
      <div className="max-w-[1400px] mx-auto px-fluid">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-fluid-lg md:text-xl font-bold text-white tracking-wide">
              {title}
            </h2>
            {viewAllLink && (
              <Link to={viewAllLink} className="text-fluid-xs font-medium text-brand hover:text-white transition-colors">
                See All
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton count={items.length > 0 ? items.length : 12} />
        ) : (
          <div className={isGrid 
            ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 md:gap-x-6 gap-y-6 md:gap-y-12 pb-12 pt-2" 
            : "flex overflow-x-auto gap-3 md:gap-6 pb-12 pt-2 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid"
          }>
            {Array.isArray(items) && items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={isGrid 
                  ? "animate-fade-in" 
                  : "flex-none w-[clamp(115px,30vw,210px)] md:w-[180px] lg:w-[210px] snap-start animate-fade-in"
                }
                style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s`, animationFillMode: 'both' }}
              >
                <div 
                  role="button"
                  onClick={() => openPreview(item.id)}
                  className="relative block aspect-[2/3] rounded-[10px] md:rounded-[14px] overflow-hidden bg-[#141414] transition-all duration-500 hover:scale-[1.05] hover:-translate-y-2 group shadow-xl active:scale-95 border border-white/5 hover:border-white/20 cursor-pointer"
                >
                  {item.poster ? (
                    <MovieImage
                      src={item.poster}
                      alt={item.title}
                      avgHueDark={item.avgHueDark}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1A1A]" />
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 card-overlay opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                    {(item as any).isNew && (
                      <span className="px-1.5 md:px-2 py-0.5 rounded-[3px] md:rounded-[4px] bg-brand text-[8px] md:text-[9px] font-black text-white uppercase tracking-tighter shadow-lg">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  {item.rating && (
                    <div className="absolute top-2 right-2 z-20">
                       <div className="px-1 md:px-1.5 py-0.5 bg-black/40 premium-blur border border-white/10 rounded flex items-center gap-1">
                          <Star className="w-2 md:w-2.5 h-2 md:h-2.5 text-[#f5c518] fill-current" />
                          <span className="text-[9px] md:text-[10px] font-black text-white">{item.rating}</span>
                       </div>
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 pt-8 md:pt-10">
                     <h3 className="text-white font-black text-[12px] md:text-[15px] leading-tight uppercase mb-0.5 md:mb-1 line-clamp-2 drop-shadow-lg tracking-tight">
                        {item.title}
                     </h3>
                     <div className="flex items-center justify-between text-[8px] md:text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        <span>{item.year || '2024'}</span>
                        <span className="text-white/60">{item.type == 1 || item.type === 'Movie' ? 'Movie' : 'Series'}</span>
                     </div>
                  </div>

                  {/* Hover State Color Bar */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-brand transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

export default PosterGrid;
