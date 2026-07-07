import React, { useEffect, useState, useRef, useCallback } from "react";
import { movieService } from "../services/movieService";
import { getAdminConfig } from "../services/firebaseService";
import { HomepageData, MediaItem } from "../types";
import Carousel from "../components/Carousel";
import PosterGrid from "../components/PosterGrid";
import TopTenGrid from "../components/TopTenGrid";
import ContinueWatchingGrid from "../components/ContinueWatchingGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../contexts/AuthContext";
import { Loader2, TrendingUp } from "lucide-react";
import { SEO } from "../components/SEO";

import { 
 HeroSkeleton, 
 ListSkeleton,
 Skeleton
} from "../components/Skeleton";
import { NoticeMessage } from "../components/NoticeMessage";
import { Link } from "react-router-dom";

// Module-level persistent cache for instant rendering when navigating back to the Home page
let cachedHomepageData: HomepageData | null = null;
let cachedTrending: MediaItem[] = [];
let cachedRanking: MediaItem[] = [];
let cachedHotMovies: MediaItem[] = [];
let cachedHotSeries: MediaItem[] = [];
let cachedDynamicSections: { title: string; items: MediaItem[]; link?: string }[] = [];
let cachedRecommendations: MediaItem[] = [];
let cachedPopularSearches: string[] = [];
let cachedDiscoverItems: MediaItem[] = [];
let cachedDiscoverPage = 1;
let cachedHasMore = true;

