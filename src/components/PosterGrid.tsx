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
          <div className="flex overflow-x-auto gap-3 sm:gap-4 md:gap-5 pb-8 pt-2 snap-x snap-mandatory hide-scrollbar -mx-6 px-6 lg:-mx-12 lg:px-12">
            {Array.isArray(items) && items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                className="flex-none w-[120px] sm:w-[140px] md:w-[160px] lg:w-[180px] snap-start group flex flex-col gap-3"
              >
                <Link 
                  to={`/details/${item.id}`} 
                  className="relative block aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden bg-white/5 transition-all duration-700 group-hover:scale-[1.03] group-hover:-translate-y-2 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/5 group-hover:border-white/20"
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
                  
                  {/* Overlay Gradient (Always visible at bottom for text, darker on hover) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Persistent Info Overlay at Bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end transform transition-transform duration-500 group-hover:translate-y-[-10px] z-20">
                    <h3 className="text-white font-bold text-sm md:text-base line-clamp-2 uppercase tracking-wide mb-1.5 drop-shadow-md">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-300 font-bold tracking-widest uppercase">
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

                  {/* Hover Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform scale-75 group-hover:scale-100 z-10">
                     <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.6)]">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start z-20">
                    {(item as any).isNew && (
                      <span className="px-2 py-0.5 rounded bg-brand text-[8px] font-black text-white shadow-md uppercase tracking-wider">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-20">
                    {(item as any).isPopular && (
                      <span className="px-2 py-0.5 rounded bg-brand text-[8px] font-black text-white shadow-md uppercase tracking-wider">
                        POPULAR
                      </span>
                    )}
                    {item.quality && (
                      <span className="px-2 py-0.5 rounded bg-black/60 backdrop-blur text-[8px] font-black text-white border border-white/10 uppercase tracking-wider">
                        {item.quality}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
