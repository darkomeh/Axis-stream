import React, { useState, useEffect, useRef, useCallback } from "react";
import { MediaItem } from "../types";
import { movieService } from "../services/movieService";
import { MovieImage } from "./MovieImage";
import { Star, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { motion } from "motion/react";

interface BrowseGenreRowProps {
  genreId: string;
  genreName: string;
  subjectType: number; // 1 for Movies, 2 for Series
}

export default function BrowseGenreRow({ genreId, genreName, subjectType }: BrowseGenreRowProps) {
  const { openPreview } = useMediaPreview();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const rowObserver = useRef<IntersectionObserver | null>(null);

  // Load the initial page
  useEffect(() => {
    let active = true;
    const fetchFirstPage = async () => {
      try {
        setLoading(true);
        const data = await movieService.browse(genreId, undefined, 1, 15, subjectType);
        if (active) {
          setItems(data);
          setHasMore(data.length >= 10); // if we got at least 10 items, there might be more
        }
      } catch (err) {
        console.error(`Failed to load genre ${genreId}:`, err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFirstPage();
    return () => {
      active = false;
    };
  }, [genreId, subjectType]);

  // Load subsequent pages when user reaches near the end of the scroll list
  const loadNextPage = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const data = await movieService.browse(genreId, undefined, nextPage, 15, subjectType);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
          // Prevent duplicates
          const existingIds = new Set(prev.map((item) => item.id));
          const union = [...prev];
          data.forEach((item) => {
            if (!existingIds.has(item.id)) {
              union.push(item);
            }
          });
          return union;
        });
        setPage(nextPage);
        setHasMore(data.length >= 10);
      }
    } catch (err) {
      console.error(`Failed to load page ${page + 1} for genre ${genreId}:`, err);
    } finally {
      setLoadingMore(false);
    }
  }, [genreId, page, subjectType, loading, loadingMore, hasMore]);

  // Set up intersection observer inside the horizontal scrollbar
  const endTrackerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore || !hasMore) return;
      if (rowObserver.current) rowObserver.current.disconnect();

      rowObserver.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadNextPage();
          }
        },
        {
          root: scrollContainerRef.current,
          rootMargin: "0px 400px 0px 0px", // prefetch when user scrolls within 400px of the right end
        }
      );

      if (node) rowObserver.current.observe(node);
    },
    [loading, loadingMore, hasMore, loadNextPage]
  );

  useEffect(() => {
    return () => {
      if (rowObserver.current) rowObserver.current.disconnect();
    };
  }, []);

  const handleScroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!loading && items.length === 0) return null;

  return (
    <div className="relative group/row mb-10 md:mb-14">
      {/* Genre Header */}
      <div className="flex items-center gap-3 mb-4 md:mb-6 px-1">
        <div className="w-1 h-6 bg-brand rounded-full" />
        <h2 className="text-fluid-lg md:text-fluid-xl font-bold tracking-tight text-white capitalize">
          {genreName.toLowerCase() === "trending" 
            ? "Trending Now" 
            : `${genreName} ${subjectType === 1 ? "Movies" : subjectType === 2 ? "Series" : "Movies & Series"}`}
        </h2>
      </div>

      {/* Slide Container Area */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => handleScroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-black/90 active:scale-90 transition-all opacity-0 group-hover/row:opacity-100 hidden md:flex items-center justify-center cursor-pointer shadow-lg"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Horizontal Scroll Track */}
        <div
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-4 py-2 px-1 snap-x snap-mandatory no-scrollbar scroll-smooth"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {loading ? (
            // Mini Loading Shimmer skeletons
            Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="flex-none w-[34vw] sm:w-[150px] md:w-[180px] lg:w-[200px] aspect-[2/3] rounded-2xl md:rounded-3xl bg-white/5 animate-pulse border border-white/5"
              />
            ))
          ) : (
            <>
              {items.map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  className="flex-none w-[34vw] sm:w-[150px] md:w-[180px] lg:w-[200px] snap-start"
                >
                  <motion.div
                    role="button"
                    tabIndex={0}
                    onClick={() => openPreview(item.id)}
                    whileHover={{ scale: 1.04, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative block aspect-[2/3] rounded-[18px] md:rounded-[24px] overflow-hidden bg-white/5 group border border-white/10 hover:border-white/20 hover:shadow-[0_12px_24px_rgba(255,45,45,0.08)] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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

                    {/* Dark gradient overlap */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Rating badge */}
                    {item.rating && (
                      <div className="absolute top-2 right-2 z-20">
                        <div className="px-1.5 md:px-2 py-0.5 md:py-0.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-1 shadow-md">
                          <Star className="w-2.5 h-2.5 text-white fill-white" />
                          <span className="font-bold text-white text-[10px] md:text-xs">
                            {item.rating}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Standard details info on the poster card */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 pt-6 md:pt-8 flex flex-col justify-end">
                      <h3 className="text-white font-semibold leading-tight mb-0.5 line-clamp-2 text-fluid-xs md:text-fluid-base group-hover:text-brand transition-colors">
                        {item.title}
                      </h3>
                      <div className="flex items-center justify-between font-medium text-white/50 text-[10px] md:text-xs">
                        <span>{item.year || "2024"}</span>
                        <span>
                          {item.type == 2 || item.type === "Series" ? "Series" : "Movie"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}

              {/* End Of Row detector to lazyload next page */}
              {hasMore && (
                <div
                  ref={endTrackerRef}
                  className="flex-none w-[100px] flex flex-col items-center justify-center gap-2 text-white/40"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-brand" />
                      <span className="text-[10px] font-bold tracking-wider">LOADING...</span>
                    </>
                  ) : (
                    <span className="text-[10px] font-bold tracking-wider">PULL TO LOAD</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-2.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-white/70 hover:text-white hover:bg-black/90 active:scale-90 transition-all opacity-0 group-hover/row:opacity-100 hidden md:flex items-center justify-center cursor-pointer shadow-lg"
        >
          <ChevronRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
