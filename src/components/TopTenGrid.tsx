import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { CardSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

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
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase">
              {title}
            </h2>
          </div>
        )}

        <div className="flex overflow-x-auto gap-12 pb-12 pt-4 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:-mx-12 lg:px-12">
          {Array.isArray(items) && items.slice(0, 10).map((item, index) => (
            <motion.div
              key={`${item.id}-${index}`}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex-none w-[260px] sm:w-[300px] md:w-[340px] snap-start relative group"
            >
              <Link to={`/details/${item.id}`} className="flex items-end h-full">
                {/* Huge Number */}
                {showNumbers && (
                  <div className="absolute -left-6 bottom-0 z-20 font-black text-[160px] md:text-[200px] leading-[0.7] tracking-tighter text-transparent transition-all duration-700 group-hover:text-brand/20 group-hover:scale-110" style={{ WebkitTextStroke: '4px rgba(255,255,255,0.1)', textShadow: '0 0 40px rgba(0,0,0,0.5)' }}>
                    {index + 1}
                  </div>
                )}
                
                {/* Poster */}
                <div className={`relative flex flex-col gap-4 ${showNumbers ? 'ml-20 md:ml-28' : 'mx-auto'}`}>
                  <div className="relative w-[180px] sm:w-[220px] md:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-4 shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-10 border border-white/5 group-hover:border-white/20">
                    {item.poster ? (
                      <MovieImage
                        src={item.poster}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0A0A0A] flex items-center justify-center text-gray-500 text-xs text-center p-4">
                        No Poster Available
                      </div>
                    )}
                    
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-8 group-hover:translate-y-0">
                      <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center shadow-[0_0_40px_rgba(229,9,20,0.6)] border border-white/20">
                        <Play className="w-7 h-7 text-white ml-1.5" fill="currentColor" />
                      </div>
                    </div>

                    {/* Progress Bar for Continue Watching */}
                    {('progress' in item) && ('duration' in item) && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-20">
                        <div 
                          className="h-full bg-brand shadow-[0_0_10px_rgba(229,9,20,0.8)]" 
                          style={{ width: `${((item as any).progress / (item as any).duration) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 px-1 z-10">
                    <h3 className="text-white font-black text-sm md:text-lg line-clamp-1 group-hover:text-brand transition-colors duration-500 tracking-tight">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                      {item.rating && (
                        <span className="flex items-center gap-1 text-brand">
                          <Star className="w-3.5 h-3.5 fill-brand" />
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
