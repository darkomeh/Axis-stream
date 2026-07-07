import React, { memo } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Star, Flame } from "lucide-react";
import { motion } from "motion/react";
import { MovieImage } from "./MovieImage";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { ListSkeleton } from "./Skeleton";

interface TopTenGridProps {
  title?: string;
  items: MediaItem[];
  loading?: boolean;
}

const TopTenGrid = memo(({ title = "Top 10 on Axis TV", items, loading }: TopTenGridProps) => {
  const { openPreview } = useMediaPreview();

  if (!loading && (!items || items.length === 0)) return null;

  const topItems = items.slice(0, 10);

  return (
    <section className="py-2.5 md:py-4">
      <div className="max-w-[1400px] mx-auto px-fluid">
        {title && (
          <div className="flex items-center justify-between mb-3 md:mb-5 px-1">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 md:w-5 md:h-5 text-[#F5F5F7]" />
              <h2 className="text-sm md:text-base font-semibold tracking-tight text-[#F5F5F7]">
                {title}
              </h2>
            </div>
            <Link to="/sports" className="text-[10px] md:text-xs font-semibold tracking-wide text-[#A1A1AA] hover:text-[#F5F5F7] transition-colors">
              View All
            </Link>
          </div>
        )}

        {loading ? (
          <ListSkeleton count={10} />
        ) : (
          <div className="flex overflow-x-auto gap-3 md:gap-4 pb-8 pt-1 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
            {topItems.map((item, index) => (
              <div
                key={`top10-${item.id}-${index}`}
                className="flex-none w-[34vw] sm:w-[130px] md:w-[150px] lg:w-[170px] snap-start animate-fade-in relative flex items-center"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s`, animationFillMode: 'both' }}
              >
                {/* Huge Number Overlay */}
                <div 
                  className="absolute -left-3 sm:-left-4 lg:-left-5 bottom-2 sm:bottom-0 md:bottom-1 z-0 font-sans italic font-[950] leading-none select-none pointer-events-none drop-shadow-[4px_4px_10px_rgba(0,0,0,0.8)] flex-shrink-0"
                  style={{
                    fontSize: "clamp(55px, 9vw, 110px)",
                    WebkitTextStroke: "2px rgba(255,255,255,0.8)",
                    color: "#05060b",
                  }}
                >
                  {index + 1}
                </div>

                <motion.div 
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(item.id)}
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={{ scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                  className="relative block aspect-[2/3] w-full ml-6 sm:ml-9 lg:ml-12 rounded-[12px] md:rounded-2xl overflow-hidden bg-white/[0.08] group shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_32px_rgba(255,255,255,0.08)] border border-white/5 hover:border-white/15 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50 z-10"
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
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Rating Badge */}
                  {item.rating && (
                    <div className="absolute top-1.5 right-1.5 z-20">
                      <div className="px-1 md:px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-0.5 shadow-md border border-white/5">
                        <Star className="w-2 md:w-2.5 h-2 md:h-2.5 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-white text-[9px] md:text-[10px]">{item.rating}</span>
                      </div>
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="absolute inset-x-0 bottom-0 p-2 md:p-3 pt-6 md:pt-10 flex flex-col justify-end text-left z-20">
                    <h3 className="text-white font-semibold leading-[1.2] mb-0.5 line-clamp-2 drop-shadow-md tracking-tight text-[10px] sm:text-[11px] md:text-xs">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-1.5 font-normal tracking-wide text-white/40 text-[9px] md:text-[10px]">
                      <span>{item.year || '2024'}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-white/30 uppercase text-[9px] tracking-wider">{item.type == 2 || item.type === 'Series' ? 'Series' : 'Movie'}</span>
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

export default TopTenGrid;
