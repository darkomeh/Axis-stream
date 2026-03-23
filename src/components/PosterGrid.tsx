import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { ListSkeleton } from "./Skeleton";

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
            <h2 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              {title}
            </h2>
            {viewAllLink && (
              <Link to={viewAllLink} className="text-sm font-medium text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                View All <span aria-hidden="true">&rarr;</span>
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton count={items.length > 0 ? items.length : 12} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {items.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link to={`/details/${item.id}`} className="group relative block aspect-[2/3] rounded-md overflow-hidden bg-white/5 transition-transform duration-300 hover:scale-105 hover:z-10 hover:shadow-2xl">
                  {item.poster ? (
                    <img
                      src={item.poster}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
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
                          <Star className="w-3 h-3 fill-white" />
                          {item.rating}
                        </span>
                      )}
                      {item.contentRating && (
                        <span className="px-1.5 py-0.5 rounded-sm border border-white/20 bg-white/10 text-white">
                          {item.contentRating}
                        </span>
                      )}
                      {item.year && <span>{item.year}</span>}
                      {item.type && <span className="uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded-sm border border-white/20">{item.type}</span>}
                    </div>
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
