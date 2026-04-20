import React, { useState, useEffect, useRef, useCallback } from "react";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { Search as SearchIcon, X, TrendingUp, ArrowLeft, Loader2, Filter } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { processSearchResults, ScoredMediaItem } from "../lib/searchUtils";

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
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

  const categories = [
    { name: "Action", color: "from-red-500 to-orange-500" },
    { name: "Comedy", color: "from-yellow-400 to-orange-500" },
    { name: "Drama", color: "from-blue-500 to-purple-500" },
    { name: "Sci-Fi", color: "from-cyan-500 to-blue-500" },
    { name: "Horror", color: "from-gray-700 to-black" },
    { name: "Romance", color: "from-pink-500 to-rose-500" },
  ];

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
      performSearch(query, 1, true);
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
      const newHistory = [term, ...history.filter((h: string) => h !== term)].slice(0, 10);
      localStorage.setItem('axis_search_history', JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (e) {}
  };

  const clearHistory = () => {
    localStorage.removeItem('axis_search_history');
    setSearchHistory([]);
  };

  const performSearch = async (searchQuery: string, p: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      setError(null);
      const rawData = await movieService.smartSearch(searchQuery, p);
      const processedData = processSearchResults(rawData, searchQuery);
      
      if (reset) {
        setResults(processedData);
        if (processedData.length > 0) {
          saveToHistory(searchQuery);
        }
      } else {
        setResults(prev => {
          const combined = [...prev, ...processedData];
          // Re-process to ensure no duplicates and correct ranking across pages
          return processSearchResults(combined, searchQuery);
        });
      }
      
      setHasMore(rawData.length >= 20);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search. Please try again.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const filteredResults = results.filter(item => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Movies") return item.category === "Movies" || item.category === "Movies/Series";
    if (activeCategory === "Series") return item.category === "Series" || item.category === "Movies/Series";
    return item.category === activeCategory;
  });

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setSuggestions([]);
    inputRef.current?.focus();
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
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-28">
        <button 
          onClick={handleBack}
          className="mb-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        
          {/* Search Input */}
        <div className="relative max-w-3xl mx-auto mb-8 flex gap-2">
          <div className="relative flex items-center group flex-1">
            <SearchIcon className="absolute left-6 w-5 h-5 text-gray-400 group-focus-within:text-white transition-colors" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              placeholder="Search movies, series, anime..."
              className="w-full h-14 md:h-16 pl-14 pr-14 bg-white/5 border border-white/10 rounded-full text-base md:text-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all shadow-lg"
            />
            {query && (
              <button
                onClick={handleClear}
                className="absolute right-6 p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            )}
          </div>
          
          <button 
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: 'Axis Search', url });
              } else {
                navigator.clipboard.writeText(url);
                alert("Search context copied to clipboard!");
              }
            }}
            className="w-14 h-14 md:h-16 md:w-16 flex items-center justify-center bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all shrink-0 tooltip"
            title="Share this search"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {isFocused && suggestions.length > 0 && (
              <motion.div
                ref={suggestionsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#121212] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-2xl"
              >
                <div className="px-6 py-3 border-b border-white/5 bg-white/5">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Suggestions</span>
                </div>
                {Array.isArray(suggestions) && suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full text-left px-6 py-4 hover:bg-white/5 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0 group"
                  >
                    <SearchIcon className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                    <span className="text-gray-200 group-hover:text-white transition-colors">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Category Filters */}
        {results.length > 0 && (
          <div className="flex items-center gap-4 mb-12 overflow-x-auto no-scrollbar pb-2">
            <Filter className="w-5 h-5 text-gray-500 shrink-0" />
            {resultCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all shrink-0 ${
                  activeCategory === cat 
                    ? "bg-brand text-white shadow-[0_0_15px_rgba(229,9,20,0.4)]" 
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="min-h-[50vh]">
          {loading && results.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <PopcornLoader />
              <p className="text-gray-400">Searching the universe...</p>
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-12">{error}</div>
          ) : results.length > 0 ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Results for "{query}"</h2>
                <span className="text-sm text-gray-500 font-medium">{filteredResults.length} items found</span>
              </div>
              
              {filteredResults.length > 0 ? (
                <PosterGrid items={filteredResults} loading={loading} />
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-400">No results found in this category.</p>
                </div>
              )}
              
              {hasMore && (
                <div ref={lastElementRef} className="flex justify-center pt-8 h-20">
                  {loadingMore && (
                    <div className="flex items-center gap-3 text-brand">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">Loading more...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : query.trim() !== "" ? (
            <div className="text-center py-20">
              <h3 className="text-2xl font-semibold text-white mb-2">No results found</h3>
              <p className="text-gray-400">Try adjusting your search or explore our popular titles.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-12">
              {/* Explore Genres - Premium Feel */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Explore Genres</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {categories.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => handlePopularClick(c.name)}
                      className="relative overflow-hidden rounded-xl h-20 flex items-center justify-center group"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${c.color} opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500`} />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="relative text-white font-black text-lg tracking-wider drop-shadow-lg">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Search History */}
              {searchHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                      <SearchIcon className="w-5 h-5 text-gray-400" />
                      Recent Searches
                    </h3>
                    <button 
                      onClick={clearHistory}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {Array.isArray(searchHistory) && searchHistory.map((term, idx) => (
                      <button
                        key={`history-${idx}`}
                        onClick={() => handlePopularClick(term)}
                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-brand hover:border-brand hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all text-sm font-medium flex items-center gap-2"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popular Searches */}
              {popularSearches.length > 0 && (
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-6">
                    <TrendingUp className="w-5 h-5 text-gray-400" />
                    Popular Searches
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Array.isArray(popularSearches) && popularSearches.map((term, idx) => (
                      <button
                        key={`popular-${idx}`}
                        onClick={() => handlePopularClick(term)}
                        className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-brand hover:border-brand hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] transition-all text-sm font-medium"
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-6">Explore Categories</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat, idx) => (
                    <button
                      key={`cat-${idx}`}
                      onClick={() => handlePopularClick(cat.name)}
                      className={`h-24 rounded-2xl bg-gradient-to-br ${cat.color} p-4 flex items-end justify-start hover:scale-105 transition-transform shadow-lg relative overflow-hidden group`}
                    >
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      <span className="relative z-10 font-bold text-lg text-white drop-shadow-md">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
