import React from "react";
import { Link } from "react-router-dom";
import { MediaItem } from "../types";
import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { CardSkeleton } from "./Skeleton";
import { MovieImage } from "./MovieImage";

import { useMediaPreview } from "../contexts/MediaPreviewContext";

interface TopTenGridProps {
  title?: string;
  items: MediaItem[];
  loading?: boolean;
  showNumbers?: boolean;
}

function TopTenGrid({ title, items, loading, showNumbers = true }: TopTenGridProps) {
  const { openPreview } = useMediaPreview();

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
    <section className="py-fluid-sm md:py-10">
      <div className="max-w-[1400px] mx-auto px-fluid">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-fluid-lg md:text-xl font-bold text-white tracking-wide">
              {title}
            </h2>
            <Link to="/browse" className="text-fluid-xs font-medium text-brand hover:text-white transition-colors">
              See All
            </Link>
          </div>
        )}

        <div className="flex overflow-x-auto gap-10 md:gap-12 pb-12 pt-8 snap-x snap-mandatory hide-scrollbar -mx-fluid px-fluid">
          {Array.isArray(items) && items.slice(0, 10).map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex-none w-[clamp(140px,35vw,240px)] md:w-[240px] snap-start relative group animate-fade-in"
              style={{ animationDelay: `${Math.min(index * 0.1, 0.6)}s`, animationFillMode: 'both' }}
            >
              <div 
                role="button"
                onClick={() => openPreview(item.id)}
                className="block relative h-full cursor-pointer"
              >
                {/* Huge Number behind card */}
                {showNumbers && (
                  <div className="absolute -left-10 md:-left-12 bottom-[-5px] z-0 font-black text-[clamp(120px,25vw,240px)] leading-none tracking-tighter text-transparent select-none transition-all duration-700 pointer-events-none group-hover:scale-105" style={{ WebkitTextStroke: 'clamp(1.5px, 0.5vw, 2.5px) rgba(255,255,255,0.12)', fontFamily: 'Inter' }}>
                    {index + 1}
                  </div>
                )}
                
                {/* Card Container */}
                <div className={`relative flex flex-col items-center z-10 ${showNumbers ? 'ml-8 md:ml-12' : ''}`}>
                  {/* Poster */}
                  <div className="relative w-full aspect-[2/3] rounded-[14px] md:rounded-[18px] overflow-hidden bg-[#141414] transition-all duration-500 transform hover:scale-[1.02] hover:-translate-y-2 border border-white/5 group-hover:border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                    {item.poster ? (
                      <MovieImage
                        src={item.poster}
                        alt={item.title}
                        avgHueDark={item.avgHueDark}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1A1A1A]" />
                    )}
                    
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    
                    {/* Hover State: Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                       <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-brand/90 premium-blur flex items-center justify-center border border-white/20 shadow-2xl">
                          <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current translate-x-0.5" />
                       </div>
                    </div>

                    {/* Poster Bottom Info */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 pb-6 md:pb-8 text-center bg-gradient-to-t from-black/98 via-black/80 to-transparent">
                        <h3 className="text-white font-black text-fluid-xs md:text-[14px] tracking-tight uppercase drop-shadow-2xl mb-1 leading-tight whitespace-normal break-words line-clamp-1">
                           {item.title}
                        </h3>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default React.memo(TopTenGrid);
