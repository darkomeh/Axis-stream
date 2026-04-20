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
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl md:text-3xl font-black text-white tracking-tighter uppercase">
              {title}
            </h2>
            {viewAllLink && (
              <Link to={viewAllLink} className="text-xs font-black text-gray-500 hover:text-brand transition-all flex items-center gap-2 uppercase tracking-[0.2em] group">
                View All <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton count={items.length > 0 ? items.length : 12} />
        ) : (
          <div className="flex overflow-x-auto gap-5 pb-8 pt-2 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:-mx-12 lg:px-12">
            {Array.isArray(items) && items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex-none w-[160px] sm:w-[200px] md:w-[240px] snap-start group flex flex-col gap-4"
              >
                <Link 
                  to={`/details/${item.id}`} 
                  className="relative block aspect-[2/3] rounded-2xl overflow-hidden bg-white/5 transition-all duration-700 group-hover:scale-105 group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 group-hover:border-white/20"
                >
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Hover Info */}
                  <div className="absolute inset-0 flex flex-col justify-end p-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                    <div className="flex items-center gap-2 mb-2">
                       <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
                      </div>
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Watch Now</span>
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                    {(item as any).isPopular && (
                      <span className="px-2 py-1 rounded-md bg-brand text-[9px] font-black text-white shadow-lg uppercase tracking-widest">
                        Popular
                      </span>
                    )}
                    {item.quality && (
                      <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-xl text-[9px] font-black text-white border border-white/10 uppercase tracking-widest">
                        {item.quality}
                      </span>
                    )}
                  </div>
                </Link>

                <div className="flex flex-col gap-1.5 px-1">
                  <Link 
                    to={`/details/${item.id}`} 
                    className="text-white font-black text-sm md:text-base line-clamp-1 group-hover:text-brand transition-colors duration-500 tracking-tight"
                  >
                    {item.title}
                  </Link>
                  
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                    {item.year && <span>{item.year}</span>}
                    {item.rating && (
                      <span className="flex items-center gap-1 text-brand">
                        <Star className="w-3 h-3 fill-brand" />
                        {item.rating}
                      </span>
                    )}
                    {item.type && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-white/10 bg-white/5">
                        {item.type === '1' ? 'Movie' : 'Series'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
