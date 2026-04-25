import { useEffect, useState, useRef, useCallback } from "react";
import { movieService } from "../services/movieService";
import { HomepageData, MediaItem } from "../types";
import Carousel from "../components/Carousel";
import PosterGrid from "../components/PosterGrid";
import TopTenGrid from "../components/TopTenGrid";
import ContinueWatchingGrid from "../components/ContinueWatchingGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { SEO } from "../components/SEO";

import { 
  HeroSkeleton, 
  ListSkeleton,
  Skeleton
} from "../components/Skeleton";
import { ErrorMessage } from "../components/ErrorMessage";
import { Link } from "react-router-dom";

export default function Home() {
  const [homepageData, setHomepageData] = useState<HomepageData | null>(null);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [hotMovies, setHotMovies] = useState<MediaItem[]>([]);
  const [hotSeries, setHotSeries] = useState<MediaItem[]>([]);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, history, continueWatching, watchlist } = useAuth();

  // Infinite scroll for "Discover More"
  const [discoverItems, setDiscoverItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  const loadData = async () => {
    try {
      if (!homepageData) setLoading(true);
      setError(null);
      
      const [home, trend, hot, popular] = await Promise.all([
        movieService.getHomepage(),
        movieService.getTrending(),
        movieService.getHot(),
        movieService.getPopularSearch()
      ]);

      setHomepageData(home);
      setTrending(trend);
      setHotMovies(hot.movies);
      setHotSeries(hot.series);
      setPopularSearches(popular);

      const lastViewedId = localStorage.getItem('axis_last_viewed_id');
      if (lastViewedId) {
        try {
          const recs = await movieService.getRecommendations(lastViewedId);
          setRecommendations(recs);
        } catch (e) {
          console.error("Failed to load recommendations", e);
        }
      }

      // Initial discover items
      if (discoverItems.length === 0) {
        try {
          const discover = await movieService.browse(undefined, undefined, 1);
          setDiscoverItems(discover);
          setHasMore(discover.length > 0);
        } catch (e) {
          console.error("Failed to load discover items", e);
        }
      }
    } catch (err) {
      console.error("Error loading homepage:", err);
      setError("Failed to load content. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (page === 1 || !hasMore) return;

    const loadMore = async () => {
      try {
        setLoadingMore(true);
        const data = await movieService.browse(undefined, undefined, page);
        if (data.length === 0) {
          setHasMore(false);
        } else {
          setDiscoverItems(prev => [...prev, ...data]);
        }
      } catch (err) {
        console.error("Error loading more discover items:", err);
      } finally {
        setLoadingMore(false);
      }
    };

    loadMore();
  }, [page, hasMore]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white pb-20">
        <Navbar />
        <HeroSkeleton />
        <div className="relative z-10 -mt-fluid-sm md:-mt-20 space-y-12 md:space-y-20 pb-20 max-w-[1400px] mx-auto px-fluid">
          <div className="space-y-6"><Skeleton className="h-8 w-48" /><ListSkeleton count={6} /></div>
          <div className="space-y-6"><ListSkeleton count={6} /></div>
          <div className="space-y-6"><ListSkeleton count={6} /></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <ErrorMessage message={error} onRetry={loadData} />
      </div>
    );
  }

  const carouselItems = trending.slice(0, 6);

  return (
    <div className="min-h-screen bg-black text-white pb-10 md:pb-20">
      <SEO />
      
      {/* Hidden H1 for SEO */}
      <h1 className="sr-only">Axis TV — Watch Movies and Series Online</h1>

      <Navbar />
      
      <Carousel items={carouselItems} />
      
      <div className="relative z-10 -mt-fluid md:-mt-20 space-y-fluid md:space-y-20 pb-10 md:pb-20">
        {user && watchlist.length > 0 && (
          <PosterGrid title="My Watchlist" items={watchlist} viewAllLink="/profile" />
        )}

        {user && continueWatching.length > 0 && (
          <ContinueWatchingGrid title="Continue Watching" items={continueWatching} />
        )}

        {trending.length > 0 && (
          <TopTenGrid title="Top 10 in AXIS TV" items={trending.slice(6, 16)} />
        )}

        {recommendations.length > 0 && (
          <PosterGrid title="Because You Watched" items={recommendations} />
        )}

        {popularSearches.length > 0 && (
          <div className="px-fluid">
            <h2 className="text-fluid-lg md:text-2xl font-bold mb-4 md:mb-6 tracking-tight">Popular Searches</h2>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {Array.isArray(popularSearches) && popularSearches.slice(0, 10).map((search, idx) => (
                <Link 
                  key={idx} 
                  to={`/search?q=${encodeURIComponent(search)}`}
                  className="px-3.5 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-brand hover:text-white border border-white/10 hover:border-brand rounded-full text-[11px] md:text-sm transition-all shadow-sm hover:shadow-[0_0_15px_rgba(229,9,20,0.4)]"
                >
                  {search}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {homepageData?.latestMovies && homepageData.latestMovies.length > 0 && (
          <PosterGrid title="Latest Movies" items={homepageData.latestMovies} viewAllLink="/browse?type=1" />
        )}
        
        {homepageData?.latestSeries && homepageData.latestSeries.length > 0 && (
          <PosterGrid title="Latest Series" items={homepageData.latestSeries} viewAllLink="/browse?type=2" />
        )}
        
        {hotMovies.length > 0 && (
          <PosterGrid title="Hot Movies" items={hotMovies} viewAllLink="/movies" />
        )}
        
        {hotSeries.length > 0 && (
          <PosterGrid title="Hot Series" items={hotSeries} viewAllLink="/series" />
        )}

        {homepageData?.operatingList?.map((section: any, idx: number) => (
          <div key={`${section.name || section.title}-${idx}`}>
            <PosterGrid 
              title={section.name || section.title} 
              items={section.subjects || []} 
            />
          </div>
        ))}

        {/* Discover More Section with Infinite Scroll */}
        <div className="space-y-8">
          <PosterGrid title="Discover More" items={discoverItems} variant="grid" />
          
          {hasMore && (
            <div ref={lastElementRef} className="flex justify-center py-10">
              {loadingMore && (
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
