import React, { useState, useEffect, useRef, useCallback } from "react";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import PopcornLoader from "../components/PopcornLoader";
import { 
 Search as SearchIcon, X, TrendingUp, ArrowLeft, Loader2, Filter, 
 Clock, History, ArrowUpRight, User, Menu, Play, Sparkles, 
 Smile, Theater, Rocket, Ghost, Heart
} from "lucide-react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { processSearchResults, ScoredMediaItem } from "../lib/searchUtils";

const GENRE_CARDS = [
 { 
 name: "Action", 
 icon: Sparkles, 
 color: "bg-red-600/20 text-red-500"
 },
 { 
 name: "Comedy", 
 icon: Smile, 
 color: "bg-yellow-500/20 text-yellow-500"
 },
 { 
 name: "Drama", 
 icon: Theater, 
 color: "bg-purple-600/20 text-purple-500"
 },
 { 
 name: "Sci-Fi", 
 icon: Rocket, 
 color: "bg-blue-600/20 text-blue-500"
 },
 { 
 name: "Horror", 
 icon: Ghost, 
 color: "bg-gray-600/20 text-gray-400"
 },
 { 
 name: "Romance", 
 icon: Heart, 
 color: "bg-rose-500/20 text-rose-500"
 },
];

export default function Search() {
 const [searchParams, setSearchParams] = useSearchParams();
 const navigate = useNavigate();
 const { setLastActionType, user } = useAuth();
 const initialQuery = searchParams.get("q") || "";
 
 const [query, setQuery] = useState(initialQuery);
 const [results, setResults] = useState<ScoredMediaItem[]>([]);
 const [popularSearches, setPopularSearches] = useState<string[]>([]);
 const [searchHistory, setSearchHistory] = useState<string[]>([]);
 const [suggestions, setSuggestions] = useState<string[]>([]);
 const [isFocused, setIsFocused] = useState(false);
 const [loading, setLoading] = useState(false);
 const [loadingMore, setLoadingMore] = useState(false);
 const [page, setPage] = useState(1);
 const [hasMore, setHasMore] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeCategory, setActiveCategory] = useState<string>("All");
 const [searchType, setSearchType] = useState<'keyword' | 'genre'>('keyword');
 const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
 const inputRef = useRef<HTMLInputElement>(null);
 const suggestionsRef = useRef<HTMLDivElement>(null);
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

 const resultCategories = ["All", "Movies", "Series", "Anime"];

 const handleBack = () => {
 if (window.history.length > 2) {
 navigate(-1);
 } else {
 navigate('/');
 }
 };

 useEffect(() => {
 // Focus input on mount
 inputRef.current?.focus();
 
 // Load popular searches
 movieService.getPopularSearch()
 .then(setPopularSearches)
 .catch(console.error);

 // Load search history
 try {
 const history = JSON.parse(localStorage.getItem('axis_search_history') || '[]');
 setSearchHistory(history);
 } catch (e) {}

 // Click outside to close suggestions
 const handleClickOutside = (event: MouseEvent) => {
 if (
 suggestionsRef.current && 
 !suggestionsRef.current.contains(event.target as Node) &&
 inputRef.current &&
 !inputRef.current.contains(event.target as Node)
 ) {
 setIsFocused(false);
 }
 };

 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);

 useEffect(() => {
 if (!query.trim()) {
 setSuggestions([]);
 setResults([]);
 setSearchParams({});
 return;
 }

 const delayDebounceFn = setTimeout(() => {
 setSearchParams({ q: query });
 setPage(1);
 // If we are already in genre mode and the query matches the selected genre, don't reset
 if (searchType === 'genre' && query === selectedGenre) {
 performSearch(query, 1, true, 'genre');
 } else {
 setSearchType('keyword');
 performSearch(query, 1, true, 'keyword');
 }
 }, 500);

 const suggestionFn = setTimeout(async () => {
 if (query.length < 2) {
 setSuggestions([]);
 return;
 }
 try {
 const data = await movieService.getSuggestions(query);
 setSuggestions(data);
 } catch (e) {}
 }, 150);

 return () => {
 clearTimeout(delayDebounceFn);
 clearTimeout(suggestionFn);
 };
 }, [query, setSearchParams]);

 useEffect(() => {
 if (page > 1) {
 performSearch(query, page, false);
 }
 }, [page]);

 const saveToHistory = (term: string) => {
 if (!term.trim()) return;
 try {
 const history = JSON.parse(localStorage.getItem('axis_search_history') || '[]');
 const newHistory = [term, ...history.filter((h: string) => h !== term)].slice(0, 5);
 localStorage.setItem('axis_search_history', JSON.stringify(newHistory));
 setSearchHistory(newHistory);
 } catch (e) {}
 };

 const clearHistory = () => {
 localStorage.removeItem('axis_search_history');
 setSearchHistory([]);
 };

 const performSearch = async (searchQuery: string, p: number, reset: boolean = false, type: 'keyword' | 'genre' = searchType) => {
 try {
 if (reset) {
 setLoading(true);
 setLastActionType(`SEARCH: ${searchQuery}`);
 } else {
 setLoadingMore(true);
 }
 
 setError(null);
 let rawData: MediaItem[] = [];
 
 if (type === 'genre') {
 const results = await movieService.browse(searchQuery, undefined, p, 30, 1);
 rawData = results;
 } else {
 rawData = await movieService.search(searchQuery, p);
 }
 
 const processedData = processSearchResults(rawData, searchQuery);
 
 if (reset) {
 setResults(processedData);
 if (processedData.length > 0) {
 saveToHistory(searchQuery);
 }
 } else {
 setResults(prev => {
 const combined = [...prev, ...processedData];
 return processSearchResults(combined, searchQuery);
 });
 }
 
 setHasMore(rawData.length >= 20);
 } catch (err) {
 console.error("Search error:", err);
 setError("Search failed. Try again.");
 } finally {
 setLoading(false);
 setLoadingMore(false);
 }
 };

 const handleClear = () => {
 setQuery("");
 setResults([]);
 setSuggestions([]);
 inputRef.current?.focus();
 };

 const handleGenreClick = (genre: string) => {setActiveCategory("Movies");setQuery(genre);
 setSearchType('genre');
 setSelectedGenre(genre);
 setIsFocused(false);
 setPage(1);
 performSearch(genre, 1, true, 'genre');
 };

 const handlePopularClick = (term: string) => {
 setQuery(term);
 setIsFocused(false);
 };

 const handleSuggestionClick = (term: string) => {
 setQuery(term);
 setIsFocused(false);
 setPage(1);
 performSearch(term, 1, true);
 };

 const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
 if (e.key === "Enter") {
 setIsFocused(false);
 setPage(1);
 performSearch(query, 1, true);
 }
 };

 return (
 <div className="min-h-screen bg-transparent text-white pb-32 relative overflow-hidden">
 {/* Immersive Background Glow - Search Version */}
 <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-20">
 <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-brand rounded-full blur-[140px] opacity-40 transition-all duration-1000" />
 </div>

 {/* Search Header Custom */}
 <div className="px-5 py-4 flex flex-col gap-6 sticky top-0 bg-black/40 backdrop-blur-3xl z-50 border-b border-white/5">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1">
 <ArrowLeft onClick={handleBack} className="w-8 h-8 p-1.5 cursor-pointer text-white hover:bg-white/10 rounded-full transition-all" />
 <h1 className="text-fluid-3xl font-bold tracking-tight text-white ml-2 drop-shadow-md">Search</h1>
 </div>
 
 <div className="flex items-center gap-4">
 <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => navigate('/profile')}>
 <div className="w-10 h-10 rounded-full bg-white/10 p-[2px] shadow-lg border border-white/10">
 <img 
 src={user?.avatar || "https://picsum.photos/seed/user/100/100"} 
 className="w-full h-full rounded-full object-cover" 
 alt="Profile"
 loading="lazy"
 referrerPolicy="no-referrer"
 />
 </div>
 <div className="absolute top-0 right-0 w-3 h-3 bg-[#4ADE80] border-2 border-black rounded-full" />
 </div>
 <Menu className="w-7 h-7 text-white/80 cursor-pointer hover:text-white transition-colors" />
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="relative flex-1 group">
 <SearchIcon className="absolute left-5 sm:left-6 w-5 h-5 text-white/50 group-focus-within:text-white transition-colors top-1/2 -translate-y-1/2" />
 <input
 ref={inputRef}
 type="text"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 onKeyDown={handleKeyDown}
 onFocus={() => setIsFocused(true)}
 placeholder="Shows, Movies, Anime..."
 className="w-full h-14 pl-14 pr-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-fluid-xl font-medium text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
 />
 {query && (
 <button
 onClick={handleClear}
 className="absolute right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all top-1/2 -translate-y-1/2"
 >
 <X className="w-4 h-4" strokeWidth={3} />
 </button>
 )}

 {/* Suggestions Dropdown attached to search input */}
 <AnimatePresence>
 {isFocused && suggestions.length > 0 && (
 <motion.div
 ref={suggestionsRef}
 initial={{ opacity: 0, scale: 0.98, y: -10 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.98, y: -10 }}
 transition={{ duration: 0.2, ease: "easeOut" }}
 className="absolute top-[calc(100%+12px)] left-0 right-0 bg-[#161616] border border-white/10 rounded-3xl overflow-hidden z-[60] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)]"
 >
 <div className="px-5 py-3 border-b border-white/10 bg-black/60">
 <span className="text-fluid-sm font-semibold text-white/50 tracking-wide">Suggestions</span>
 </div>
 {suggestions.map((s, idx) => (
 <button
 key={idx}
 onClick={() => handleSuggestionClick(s)}
 className="w-full text-left px-5 py-4 bg-[#1a1a1a]/40 hover:bg-white/15 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0 group"
 >
 <SearchIcon className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
 <span className="text-fluid-lg text-white/80 font-medium group-hover:text-white transition-colors break-words truncate">{s}</span>
 </button>
 ))}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </div>

 <div className="px-4 sm:px-6 space-y-10 mt-6 relative z-10">

 {error ? (
 <div className="py-20 text-center text-red-500 font-semibold">{error}</div>
 ) : results.length > 0 ? (
 <div className="space-y-8 animate-fade-in">
 <div className="flex flex-col gap-6">
 <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-2">
 {resultCategories.map(cat => (
 <button
 key={cat}
 onClick={() => setActiveCategory(cat)}
 className={`px-5 py-2.5 rounded-full text-fluid-base font-medium tracking-wide transition-all shrink-0 border ${ activeCategory === cat ? "bg-white border-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)]" : "glass-button border-white/10 text-white/70 hover:text-white" }`}
 >
 {cat}
 </button>
 ))}
 </div>
 <h2 className="text-fluid-xl font-bold tracking-tight text-white px-1">Results for "{query}"</h2>
 </div>
 
 <PosterGrid items={results.filter(item => {
		if (activeCategory === "All") return true;

		const categoryLower = (item.category || "").toLowerCase();
		const typeLower = String(item.type || "").toLowerCase();
		const titleLower = (item.title || "").toLowerCase();
		const genreLower = ((item as any).genre || "").toLowerCase();

		if (activeCategory === "Movies") {
			const isAnime = genreLower.includes("anime") || titleLower.includes(" (anime)") || titleLower.startsWith("anime:") || typeLower.includes("anime");
			if (isAnime) return false;
			return typeLower.includes("movie") || categoryLower.includes("movie") || (item as any).subjectType === 1;
		}

		if (activeCategory === "Series") {
			const isAnime = genreLower.includes("anime") || titleLower.includes(" (anime)") || titleLower.startsWith("anime:") || typeLower.includes("anime");
			if (isAnime) return false;
			return typeLower.includes("series") || typeLower.includes("tv") || categoryLower.includes("series") || (item as any).subjectType === 2;
		}

		if (activeCategory === "Anime") {
			return (
				categoryLower.includes("anime") ||
				typeLower.includes("anime") ||
				titleLower.includes("anime") ||
				genreLower.includes("anime") ||
				genreLower.includes("animation")
			);
		}

		return categoryLower.includes(activeCategory.toLowerCase());
	})} loading={loading} variant="grid" />
 
 {hasMore && <div ref={lastElementRef} className="h-10" />}
 </div>
 ) : query && !loading ? (
 <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
 <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
 <SearchIcon className="w-10 h-10 text-white/40" />
 </div>
 <div className="space-y-3">
 <h3 className="text-fluid-2xl font-bold tracking-tight text-white">No results found</h3>
 <p className="text-white/50 max-w-sm mx-auto text-fluid-lg leading-relaxed">We couldn't find any matches for "<span className="text-white font-medium">{query}</span>". Try another search term.</p>
 </div>
 <button 
 onClick={handleClear}
 className="mt-4 px-8 py-3.5 bg-white text-black text-fluid-base font-semibold rounded-full hover:shadow-[0_0_20px_rgba(255,255,255,0.4)] transition-all active:scale-95"
 >
 Clear Search
 </button>
 </div>
 ) : (
 <div className="space-y-12">
 {/* Explore Genres Section */}
 <section className="space-y-6">
 <div className="flex items-center justify-between px-1">
 <h3 className="text-fluid-2xl font-bold tracking-tight text-white drop-shadow-md">Explore Genres</h3>
 </div>
 <div className="grid grid-cols-3 md:grid-cols-6 gap-2 sm:gap-4">
		{GENRE_CARDS.map((c, i) => (
		<button
		key={i}
		onClick={() => handleGenreClick(c.name)}
		className={`relative aspect-[2/1.5] sm:aspect-[2/1.2] rounded-2xl sm:rounded-3xl overflow-hidden group active:scale-[0.98] transition-transform shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 glass-card`}
		>
		<div className={`absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity ${c.color.split(' ')[0]}`} />
		<div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent mix-blend-overlay" />
		<div className="absolute inset-0 p-2 sm:p-5 flex items-center justify-center pointer-events-none">
		<div className="flex flex-col items-center text-center gap-1.5 sm:gap-3">
		<div className={`p-1.5 sm:p-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md ${c.color.split(' ')[1]}`}>
		<c.icon className="w-5 h-5 sm:w-7 h-7" strokeWidth={2} />
		</div>
		<span className="block text-fluid-xs sm:text-fluid-xl font-semibold text-white tracking-wide drop-shadow-md">{c.name}</span>
		</div>
		</div>
		</button>
		))}
		</div>
	</section>

 {/* Recent Searches Section */}
 {searchHistory.length > 0 && (
 <section className="space-y-5">
 <div className="flex items-center justify-between px-1">
 <div className="flex items-center gap-2">
 <History className="w-5 h-5 text-white/50" />
 <h3 className="text-fluid-xl font-semibold tracking-wide text-white">Recent</h3>
 </div>
 <button 
 onClick={clearHistory}
 className="text-white/50 text-fluid-base font-medium hover:text-white transition-colors"
 >
 Clear All
 </button>
 </div>
 <div className="flex flex-wrap gap-2.5">
 {searchHistory.map((term, idx) => (
 <div key={idx} className="flex items-center gap-2 px-4 py-2.5 rounded-full glass-button border border-white/10 group shadow-sm cursor-pointer" onClick={() => handlePopularClick(term)}>
 <Clock className="w-3.5 h-3.5 text-white/40" />
 <span className="text-fluid-base font-medium text-white/80 group-hover:text-white transition-colors">{term}</span>
 <X className="w-4 h-4 ml-1 text-white/30 hover:text-white hover:bg-white/10 rounded-full" strokeWidth={2} onClick={(e) => {
 e.stopPropagation();
 // remove single item
 const newHistory = searchHistory.filter(h => h !== term);
 localStorage.setItem('axis_search_history', JSON.stringify(newHistory));
 setSearchHistory(newHistory);
 }} />
 </div>
 ))}
 </div>
 </section>
 )}

 {/* Popular Searches Section */}
 {popularSearches.length > 0 && (
 <section className="space-y-5">
 <div className="flex items-center gap-2 px-1">
 <TrendingUp className="w-5 h-5 text-white/50" />
 <h3 className="text-fluid-xl font-semibold tracking-wide text-white">Popular</h3>
 </div>
 <div className="flex flex-wrap gap-2.5">
 {popularSearches.map((term, idx) => (
 <div 
 key={idx} 
 className="flex items-center gap-2 px-4 py-2.5 rounded-[12px] glass-button border border-white/10 group hover:border-white/30 transition-all cursor-pointer shadow-sm"
 onClick={() => handlePopularClick(term)}
 >
 <ArrowUpRight className="w-4 h-4 text-white/40 group-hover:text-white" strokeWidth={2} />
 <span className="text-fluid-base font-medium text-white/80 group-hover:text-white transition-colors">{term}</span>
 </div>
 ))}
 </div>
 </section>
 )}
 </div>
 )}
 </div>
 </div>
 );
}
