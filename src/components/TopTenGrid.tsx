import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { CardSkeleton } from "./Skeleton";

interface TopTenGridProps {
  title?: string;
  items: MediaItem[];
  loading?: boolean;
  showNumbers?: boolean;
}

export default function TopTenGrid({ title, items, loading, showNumbers = true }: TopTenGridProps) {
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
    <section className="py-6 md:py-10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {title && (
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              {title}
            </h2>
          </div>
        )}

        <div className="flex overflow-x-auto gap-6 pb-8 pt-4 snap-x snap-mandatory hide-scrollbar">
          {items.slice(0, 10).map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex-none w-[280px] sm:w-[320px] snap-start relative group"
            >
              <Link to={`/details/${item.id}`} className="flex items-end h-full">
                {/* Huge Number */}
                {showNumbers && (
                  <div className="absolute -left-4 bottom-0 z-20 font-black text-[140px] leading-[0.8] tracking-tighter text-transparent" style={{ WebkitTextStroke: '4px #4a4a4a', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                    {index + 1}
                  </div>
                )}
                
                {/* Poster */}
                <div className={`relative w-[200px] sm:w-[240px] aspect-[2/3] ${showNumbers ? 'ml-16' : 'mx-auto'} rounded-xl overflow-hidden bg-white/5 transition-transform duration-300 group-hover:scale-105 group-hover:-translate-y-4 shadow-2xl z-10`}>
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500 text-xs text-center p-4">
                      No Poster Available
                    </div>
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Hover Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-auto self-center transform scale-75 group-hover:scale-100 transition-transform duration-300 border border-white/30">
                      <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
                    </div>
                    
                    <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight mb-2 drop-shadow-md">
                      {item.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-[11px] text-gray-300 font-medium">
                      {item.rating && (
                        <span className="flex items-center gap-1 text-white">
                          <Star className="w-3 h-3 fill-white text-white" />
                          {item.rating}
                        </span>
                      )}
                      {item.year && <span>{item.year}</span>}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