export default function Home() {
  const [homepageData, setHomepageData] = useState<HomepageData | null>(cachedHomepageData);
  const [trending, setTrending] = useState<MediaItem[]>(cachedTrending);
  const [ranking, setRanking] = useState<MediaItem[]>(cachedRanking);
  const [hotMovies, setHotMovies] = useState<MediaItem[]>(cachedHotMovies);
  const [hotSeries, setHotSeries] = useState<MediaItem[]>(cachedHotSeries);
  const [dynamicSections, setDynamicSections] = useState<{ title: string; items: MediaItem[]; link?: string }[]>(cachedDynamicSections);
  const [recommendations, setRecommendations] = useState<MediaItem[]>(cachedRecommendations);
  const [popularSearches, setPopularSearches] = useState<string[]>(cachedPopularSearches);
  const [loading, setLoading] = useState(!cachedHomepageData);
  const [error, setError] = useState<string | null>(null);
  const { user, history, continueWatching, watchlist } = useAuth();

  // Infinite scroll for "Discover More"
  const [discoverItems, setDiscoverItems] = useState<MediaItem[]>(cachedDiscoverItems);
  const [page, setPage] = useState(cachedDiscoverPage);
  const [hasMore, setHasMore] = useState(cachedHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => {
          const nextPage = prevPage + 1;
          cachedDiscoverPage = nextPage;
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  const loadData = async () => {
    try {
      if (!homepageData) setLoading(true);
      setError(null);
      
      const trendPage = Math.floor(Math.random() * 4) + 1;
      const [homeResult, trendResult, hotResult, popularResult, adminConfigResult, rankingResult] = await Promise.allSettled([
        movieService.getHomepage(),
        movieService.getTrending(trendPage, 30),
        movieService.getHot(),
        movieService.getPopularSearch(),
        getAdminConfig(),
        movieService.getRanking()
      ]);

      if (homeResult.status === 'fulfilled') {
 const h = homeResult.value;
 // Filter "Upcoming Calendar" section to only show recent films (year >= current year - 1)
 if (h.operatingList) {
 const currentYear = new Date().getFullYear();
 h.operatingList = h.operatingList.map((section: any) => {
 const sectionName = (section.name || section.title || '').toLowerCase();
 if (sectionName.includes('upcoming') || sectionName.includes('calendar')) {
 return {
 ...section,
 subjects: (section.subjects || []).filter((s: MediaItem) => {
 const year = parseInt(s.year || '0');
 return year >= currentYear - 1;
 })
 };
 }
 return section;
 });
 }
 setHomepageData(h);
 cachedHomepageData = h;
 }
 
 if (trendResult.status === 'fulfilled') {
 const sortedT = trendResult.value.sort(() => 0.5 - Math.random());
 setTrending(sortedT);
 cachedTrending = sortedT;
 }

 let computedHotMovies: MediaItem[] = [];
 let computedHotSeries: MediaItem[] = [];

 if (hotResult.status === 'fulfilled') {
 computedHotMovies = [...hotResult.value.movies];
 computedHotSeries = [...hotResult.value.series];
 }

 if (homeResult.status === 'fulfilled') {
 const h = homeResult.value;
 if (h.latestMovies && h.latestMovies.length > 0) {
 const latestMovieIds = new Set(h.latestMovies.map((item: any) => item.id));
 computedHotMovies = computedHotMovies.filter(item => !latestMovieIds.has(item.id));
 }
 if (h.latestSeries && h.latestSeries.length > 0) {
 const latestSeriesIds = new Set(h.latestSeries.map((item: any) => item.id));
 computedHotSeries = computedHotSeries.filter(item => !latestSeriesIds.has(item.id));
 }
 }

 if (computedHotSeries.length < 8) {
 try {
 const extraList = await movieService.browse(undefined, undefined, 2, 24, 2);
 if (extraList && extraList.length > 0) {
 let latestSeriesIds = new Set<string>();
 if (homeResult.status === 'fulfilled' && homeResult.value.latestSeries) {
 latestSeriesIds = new Set(homeResult.value.latestSeries.map((item: any) => item.id));
 }
 const extraFiltered = extraList.filter(item => !latestSeriesIds.has(item.id));
 computedHotSeries = [...computedHotSeries, ...extraFiltered];
 }
 } catch (err) {
 console.error("Failed to load extra series for hot posts", err);
 }
 }

 if (computedHotMovies.length < 8) {
 try {
 const extraList = await movieService.browse(undefined, undefined, 2, 24, 0);
 if (extraList && extraList.length > 0) {
 let latestMovieIds = new Set<string>();
 if (homeResult.status === 'fulfilled' && homeResult.value.latestMovies) {
 latestMovieIds = new Set(homeResult.value.latestMovies.map((item: any) => item.id));
 }
 const extraFiltered = extraList.filter(item => !latestMovieIds.has(item.id));
 computedHotMovies = [...computedHotMovies, ...extraFiltered];
 }
 } catch (err) {
 console.error("Failed to load extra movies for hot posts", err);
 }
 }

 const seenMovies = new Set<string>();
 computedHotMovies = computedHotMovies.filter(item => {
 if (seenMovies.has(item.id)) return false;
 seenMovies.add(item.id);
 return true;
 });

 const seenSeries = new Set<string>();
 computedHotSeries = computedHotSeries.filter(item => {
 if (seenSeries.has(item.id)) return false;
 seenSeries.add(item.id);
 return true;
 });

 const sortedM = computedHotMovies.sort(() => 0.5 - Math.random());
 const sortedS = computedHotSeries.sort(() => 0.5 - Math.random());
 setHotMovies(sortedM);
 setHotSeries(sortedS);
 cachedHotMovies = sortedM;
 cachedHotSeries = sortedS;

 if (rankingResult.status === 'fulfilled') {
 // Finalize ranking (pad if < 20)
 let finalRanking = [...rankingResult.value];
 if (finalRanking.length < 20) {
 const t = trendResult.status === 'fulfilled' ? trendResult.value : [];
 const hm = hotResult.status === 'fulfilled' ? hotResult.value.movies : [];
 const hs = hotResult.status === 'fulfilled' ? hotResult.value.series : [];
 const pool = [...hm, ...hs, ...t];
 const shuffledPool = pool.sort(() => 0.5 - Math.random());
 for (const item of shuffledPool) {
 if (finalRanking.length >= 20) break;
 if (!finalRanking.find(itemRank => itemRank.id === item.id)) {
 finalRanking.push({ ...item, type: 'Media' } as any);
 }
 }
 }
  setRanking(finalRanking.slice(0, 20).map(item => ({
    ...item,
    poster: item.poster || (item as any).cover || '',
    rating: (item as any).rating || (item as any).score || ''
  })));
 }
 
 if (popularResult.status === 'fulfilled') {
  setPopularSearches(popularResult.value);
  cachedPopularSearches = popularResult.value;
 }
 
 if (adminConfigResult.status === 'fulfilled') {
 if (adminConfigResult.value?.spotlights?.carousel?.length > 0) {
 setHomepageData(prev => ({
 ...(prev || {}),
 topPickList: adminConfigResult.value.spotlights.carousel
 }) as any);
 }
 // Update trending with admin picks if available
 if (adminConfigResult.value?.spotlights?.top10) {
 const top10 = adminConfigResult.value.spotlights.top10;
 setTrending(prev => {
 const newTrend = [...prev];
 for (let i = 0; i < 10; i++) {
 if (top10[i]) {
 if (newTrend.length > i) newTrend[i] = top10[i];
 else newTrend.push(top10[i]);
 }
 }
 return newTrend;
 });
 }
 }

 // Load 3 completely random, rotating discovery genre categories per session
 try {
 const RANDOM_GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Sci-Fi", "Thriller", "Romance", "Mystery"];
 const selectedGenres = [...RANDOM_GENRES].sort(() => 0.5 - Math.random()).slice(0, 3);
 
 const genrePromises = selectedGenres.map(async (genre) => {
 const subType = Math.random() > 0.5 ? 0 : 2; // Movies or Series randomly
 const rPage = Math.floor(Math.random() * 4) + 1;
 const results = await movieService.browse(genre, undefined, rPage, 15, subType);
 const label = subType === 0 ? "Movies" : "Series";
 return {
 title: `Featured ${genre} ${label}`,
 items: results.sort(() => 0.5 - Math.random()),
 link: `/browse?genre=${genre.toLowerCase()}&type=${subType}`
 };
 });
 
 const genResults = await Promise.allSettled(genrePromises);
 const activeSecs = genResults
 .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value?.items?.length > 0)
 .map(r => r.value);
 setDynamicSections(activeSecs);
 cachedDynamicSections = activeSecs;
 } catch (err) {
 console.error("Failed to load discovery categories", err);
 }

 const lastViewedId = localStorage.getItem('axis_last_viewed_id');
 if (lastViewedId) {
 movieService.getRecommendations(lastViewedId).then(recs => {
  setRecommendations(recs);
  cachedRecommendations = recs;
 }).catch(() => {});
 }

 if (discoverItems.length === 0) {
 movieService.browse(undefined, "2", 1).then(discover => {
 setDiscoverItems(discover);
 cachedDiscoverItems = discover;
 setHasMore(discover.length > 0);
 cachedHasMore = discover.length > 0;
 }).catch(() => {});
 }
 } catch (err) {
 console.error("Error loading homepage:", err);
 // Give a more user-friendly 'slow/no internet' message
 setError("It looks like you have a slow or no internet connection. Please try again.");
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
 // Prioritize series (type 2) for discovery as requested
 const data = await movieService.browse(undefined, "2", page);
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

  // Determine carousel items (10 items: 5 from top 5 topPickList/ranking, and 5 random movies/series)
  const [carouselItems, setCarouselItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (loading) return;

    // Build unique list of all content (ranking, hotMovies, hotSeries, etc.)
    const allUniquePool: MediaItem[] = [];
    const seenIds = new Set<string>();

    const addToPool = (arr: MediaItem[]) => {
      if (!arr) return;
      for (const item of arr) {
        if (item && item.id && !seenIds.has(item.id)) {
          seenIds.add(item.id);
          allUniquePool.push(item);
        }
      }
    };

    if (homepageData?.topPickList) addToPool(homepageData.topPickList);
    addToPool(ranking);
    addToPool(hotMovies);
    addToPool(hotSeries);

    // 1. Get 5 from the top 5
    let top5: MediaItem[] = [];
    if (homepageData?.topPickList && homepageData.topPickList.length >= 5) {
      top5 = homepageData.topPickList.slice(0, 5);
    } else {
      // Fallback: take first 5 unique items from the union pool (which starts with ranking)
      top5 = allUniquePool.slice(0, 5);
    }

    // 2. Pick 5 random items from the remaining unique list
    const top5Ids = new Set(top5.map(item => item.id));
    const remainingPool = allUniquePool.filter(item => !top5Ids.has(item.id));
    
    // Sort randomly
    const randomItems = [...remainingPool].sort(() => 0.5 - Math.random());
    const random5 = randomItems.slice(0, 5);

    // Combine to exactly 10 items
    const combined10 = [...top5, ...random5].slice(0, 10);
    setCarouselItems(combined10);
  }, [loading, ranking, hotMovies, hotSeries, homepageData]);

 if (loading) {
 return (
 <div className="min-h-screen bg-transparent text-white pb-20">
 <Navbar />
 <HeroSkeleton />
 <div className="relative z-10 -mt-fluid-sm md:-mt-24 space-y-12 md:space-y-24 pb-20 max-w-[1400px] mx-auto px-fluid">
 <div className="space-y-6"><Skeleton className="h-8 w-48" /><ListSkeleton count={6} /></div>
 <div className="space-y-6"><ListSkeleton count={6} /></div>
 <div className="space-y-6"><ListSkeleton count={6} /></div>
 </div>
 </div>
 );
 }

 if (error) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
 <NoticeMessage message={error} onRetry={loadData} />
 </div>
 );
 }

 // Build list of active homepage elements dynamically to support clean separators
 const activeSections: React.ReactNode[] = [];

 if (user && watchlist.length > 0) {
   activeSections.push(
     <PosterGrid key="watchlist" title="My Watchlist" items={watchlist} viewAllLink="/profile" />
   );
 }

 if (user && continueWatching.length > 0) {
   activeSections.push(
     <ContinueWatchingGrid key="continue-watching" title="Continue Watching" items={continueWatching} />
   );
 }

 if (ranking.length > 0) {
   activeSections.push(
     <TopTenGrid key="top10" title="Top 10 on Axis TV" items={ranking.slice(0, 10)} />
   );
 }

 if (trending.length > 6) {
   activeSections.push(
     <PosterGrid key="trending" title="Trending Now" items={trending.slice(6)} />
   );
 }

 if (recommendations.length > 0) {
   activeSections.push(
     <PosterGrid key="recommendations" title="Because You Watched" items={recommendations} />
   );
 }

 if (popularSearches.length > 0) {
   activeSections.push(
     <div key="popular-searches" className="max-w-[1400px] mx-auto px-fluid py-2.5 md:py-4 relative z-10 animate-fade-in">
       <div className="flex items-center justify-between mb-3 md:mb-5 px-1">
         <div className="flex items-center gap-2">
           <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-[#F5F5F7]" />
           <h2 className="text-sm md:text-base font-semibold tracking-tight text-[#F5F5F7]">
             Popular Searches
           </h2>
         </div>
       </div>
       <div className="flex flex-wrap gap-2">
         {Array.isArray(popularSearches) && popularSearches.slice(0, 12).map((search, idx) => (
           <Link 
             key={idx} 
             to={`/search?q=${encodeURIComponent(search)}`}
             className="px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/15 transition-all duration-300 shadow-md group active:scale-95 text-[10px] md:text-xs font-semibold tracking-wide"
           >
             <span className="text-white/70 group-hover:text-white transition-colors">{search}</span>
           </Link>
         ))}
       </div>
     </div>
   );
 }

 if (homepageData?.latestSeries && homepageData.latestSeries.length > 0) {
   activeSections.push(
     <PosterGrid key="latest" title="Latest Featured" items={homepageData.latestSeries} viewAllLink="/browse?type=2" />
   );
 }

 if (hotSeries.length > 0) {
   activeSections.push(
     <PosterGrid key="hot" title="Hot Picks" items={hotSeries} viewAllLink="/series" />
   );
 }

 dynamicSections.forEach((section, idx) => {
   activeSections.push(
     <PosterGrid 
       key={`dyn-${section.title}-${idx}`}
       title={section.title} 
       items={section.items} 
       viewAllLink={section.link}
     />
   );
 });

 homepageData?.operatingList?.forEach((section: any, idx: number) => {
   activeSections.push(
     <PosterGrid 
       key={`op-${section.name || section.title}-${idx}`}
       title={section.name || section.title} 
       items={section.subjects || []} 
     />
   );
 });

 // Discover More Section with Infinite Scroll as the final element
 activeSections.push(
   <div key="discover" className="space-y-6">
     <PosterGrid title="Discover More" items={discoverItems} variant="grid" />
     
     {hasMore && (
       <div ref={lastElementRef} className="flex justify-center py-6">
         {loadingMore && (
           <Loader2 className="w-6 h-6 text-brand animate-spin" />
         )}
       </div>
     )}
   </div>
 );

 return (
 <div className="min-h-screen bg-transparent text-white pb-10 md:pb-20">
 <SEO />
 
 {/* Hidden H1 for SEO */}
 <h1 className="sr-only">Axis TV — Your Movie Plug</h1>

 <Navbar />
 
 <Carousel items={carouselItems} />
 
 <div className="relative z-10 -mt-fluid md:-mt-24 space-y-4 md:space-y-6 pb-10 md:pb-24">
   {activeSections.map((section, idx) => (
     <React.Fragment key={idx}>
       {idx > 0 && (
         <div className="max-w-[1400px] mx-auto px-fluid py-2 md:py-3 relative z-10">
           <div className="h-[1px] bg-gradient-to-r from-transparent via-white/[0.08] to-transparent shadow-[0_1px_3px_rgba(255,255,255,0.02)]" />
         </div>
       )}
       {section}
     </React.Fragment>
   ))}
 </div>

 <Footer />
 </div>
 );
}
