import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { ListSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

interface PosterGridProps {
  title?: string;
  items: MediaItem[];
  viewAllLink?: string;
  loading?: boolean;
}

export default function PosterGrid({ title, items, viewAllLink, loading }: PosterGridProps) {
  if (!loading && (!items || items.length === 0)) return null;

  return (
    <section className="py-6 md:py-10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-bold text-white tracking-wide">
              {title}
            </h2>
            {viewAllLink && (
              <Link to={viewAllLink} className="text-sm font-medium text-brand hover:text-white transition-colors">
                See All
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton count={items.length > 0 ? items.length : 12} />
        ) : (
          <div className="flex overflow-x-auto gap-4 md:gap-6 pb-12 pt-4 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:-mx-12 lg:px-12">
            {Array.isArray(items) && items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[210px] snap-start"
              >
                <Link 
                  to={`/details/${item.id}`} 
                  className="relative block aspect-[2/3] rounded-[14px] overflow-hidden bg-[#141414] transition-all duration-500 hover:scale-[1.05] hover:-translate-y-2 group shadow-xl active:scale-95 border border-white/5 hover:border-white/20"
                >
                  {item.poster ? (
                    <MovieImage
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1A1A1A]" />
                  )}
                  
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 card-overlay opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Badges */}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20">
                    {(item as any).isNew && (
                      <span className="px-2 py-0.5 rounded-[4px] bg-brand text-[9px] font-black text-white uppercase tracking-tighter shadow-lg">
                        NEW
                      </span>
                    )}
                  </div>

                  {/* Rating Badge at Top Right */}
                  {item.rating && (
                    <div className="absolute top-2.5 right-2.5 z-20">
                       <div className="px-1.5 py-0.5 bg-black/40 premium-blur border border-white/10 rounded flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 text-[#f5c518] fill-current" />
                          <span className="text-[10px] font-black text-white">{item.rating}</span>
                       </div>
                    </div>
                  )}

                  {/* Content Info at Bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-4 pt-10">
                     <h3 className="text-white font-black text-[13px] md:text-[15px] leading-tight uppercase mb-1 line-clamp-2 drop-shadow-lg tracking-tight">
                        {item.title}
                     </h3>
                     <div className="flex items-center justify-between text-[10px] font-bold tracking-widest text-gray-400 uppercase">
                        <span>{item.year || '2024'}</span>
                        <span className="text-white/60">{item.type == 1 || item.type === 'Movie' ? 'Movie' : 'Series'}</span>
                     </div>
                  </div>

                  {/* Hover State: Subtle glow/play indicator hint */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-brand transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
