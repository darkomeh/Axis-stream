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
        const results = await movieService.browse(searchQuery, undefined, p, 30);
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

  const handleGenreClick = (genre: string) => {
    setQuery(genre);
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
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Search Header Custom */}
      <div className="px-6 py-4 flex flex-col gap-6 sticky top-0 bg-black/95 backdrop-blur-2xl z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
             <ArrowLeft onClick={handleBack} className="w-7 h-7 cursor-pointer text-white hover:text-gray-400 transition-colors" />
             <h1 className="text-2xl font-black tracking-tighter text-white ml-2">Search</h1>
          </div>
          
          <div className="flex items-center gap-5">
               <div className="relative">
               <div className="w-9 h-9 rounded-full bg-white/10 p-[1px]">
                 <img 
                   src={user?.avatar || "https://picsum.photos/seed/user/100/100"} 
                   className="w-full h-full rounded-full object-cover" 
                   alt="Profile"
                   loading="lazy"
                   referrerPolicy="no-referrer"
                 />
               </div>
               <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#4ADE80] border-2 border-black rounded-full" />
            </div>
            <Menu className="w-6 h-6 text-gray-300 cursor-pointer" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 group">
            <SearchIcon className="absolute left-4 sm:left-6 w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              placeholder="Search on Axis TV..."
              className="w-full h-12 sm:h-14 pl-12 sm:pl-14 pr-12 bg-[#0F0F0F] border border-white/5 rounded-full text-sm sm:text-base text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand focus:border-brand/50 transition-all shadow-[0_0_15px_rgba(255,45,45,0.02)] focus:shadow-[0_0_25px_rgba(255,45,45,0.1)]"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-4 sm:right-5 p-1 text-gray-500 hover:text-white transition-colors top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={3} />
              </button>
            )}

            {/* Suggestions Dropdown attached to search input */}
            <AnimatePresence>
              {isFocused && suggestions.length > 0 && (
                <motion.div
                  ref={suggestionsRef}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden z-[60] shadow-2xl backdrop-blur-3xl"
                >
                  <div className="px-5 py-3 border-b border-white/5 bg-white/5">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Suggestions</span>
                  </div>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-5 py-4 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0 group"
                    >
                      <SearchIcon className="w-4 h-4 text-gray-600 group-hover:text-brand transition-colors" />
                      <span className="text-sm sm:text-base text-gray-300 font-bold group-hover:text-white transition-colors break-words truncate">{s}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 space-y-10 mt-6">

        {error ? (
           <div className="py-20 text-center text-red-500 font-bold">{error}</div>
        ) : results.length > 0 ? (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-2">
                {resultCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all shrink-0 border ${
                      activeCategory === cat 
                        ? "bg-brand border-brand text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]" 
                        : "bg-[#0F0F0F] border-white/5 text-gray-500 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white px-1">Results for "{query}"</h2>
            </div>
            
            <PosterGrid items={results.filter(item => {
              if (activeCategory === "All") return true;
              return item.category?.includes(activeCategory);
            })} loading={loading} variant="grid" />
            
            {hasMore && <div ref={lastElementRef} className="h-10" />}
          </div>
        ) : query && !loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 shadow-inner">
               <SearchIcon className="w-10 h-10 text-gray-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black tracking-tight text-white uppercase">No results found</h3>
              <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any matches for "<span className="text-white">{query}</span>". Try another search term.</p>
            </div>
            <button 
              onClick={handleClear}
              className="mt-4 px-8 py-3 bg-brand text-white text-xs font-black uppercase tracking-widest rounded-full hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all active:scale-95"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Explore Genres Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xl font-black tracking-tighter text-white">Explore Genres</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {GENRE_CARDS.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => handleGenreClick(c.name)}
                    className={`relative aspect-[2/1] rounded-[24px] overflow-hidden group active:scale-[0.98] transition-transform shadow-xl border border-white/5 ${c.color.split(' ')[0]} bg-opacity-10 backdrop-blur-md`}
                  >
                    <div className="absolute inset-0 p-5 flex items-center justify-center">
                      <div className="flex flex-col items-center text-center gap-2">
                        <c.icon className={`w-8 h-8 ${c.color.split(' ')[1]}`} strokeWidth={2.5} />
                        <span className="block text-lg font-black text-white uppercase tracking-tight drop-shadow-md">{c.name}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Searches Section */}
            {searchHistory.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <History className="w-6 h-6 text-gray-500" />
                    <h3 className="text-xl font-black tracking-tighter text-white">Recent Searches</h3>
                  </div>
                  <button 
                    onClick={clearHistory}
                    className="text-brand text-xs font-black uppercase tracking-widest hover:opacity-80 transition-opacity"
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {searchHistory.map((term, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#0F0F0F] border border-white/10 group hover:border-white/30 transition-all cursor-pointer" onClick={() => handlePopularClick(term)}>
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-[14px] font-bold text-gray-400 group-hover:text-white transition-colors">{term}</span>
                      <X className="w-4 h-4 text-gray-600 hover:text-brand" strokeWidth={3} onClick={(e) => {
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
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                  <TrendingUp className="w-6 h-6 text-gray-500" />
                  <h3 className="text-xl font-black tracking-tighter text-white">Popular Searches</h3>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {popularSearches.map((term, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#0F0F0F] border border-white/10 group hover:border-brand/50 hover:bg-brand/5 transition-all cursor-pointer"
                      onClick={() => handlePopularClick(term)}
                    >
                      <ArrowUpRight className="w-4 h-4 text-brand" strokeWidth={3} />
                      <span className="text-[14px] font-bold text-gray-400 group-hover:text-white transition-colors">{term}</span>
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
