import React, { memo } from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Star } from "lucide-react";
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
    <section className="py-fluid-sm md:py-8">
      <div className="max-w-[1400px] mx-auto px-fluid">
        {title && (
          <div className="flex items-center justify-between mb-5 md:mb-8">
            <h2 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.1)]">
              {title}
            </h2>
            <Link to="/ranking" className="text-fluid-sm font-semibold tracking-wide text-white/50 hover:text-white transition-colors">
              View All
            </Link>
          </div>
        )}

        {loading ? (
          <ListSkeleton count={10} />
        ) : (
          <div className="flex overflow-x-auto gap-4 md:gap-6 pb-12 pt-2 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
            {topItems.map((item, index) => (
              <div
                key={`top10-${item.id}-${index}`}
                className="flex-none w-[45vw] sm:w-[180px] md:w-[220px] lg:w-[250px] snap-start animate-fade-in relative flex items-center"
                style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s`, animationFillMode: 'both' }}
              >
                {/* Huge Number Overlay */}
                <div 
                  className="absolute -left-4 sm:-left-6 lg:-left-8 bottom-4 sm:bottom-0 md:bottom-2 z-0 font-sans italic font-[950] leading-none select-none pointer-events-none drop-shadow-[4px_4px_10px_rgba(0,0,0,0.8)] flex-shrink-0"
                  style={{
                    fontSize: "clamp(80px, 12vw, 150px)",
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
                  whileHover={{ scale: 1.04, y: -6 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                  className="relative block aspect-[2/3] w-full ml-8 sm:ml-12 lg:ml-16 rounded-[16px] md:rounded-2xl overflow-hidden bg-white/5 group shadow-[0_10px_30px_rgba(0,0,0,0.6)] hover:shadow-[0_20px_40px_rgba(255,255,255,0.15)] border border-white/10 hover:border-white/20 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50 z-10"
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
                    <div className="absolute top-2 right-2 z-20">
                      <div className="px-1.5 md:px-2 py-0.5 md:py-1 bg-black/60 backdrop-blur-md rounded-full flex items-center gap-1 shadow-lg border border-white/10">
                        <Star className="w-2.5 md:w-3 h-2.5 md:h-3 text-red-500 fill-red-500" />
                        <span className="font-bold text-white text-fluid-sm">{item.rating}</span>
                      </div>
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="absolute inset-x-0 bottom-0 p-3 md:p-5 pt-8 md:pt-12 flex flex-col justify-end text-left z-20">
                    <h3 className="text-white font-bold leading-[1.1] mb-1 line-clamp-2 drop-shadow-md tracking-tight text-fluid-lg">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 font-medium tracking-wide text-white/50 text-fluid-sm">
                      <span>{item.year || '2024'}</span>
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      <span className="text-white/40 uppercase text-[10px] tracking-wider">{item.type == 2 || item.type === 'Series' ? 'Series' : 'Movie'}</span>
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
