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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              {title}
            </h2>
            <Link to="/browse" className="text-sm font-medium text-brand hover:text-white transition-colors">
              See All
            </Link>
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
              className="flex-none w-[180px] sm:w-[220px] md:w-[260px] snap-start relative group"
            >
              <Link to={`/details/${item.id}`} className="flex items-end h-full">
                {/* Huge Number */}
                {showNumbers && (
                  <div className="absolute -left-4 bottom-0 z-20 font-black text-[120px] md:text-[160px] leading-[0.75] tracking-tighter text-transparent transition-all duration-700 group-hover:text-brand/20 group-hover:scale-110" style={{ WebkitTextStroke: '3px rgba(255,255,255,0.1)', textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                    {index + 1}
                  </div>
                )}
                
                {/* Poster */}
                <div className={`relative flex flex-col gap-3 ${showNumbers ? 'ml-14 md:ml-20' : 'mx-auto'}`}>
                  <div className="relative w-[140px] sm:w-[160px] md:w-[180px] aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden bg-white/5 transition-all duration-700 group-hover:scale-[1.03] group-hover:-translate-y-2 shadow-[0_30px_60px_rgba(0,0,0,0.6)] z-10 border border-white/5 group-hover:border-white/20">
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    {/* Hover Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-8 group-hover:translate-y-0 z-10">
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

                    {/* Persistent Info Overlay at Bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-4 pb-5 flex flex-col justify-end transform transition-transform duration-500 group-hover:translate-y-[-5px] z-20 text-center items-center">
                      <h3 className="text-brand font-black text-sm md:text-base line-clamp-2 uppercase tracking-widest mb-1.5 drop-shadow-lg">
                        {item.title}
                      </h3>
                      <div className="flex flex-wrap justify-center items-center gap-1.5 text-[9px] text-gray-300 font-bold tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.year && <span>{item.year}</span>}
                        {item.rating && (
                          <span className="flex items-center gap-0.5 text-[#f5c518]">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            {item.rating}
                          </span>
                        )}
                        {item.type && (
                          <span className="text-[8px] px-1 py-0.5 rounded border border-white/20 bg-white/10 text-white">
                            {item.type == 1 || item.type === '1' || item.type === 'Movie' || item.category === 'Movies' ? 'Movie' : 'Series'}
                          </span>
                        )}
                      </div>
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
