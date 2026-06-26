import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import TopTenGrid from "../components/TopTenGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { NoticeMessage } from "../components/NoticeMessage";
import { SEO } from "../components/SEO";
import { Filter, ChevronDown, X, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BrowseGenreRow from "../components/BrowseGenreRow";

const GENRES = [
 { id: "", name: "All Genres" },
 { id: "action", name: "Action" },
 { id: "adventure", name: "Adventure" },
 { id: "animation", name: "Animation" },
 { id: "biography", name: "Biography" },
 { id: "comedy", name: "Comedy" },
 { id: "crime", name: "Crime" },
 { id: "documentary", name: "Documentary" },
 { id: "drama", name: "Drama" },
 { id: "family", name: "Family" },
 { id: "fantasy", name: "Fantasy" },
 { id: "history", name: "History" },
 { id: "horror", name: "Horror" },
 { id: "music", name: "Music" },
 { id: "musical", name: "Musical" },
 { id: "mystery", name: "Mystery" },
 { id: "romance", name: "Romance" },
 { id: "sci-fi", name: "Sci-Fi" },
 { id: "sport", name: "Sport" },
 { id: "thriller", name: "Thriller" },
 { id: "war", name: "War" },
 { id: "western", name: "Western" },
];

const COUNTRIES = [
 { id: "", name: "All Countries" },
 { id: "us", name: "USA" },
 { id: "gb", name: "UK" },
 { id: "cn", name: "China" },
 { id: "kr", name: "Korea" },
 { id: "jp", name: "Japan" },
 { id: "fr", name: "France" },
 { id: "de", name: "Germany" },
 { id: "it", name: "Italy" },
 { id: "es", name: "Spain" },
 { id: "in", name: "India" },
 { id: "ca", name: "Canada" },
 { id: "au", name: "Australia" },
 { id: "br", name: "Brazil" },
 { id: "ru", name: "Russia" },
 { id: "mx", name: "Mexico" },
 { id: "ng", name: "Nigeria" },
 { id: "th", name: "Thailand" },
 { id: "tr", name: "Turkey" },
];

const TYPES = [
 { id: "0", name: "All Types" },
 { id: "1", name: "Movies" },
 { id: "2", name: "Series" },
];

import { ListSkeleton } from "../components/Skeleton";

export default function Browse() {
 const [searchParams, setSearchParams] = useSearchParams();
 const location = useLocation();
 const navigate = useNavigate();
 
 let pathType = "0";
 if (location.pathname === "/movies" || location.pathname === "/movie") pathType = "1";
 if (location.pathname === "/series") pathType = "2";
 
 const initialType = searchParams.get("type") || pathType;
 const typeVal = parseInt(initialType) > 0 ? initialType : 1;
 const initialCacheKey = `-${typeVal}-20`;

 const [items, setItems] = useState<MediaItem[]>([]);
 const [trending, setTrending] = useState<MediaItem[]>([]);
 const [hot, setHot] = useState<MediaItem[]>([]);
 const [loading, setLoading] = useState(true);
 const [loadingMore, setLoadingMore] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [page, setPage] = useState(1);
 const [hasMore, setHasMore] = useState(true);

 const [selectedGenre, setSelectedGenre] = useState("");
 const [selectedCountry, setSelectedCountry] = useState("");
 const [selectedType, setSelectedType] = useState(initialType);

 const isMoviePage = location.pathname === "/movies" || location.pathname === "/movie";
 const isSeriesPage = location.pathname === "/series";
 const isRestrictedView = isMoviePage || isSeriesPage;

 const activeGenres = GENRES.filter(g => g.id !== "");
 const showHorizontalSlices = !selectedGenre && !selectedCountry && (isMoviePage || isSeriesPage || selectedType === "1" || selectedType === "2");

 const [visibleGenresCount, setVisibleGenresCount] = useState(4);
 const bottomObserver = useRef<IntersectionObserver | null>(null);

 const bottomTrackerRef = useCallback((node: HTMLDivElement | null) => {
  if (bottomObserver.current) bottomObserver.current.disconnect();
  bottomObserver.current = new IntersectionObserver((entries) => {
   if (entries[0].isIntersecting && visibleGenresCount < activeGenres.length) {
    setVisibleGenresCount(prev => Math.min(prev + 3, activeGenres.length));
   }
  }, {
   rootMargin: "400px"
  });
  if (node) bottomObserver.current.observe(node);
 }, [visibleGenresCount, activeGenres.length]);
 
 // Sync selectedType when route changes (e.g. Navigating between /movies and /series)
 useEffect(() => {
  if (isMoviePage) {
   setSelectedType("1");
  } else if (isSeriesPage) {
   setSelectedType("2");
  } else {
   setSelectedType(initialType);
  }
 }, [initialType, isMoviePage, isSeriesPage]);

 const [showFilters, setShowFilters] = useState(false);
 const observer = useRef<IntersectionObserver | null>(null);

 const lastElementRef = useCallback((node: HTMLDivElement) => {
 if (loading || loadingMore) return;
 if (observer.current) observer.current.disconnect();
 
 observer.current = new IntersectionObserver(entries => {
 if (entries[0].isIntersecting && hasMore) {
 setPage(prevPage => prevPage + 1);
 }
 });
 
 if (node) observer.current.observe(node);
 }, [loading, loadingMore, hasMore]);

 useEffect(() => {
  const trendPage = Math.floor(Math.random() * 4) + 1;
  movieService.getTrending(trendPage).then(data => setTrending(data.sort(() => 0.5 - Math.random()))).catch(console.error);
  movieService.getHot().then(data => setHot([...data.movies, ...data.series].sort(() => 0.5 - Math.random()))).catch(console.error);
 }, []);

 useEffect(() => {
  if (!showHorizontalSlices) {
   setPage(1);
   loadItems(1, true);
  } else {
   setLoading(false);
  }
 }, [selectedGenre, selectedCountry, selectedType, showHorizontalSlices]);

 useEffect(() => {
  if (page > 1 && !showHorizontalSlices) {
   loadItems(page, false);
  }
 }, [page, showHorizontalSlices]);

 const handleBack = () => {
 if (window.history.length > 2) {
 navigate(-1);
 } else {
 navigate('/');
 }
 };

 const loadItems = async (p: number, reset: boolean = false) => {
 try {
 if (reset) {
 if (items.length === 0) setLoading(true);
 setError(null);
 } else {
 setLoadingMore(true);
 }
 
 const type = parseInt(selectedType);
 const data = await movieService.browse(
 selectedGenre || undefined,
 selectedCountry || undefined,
 p,
 20,
 type > 0 ? type : 1
 );
 
 if (reset) {
 setItems(data);
 } else {
 setItems(prev => [...prev, ...data]);
 }
 setHasMore(data.length > 0);
 } catch (e) {
 console.error("Failed to load browse items", e);
 if (reset) {
 setError("Failed to load content. Please check your internet connection.");
 }
 } finally {
 setLoading(false);
 setLoadingMore(false);
 }
 };

 return (
 <div className="min-h-screen bg-transparent text-white pb-20 relative overflow-hidden">
 <SEO 
 title={`${selectedGenre || 'Discover'} Movies & Series`}
 description={`Browse our extensive catalog of ${selectedGenre || ''} movies and series on Axis TV. Filter by genre, country, and type to find your next favorite watch.`}
 url="/browse"
 />
 {/* Background Poster Collage (Subtle) */}
 <div className="fixed inset-0 z-0 opacity-10 blur-[80px] pointer-events-none">
 <img 
 src="https://picsum.photos/seed/movie-collage/1920/1080?blur=10" 
 alt="background" 
 className="w-full h-full object-cover"
 loading="lazy"
 referrerPolicy="no-referrer"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
 </div>

 <Navbar />
 
 <div className="relative z-10 pt-28 px-4 sm:px-6 lg:px-12 max-w-[1400px] mx-auto">
 <motion.button 
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 onClick={handleBack}
 className="mb-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all flex items-center gap-2 text-gray-400 hover:text-white group border border-white/5"
 >
 <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
 <span className="text-fluid-xs font-semibold tracking-wide">Back</span>
 </motion.button>

 <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
 <motion.div
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex-1"
 >
 <h1 className="text-fluid-3xl font-semibold mb-2 sm:mb-4 tracking-tight leading-none " style={{ WebkitTextStroke: '1px rgba(255,255,255,0.1)' }}>
 Browse <span className="text-brand">{selectedType === "1" ? "Movies" : selectedType === "2" ? "Series" : "All"}</span>
 </h1>
 <p className="text-gray-500 font-bold tracking-wide text-fluid-sm">Curated Excellence • Global Cinema • Unlimited Access</p>
 </motion.div>

 <div className="flex flex-col gap-4">
 <button 
 onClick={() => setShowFilters(!showFilters)}
 className={`flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 border rounded-full transition-all group ${showFilters ? 'bg-brand/20 border-brand text-brand' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'}`}
 >
 <Filter className={`w-4 h-4 transition-transform ${showFilters ? 'scale-110' : ''}`} />
 <span className="font-semibold tracking-wide text-fluid-xs">Refine Content</span>
 <ChevronDown className={`w-4 h-4 transition-transform duration-500 ${showFilters ? 'rotate-180' : ''}`} />
 </button>
 </div>
 </div>

 <div className="hidden md:flex items-center gap-4 lg:gap-6 p-4 bg-white/5 backdrop-blur-3xl border border-white/5 rounded-3xl mb-12 flex-wrap">
 <div className="flex items-center gap-3 px-4 py-2 border-r border-white/10">
 <span className="text-fluid-sm font-semibold tracking-wide text-gray-500">Filter By:</span>
 </div>
 
 <div className="flex-1 flex items-center gap-4">
 {!isRestrictedView && (
  <>
   <div className="relative group">
   <select 
   value={selectedType}
   onChange={(e) => setSelectedType(e.target.value)}
   className="bg-transparent text-white rounded-xl px-4 py-2 focus:outline-none cursor-pointer hover:text-brand transition-colors font-semibold tracking-wide text-fluid-xs appearance-none pr-8"
   >
   {TYPES.map(t => <option key={t.id} value={t.id} className="bg-[#141414]">{t.name}</option>)}
   </select>
   <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
   </div>

   <div className="w-px h-6 bg-white/10" />
  </>
 )}

 <div className="relative group">
 <select 
 value={selectedGenre}
 onChange={(e) => setSelectedGenre(e.target.value)}
 className="bg-transparent text-white rounded-xl px-4 py-2 focus:outline-none cursor-pointer hover:text-brand transition-colors font-semibold tracking-wide text-fluid-xs appearance-none pr-8"
 >
 {GENRES.map(g => <option key={g.id} value={g.id} className="bg-[#141414]">{g.name}</option>)}
 </select>
 <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
 </div>

 <div className="w-px h-6 bg-white/10" />

 <div className="relative group">
 <select 
 value={selectedCountry}
 onChange={(e) => setSelectedCountry(e.target.value)}
 className="bg-transparent text-white rounded-xl px-4 py-2 focus:outline-none cursor-pointer hover:text-brand transition-colors font-semibold tracking-wide text-fluid-xs appearance-none pr-8"
 >
 {COUNTRIES.map(c => <option key={c.id} value={c.id} className="bg-[#141414]">{c.name}</option>)}
 </select>
 <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
 </div>
 </div>
 
 {(selectedGenre || selectedCountry || (!isRestrictedView && selectedType !== "0")) && (
 <motion.button
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 onClick={() => {
 setSelectedGenre("");
 setSelectedCountry("");
 if (!isRestrictedView) {
  setSelectedType("0");
 }
 }}
 className="px-6 py-2.5 bg-brand/10 border border-brand/20 text-brand rounded-full text-fluid-sm font-semibold tracking-wide hover:bg-brand hover:text-white transition-all shadow-[0_0_15px_rgba(255,45,45,0.2)]"
 >
 Reset Filters
 </motion.button>
 )}
 </div>

 <AnimatePresence>
 {showFilters && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="md:hidden overflow-hidden mb-8 p-6 bg-white/5 border border-white/5 rounded-3xl space-y-8"
 >
 <div className="grid grid-cols-1 gap-8">
 {!isRestrictedView && (
  <div className="space-y-4">
  <label className="text-fluid-sm font-semibold tracking-[0.3em] text-gray-500">Pick Type</label>
  <div className="flex flex-wrap gap-2">
  {TYPES.map(t => (
  <button
  key={t.id}
  onClick={() => setSelectedType(t.id)}
  className={`px-5 py-2.5 rounded-full text-fluid-sm font-semibold transition-all tracking-wide ${selectedType === t.id ? 'bg-brand text-white shadow-[0_0_20px_rgba(255,45,45,0.4)]' : 'bg-white/5 border border-white/5 text-gray-500 hover:bg-white/10'}`}
  >
  {t.name}
  </button>
  ))}
  </div>
  </div>
 )}
 <div className="space-y-4">
 <label className="text-fluid-sm font-semibold tracking-[0.3em] text-gray-500">Categories</label>
 <div className="flex flex-wrap gap-2">
 {GENRES.slice(0, 8).map(g => (
 <button
 key={g.id}
 onClick={() => setSelectedGenre(g.id)}
 className={`px-5 py-2.5 rounded-full text-fluid-sm font-semibold transition-all tracking-wide ${selectedGenre === g.id ? 'bg-brand text-white shadow-[0_0_20px_rgba(255,45,45,0.4)]' : 'bg-white/5 border border-white/5 text-gray-500 hover:bg-white/10'}`}
 >
 {g.name}
 </button>
 ))}
 </div>
 </div>
 
 {(selectedGenre || selectedCountry || (!isRestrictedView && selectedType !== "0")) && (
 <button
 onClick={() => {
 setSelectedGenre("");
 setSelectedCountry("");
 if (!isRestrictedView) {
  setSelectedType("0");
 }
 setShowFilters(false);
 }}
 className="w-full py-4 bg-brand text-white rounded-2xl text-fluid-xs font-semibold tracking-wide shadow-xl glow-brand animate-pulse-subtle"
 >
 Apply & Reset
 </button>
 )}
 </div>
 </motion.div>
 )}
 </AnimatePresence>

 {!selectedGenre && !selectedCountry && selectedType === "0" && hot.length > 0 && (
 <div className="-mx-6 lg:-mx-12 mb-20">
 <TopTenGrid title="Top Content on Axis TV" items={hot.slice(0, 10)} />
 </div>
 )}

 {error ? (
 <div className="py-20">
 <NoticeMessage message={error} onRetry={() => loadItems(1, true)} />
 </div>
 ) : (
  showHorizontalSlices ? (
   <div className="space-y-4">
    {activeGenres.slice(0, visibleGenresCount).map((g) => (
     <BrowseGenreRow
      key={g.id}
      genreId={g.id}
      genreName={g.name}
      subjectType={isMoviePage || selectedType === "1" ? 1 : 2}
     />
    ))}
    {visibleGenresCount < activeGenres.length && (
     <div ref={bottomTrackerRef} className="py-12 flex flex-col justify-center items-center gap-2">
      <Loader2 className="w-8 h-8 animate-spin text-brand" />
      <span className="text-fluid-xs font-bold text-gray-500 tracking-wider">
       DISCOVERING MORE CATEGORIES...
      </span>
     </div>
    )}
   </div>
  ) : (
   <div className="space-y-16">
   <div className="flex items-center gap-4 mb-4">
   <div className="w-1 h-8 bg-brand rounded-full" />
   <h2 className="text-fluid-2xl font-semibold tracking-tight">Recommended Gallery</h2>
   </div>
   
   <PosterGrid items={items} loading={loading} variant="grid" />
   
   {hasMore && (
   <div ref={lastElementRef} className="flex justify-center pt-16 h-40">
   {loadingMore && (
   <div className="flex flex-col items-center gap-4 text-brand">
   <Loader2 className="w-10 h-10 animate-spin" />
   <span className="text-fluid-sm font-semibold tracking-wide">Sycing Archive...</span>
   </div>
   )}
   </div>
   )}
   </div>
  )
 )}
 </div>

 <Footer />
 </div>
 );
}
