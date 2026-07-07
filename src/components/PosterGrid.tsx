import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star, Bookmark, Flame, Sparkles, Tv, Zap, Compass, Film } from "lucide-react";
import { motion } from "motion/react";
import { ListSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

const getCategoryIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('watchlist')) return Bookmark;
  if (t.includes('continue')) return Play;
  if (t.includes('top 10') || t.includes('ranking')) return Flame;
  if (t.includes('trending')) return Flame;
  if (t.includes('because you') || t.includes('watched') || t.includes('recommend')) return Sparkles;
  if (t.includes('latest') || t.includes('featured')) return Tv;
  if (t.includes('hot')) return Zap;
  if (t.includes('discover')) return Compass;
  if (t.includes('series') || t.includes('show')) return Tv;
  return Film;
};

const getKidsEmoji = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('watchlist') || t.includes('my list')) return "🎈";
  if (t.includes('continue')) return "🍿";
  if (t.includes('top 10') || t.includes('ranking')) return "🌟";
  if (t.includes('trending')) return "🔥";
  if (t.includes('because you') || t.includes('watched') || t.includes('recommend')) return "✨";
  if (t.includes('latest') || t.includes('featured')) return "🎁";
  if (t.includes('hot')) return "🌈";
  if (t.includes('discover')) return "🍭";
  if (t.includes('pixar') || t.includes('disney')) return "🎨";
  if (t.includes('cartoon') || t.includes('non-stop')) return "🎠";
  return "🧸";
};

const KIDS_COLORS = [
  "text-yellow-400 shadow-[0_2px_10px_rgba(250,204,21,0.15)]",
  "text-pink-400 shadow-[0_2px_10px_rgba(244,114,182,0.15)]",
  "text-cyan-400 shadow-[0_2px_10px_rgba(34,211,238,0.15)]",
  "text-emerald-400 shadow-[0_2px_10px_rgba(52,211,153,0.15)]",
  "text-orange-400 shadow-[0_2px_10px_rgba(251,146,60,0.15)]",
  "text-purple-400 shadow-[0_2px_10px_rgba(192,132,252,0.15)]"
];

interface PosterGridProps {
  title?: string;
  items: MediaItem[];
  viewAllLink?: string;
  loading?: boolean;
  variant?: 'scroll' | 'grid';
}

const PosterGrid = memo(({ title, items, viewAllLink, loading, variant = 'scroll' }: PosterGridProps) => {
  const { openPreview } = useMediaPreview();
  const { preferences } = useAuth();
  const navigate = useNavigate();

  if (!loading && (!items || items.length === 0)) return null;

  const isGrid = variant === 'grid';
  const Icon = title ? getCategoryIcon(title) : Film;
  const isKids = preferences?.kidsMode;

  const colorClass = isKids && title
    ? KIDS_COLORS[Math.abs(title.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % KIDS_COLORS.length]
    : "text-[#F5F5F7]";

  return (
    <section className="py-2.5 md:py-4">
      <div className="max-w-[1400px] mx-auto px-fluid">
        {title && (
          <div className="flex items-center justify-between mb-3 md:mb-5 px-1">
            <div className="flex items-center gap-2">
              {isKids ? (
                <span className="text-xl md:text-2xl animate-pulse select-none mr-1">
                  {getKidsEmoji(title)}
                </span>
              ) : (
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-[#F5F5F7]" />
              )}
              <h2 className={`text-sm md:text-lg font-bold tracking-tight ${isKids ? `${colorClass} font-sans rounded-xl px-2 py-0.5` : "text-[#F5F5F7]"}`}>
                {title}
              </h2>
            </div>
            {viewAllLink && (
              <Link to={viewAllLink} className={`text-[10px] md:text-xs font-semibold tracking-wide ${isKids ? "text-yellow-400 hover:text-yellow-300" : "text-[#A1A1AA] hover:text-[#F5F5F7]"} transition-colors`}>
                {isKids ? "More Fun ➔" : "View All"}
              </Link>
            )}
          </div>
        )}

        {loading ? (
          <ListSkeleton count={items.length > 0 ? items.length : 12} />
        ) : (
          <div className={isGrid 
            ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-x-2.5 sm:gap-x-3 md:gap-x-4 gap-y-4 md:gap-y-6 pb-6 pt-1" 
            : "flex overflow-x-auto gap-2.5 md:gap-4 pb-6 pt-1 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid"
          }>
            {Array.isArray(items) && items.map((item, index) => (
              <div
                key={`${item.id}-${index}`}
                className={isGrid 
                  ? "animate-fade-in" 
                  : "flex-none w-[26vw] sm:w-[110px] md:w-[130px] lg:w-[150px] snap-start animate-fade-in"
                }
                style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s`, animationFillMode: 'both' }}
              >
                <motion.div 
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(item.id)}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  whileHover={isKids ? { scale: 1.07, y: -6, rotate: [0, -1, 1, 0], transition: { duration: 0.3 } } : { scale: 1.04, y: -4 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 20, mass: 0.7 }}
                  className={isKids
                    ? "relative block aspect-[2/3] rounded-[20px] md:rounded-[26px] overflow-hidden bg-gradient-to-br from-white/10 to-white/[0.03] group shadow-[0_12px_28px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_40px_rgba(251,191,36,0.2)] border-2 border-white/5 hover:border-yellow-400/40 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/50"
                    : "relative block aspect-[2/3] rounded-[12px] md:rounded-2xl overflow-hidden bg-white/[0.08] group shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_16px_32px_rgba(255,255,255,0.08)] border border-white/5 hover:border-white/15 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                  }
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
                      avgHueDark={item.avgHueDark}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  
                  {/* Overlay Gradient (Softer Glass) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Badges */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-20">
                    {(item as any).isNew && (
                      <span className={`px-1.5 py-0.5 rounded-full font-bold text-white tracking-wider shadow-md text-[9px] ${isKids ? "bg-pink-500 border border-pink-400" : "bg-white/20 backdrop-blur-md border border-white/20"}`}>
                        NEW ✨
                      </span>
                    )}
                  </div>

                  {/* Rating Badge */}
                  {item.rating && (
                    <div className="absolute top-1.5 right-1.5 z-20">
                      <div className={`px-1 md:px-1.5 py-0.5 backdrop-blur-md border rounded-full flex items-center gap-0.5 shadow-md ${isKids ? "bg-yellow-400/20 border-yellow-400/40" : "bg-black/60 border-white/5"}`}>
                        <Star className={`w-2 md:w-2.5 h-2 md:h-2.5 text-yellow-400 fill-yellow-400`} />
                        <span className={`font-bold text-[9px] md:text-[10px] ${isKids ? "text-yellow-400" : "text-white"}`}>{item.rating}</span>
                      </div>
                    </div>
                  )}

                  {/* Content Info */}
                  <div className="absolute inset-x-0 bottom-0 p-2.5 md:p-3 pt-6 md:pt-10 flex flex-col justify-end">
                    <h3 className={`font-semibold leading-[1.2] mb-0.5 line-clamp-2 drop-shadow-md tracking-tight text-[10px] sm:text-[11px] md:text-xs ${isKids ? "text-yellow-100 group-hover:text-yellow-300 font-sans" : "text-white"}`}>
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between font-normal tracking-wide text-white/40 text-[9px] md:text-[10px]">
                      <span>{item.year || '2024'}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[8px] font-bold ${isKids ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20" : "text-white/30"}`}>
                        {item.type == 2 || item.type === 'Series' ? 'Series' : 'Movie'}
                      </span>
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

export default PosterGrid;
