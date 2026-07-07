import React, { useState, useEffect, useRef, useCallback } from "react";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import Browse from "./Browse";
import BrowseGenreRow from "../components/BrowseGenreRow";
import {
  Search as SearchIcon,
  X,
  TrendingUp,
  ArrowLeft,
  Loader2,
  Filter,
  Clock,
  History,
  ArrowUpRight,
  User,
  Menu,
  Play,
  Sparkles,
  Smile,
  Theater,
  Rocket,
  Ghost,
  Heart,
  LayoutGrid,
  Mic,
  Film,
  Tv,
  PlayCircle,
} from "lucide-react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { motion, AnimatePresence } from "motion/react";
import { processSearchResults, ScoredMediaItem } from "../lib/searchUtils";
import { NoticeMessage } from "../components/NoticeMessage";



const isItemKidSafe = (item: MediaItem) => {
  if (!item) return false;
  const title = (item.title || (item as any).name || '').toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  // Non-kid keywords to filter out of kids feed
  const blockedKeywords = [
    'horror', 'thriller', 'crime', 'murder', 'slasher', 'gore', 'sexy', 'erotic', 'adult', 'rated r', 'restricted', 'violence',
    'zombie', 'demonic', 'evil', 'blood', 'scary', 'psycho', 'killer', 'drugs', 'mafia', 'gangster', 'sex', 'kill', 'devil',
    'satan', 'demon', 'vampire', 'ghost', 'haunt', 'dead', 'death', 'sinister', 'nightmare', 'paranormal', 'insidious', 'scream',
    'conjuring', 'purge', 'saw', 'annabelle', 'dracula', 'frankenstein', 'witch', 'occult', 'brutal', 'slay', 'suicide', 'lucifer'
  ];
  
  for (const keyword of blockedKeywords) {
    if (title.includes(keyword) || category.includes(keyword)) {
      return false;
    }
  }
  return true;
};

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setLastActionType, user, preferences, history = [], continueWatching = [] } = useAuth();
  const { openPreview } = useMediaPreview();
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
  const [searchType, setSearchType] = useState<"keyword" | "genre">("keyword");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [mightLike, setMightLike] = useState<MediaItem[]>([]);

  // Simulated Voice Search state
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Listening...");
  const voiceTimeoutRef = useRef<any>(null);

  // Recommendations Filter state
  const [recFilter, setRecFilter] = useState<"All" | "Movies" | "Series" | "Anime">("All");

  // Infinite recommendations state
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [recPage, setRecPage] = useState(1);
  const [recLoading, setRecLoading] = useState(false);
  const [recHasMore, setRecHasMore] = useState(true);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const recObserver = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  const lastRecElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (recLoading) return;
      if (recObserver.current) recObserver.current.disconnect();

      recObserver.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && recHasMore) {
          setRecPage((prev) => prev + 1);
        }
      });

      if (node) recObserver.current.observe(node);
    },
    [recLoading, recHasMore],
  );

  const resultCategories = ["All", "Movies", "Series", "Anime", "People"];

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    movieService
      .getPopularSearch()
      .then(setPopularSearches)
      .catch(console.error);

    movieService
      .getTrending(1)
      .then((data) => {
        setTrending(data);
        setMightLike(data.slice(0, 3));
      })
      .catch(console.error);



    try {
      const history = JSON.parse(
        localStorage.getItem("axis_search_history") || "[]",
      );
      setSearchHistory(
        history.length
          ? history
          : [
              "Deep Water",
              "Family Guy S24",
              "Family Guy",
              "Avatar: The Last Airbender",
            ],
      );
    } catch (e) {}

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (voiceTimeoutRef.current) {
        clearTimeout(voiceTimeoutRef.current);
      }
    };
  }, []);

  const fetchRecommendations = useCallback(async (pageNum: number) => {
    if (pageNum === 1) {
      setRecLoading(true);
    }
    try {
      let list: MediaItem[] = [];
      
      // Get unique watched items from history and continueWatching
      const watchedItems = [...(history || []), ...(continueWatching || [])].filter(Boolean);
      const uniqueWatched = Array.from(new Set(watchedItems.map(item => item.id)))
        .map(id => watchedItems.find(item => item.id === id))
        .filter((item): item is MediaItem => !!item);
        
      // Fetch recommendations based on watched items
      const recPromises = uniqueWatched.slice(0, 3).map(item => 
        movieService.getRecommendations(item.id, pageNum, 8).catch(() => [] as MediaItem[])
      );
      
      // Query search based on searchHistory terms
      const searchPromises = (searchHistory || []).slice(0, 3).map(term => 
        movieService.search(term, pageNum, 8).catch(() => [] as MediaItem[])
      );
      
      const results = await Promise.all([...recPromises, ...searchPromises]);
      results.forEach(res => {
        if (Array.isArray(res)) {
          list = [...list, ...res];
        }
      });
      
      // Fallback: fetch from trending
      if (list.length < 12) {
        const trendingPage = await movieService.getTrending(pageNum, 15).catch(() => []);
        list = [...list, ...trendingPage];
      }
      
      const watchedIds = new Set(uniqueWatched.map(w => w.id));
      const seen = new Set<string>();
      const finalItems = list.filter(item => {
        if (!item || !item.id || seen.has(item.id)) return false;
        seen.add(item.id);
        return !watchedIds.has(item.id);
      });

      if (finalItems.length === 0) {
        setRecHasMore(false);
      } else {
        setRecommendations(prev => pageNum === 1 ? finalItems : [...prev, ...finalItems]);
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
    } finally {
      setRecLoading(false);
    }
  }, [history, continueWatching, searchHistory]);

  // Handle recommendation pages
  useEffect(() => {
    if (!query) {
      fetchRecommendations(recPage);
    }
  }, [recPage, query, fetchRecommendations]);

  // Reset recommendations when query changes or clears
  useEffect(() => {
    if (!query) {
      setRecPage(1);
      setRecHasMore(true);
      fetchRecommendations(1);
    }
  }, [query]);

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
      if (searchType === "genre" && query === selectedGenre) {
        performSearch(query, 1, true, "genre");
      } else {
        setSearchType("keyword");
        performSearch(query, 1, true, "keyword");
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
      const history = JSON.parse(
        localStorage.getItem("axis_search_history") || "[]",
      );
      const newHistory = [
        term,
        ...history.filter((h: string) => h !== term),
      ].slice(0, 5);
      localStorage.setItem("axis_search_history", JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (e) {}
  };

  const clearHistory = () => {
    localStorage.removeItem("axis_search_history");
    setSearchHistory([]);
  };

  const performSearch = async (
    searchQuery: string,
    p: number,
    reset: boolean = false,
    type: "keyword" | "genre" = searchType,
  ) => {
    try {
      if (reset) {
        setLoading(true);
        setLastActionType(`SEARCH: ${searchQuery}`);
      } else {
        setLoadingMore(true);
      }

      setError(null);
      let rawData: MediaItem[] = [];

      if (type === "genre") {
        const results = await movieService.browse(
          searchQuery,
          undefined,
          p,
          30,
          1,
        );
        rawData = results;
      } else {
        rawData = await movieService.search(searchQuery, p);
      }

      const processedData = processSearchResults(rawData, searchQuery);
      const finalProcessedData = preferences?.kidsMode
        ? processedData.filter(isItemKidSafe)
        : processedData;

      if (reset) {
        setResults(finalProcessedData);
        if (finalProcessedData.length > 0) {
          saveToHistory(searchQuery);
        }
      } else {
        setResults((prev) => {
          const combined = [...prev, ...finalProcessedData];
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
    setActiveCategory("Movies");
    setQuery(genre);
    setSearchType("genre");
    setSelectedGenre(genre);
    setIsFocused(false);
    setPage(1);
    performSearch(genre, 1, true, "genre");
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

  const voiceStatusTimeoutsRef = useRef<any[]>([]);

  const startVoiceSearch = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceStatusTimeoutsRef.current.forEach(clearTimeout);
    voiceStatusTimeoutsRef.current = [];

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceActive(true);
      setVoiceStatus("Voice search not supported in this browser.");
      const timeout = setTimeout(() => {
        setVoiceActive(false);
      }, 3000);
      voiceStatusTimeoutsRef.current.push(timeout);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceActive(true);
        setVoiceStatus("Listening... Speak now");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
          setVoiceStatus("Microphone access blocked. Please open in a new tab or grant mic permissions.");
        } else {
          setVoiceStatus(`Speech recognition error: ${event.error}`);
        }
        const timeout = setTimeout(() => {
          setVoiceActive(false);
        }, 6000);
        voiceStatusTimeoutsRef.current.push(timeout);
      };

      recognition.onend = () => {
        // Safe end
      };

      recognition.onresult = (event: any) => {
        const speechToText = event.results[0][0].transcript;
        setVoiceStatus(`Heard: "${speechToText}"`);
        
        const timeout = setTimeout(() => {
          setVoiceActive(false);
          setQuery(speechToText);
          setSearchParams({ q: speechToText });
          setPage(1);
          setSearchType("keyword");
          performSearch(speechToText, 1, true, "keyword");
        }, 1200);
        voiceStatusTimeoutsRef.current.push(timeout);
      };

      recognition.start();
      (window as any)._currentSpeechRecognition = recognition;
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setVoiceActive(true);
      setVoiceStatus("Failed to start voice search.");
      const timeout = setTimeout(() => {
        setVoiceActive(false);
      }, 3000);
      voiceStatusTimeoutsRef.current.push(timeout);
    }
  };

  const cancelVoiceSearch = () => {
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceStatusTimeoutsRef.current.forEach(clearTimeout);
    voiceStatusTimeoutsRef.current = [];
    if ((window as any)._currentSpeechRecognition) {
      try {
        ((window as any)._currentSpeechRecognition).stop();
      } catch (e) {}
    }
    setVoiceActive(false);
  };

  const filteredRecs = recommendations.filter((item) => {
    if (preferences?.kidsMode && !isItemKidSafe(item)) return false;
    if (recFilter === "All") return true;
    const typeLower = String(item.type || "").toLowerCase();
    const genreLower = String((item as any).genre || "").toLowerCase();
    const titleLower = String(item.title || "").toLowerCase();
    
    if (recFilter === "Movies") {
      const isAnime = genreLower.includes("anime") || titleLower.includes(" (anime)") || typeLower.includes("anime");
      if (isAnime) return false;
      return typeLower.includes("movie") || (item as any).subjectType === 1;
    }
    if (recFilter === "Series") {
      const isAnime = genreLower.includes("anime") || titleLower.includes(" (anime)") || typeLower.includes("anime");
      if (isAnime) return false;
      return typeLower.includes("series") || typeLower.includes("tv") || (item as any).subjectType === 2;
    }
    if (recFilter === "Anime") {
      return typeLower.includes("anime") || genreLower.includes("anime") || genreLower.includes("animation");
    }
    return true;
  });

  const handleRecScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (
      container.scrollLeft + container.offsetWidth >= container.scrollWidth - 100 &&
      recHasMore &&
      !recLoading
    ) {
      setRecPage((prev) => prev + 1);
    }
  };

  const [activeTab, setActiveTab] = useState<"search" | "browse">("search");

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F7] pb-32 relative overflow-x-hidden font-sans">
      <div className="px-5 pt-8 pb-4 flex items-center justify-between z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white border border-white/5 group shadow-md"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="text-xl font-bold tracking-tighter">
            AXIS<span className="text-[#FF3B30]">TV</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="relative cursor-pointer hover:scale-105 transition-transform"
            onClick={() => navigate("/profile")}
          >
            <div className="w-8 h-8 rounded-full bg-white/10 p-[1px]">
              <img
                src={user?.avatar || "https://picsum.photos/seed/user/100/100"}
                className="w-full h-full rounded-full object-cover"
                alt="Profile"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[#F5F5F7] mb-1">
          Explore
        </h1>
        <p className="text-sm text-[#A1A1AA]">
          Search, discover and explore all content
        </p>
      </div>

      <div className="px-5 mb-8">
        <div className="flex bg-white/[0.05] p-1 rounded-full border border-white/10 relative">
          <div
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-white/10 transition-transform duration-300 ease-out border border-white/10 shadow-sm"
            style={{
              transform:
                activeTab === "browse" ? "translateX(100%)" : "translateX(0)",
            }}
          />
          <button
            onClick={() => setActiveTab("search")}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 relative z-10 transition-colors ${activeTab === "search" ? "text-[#F5F5F7]" : "text-[#A1A1AA]"}`}
          >
            <SearchIcon className="w-4 h-4" /> Search
          </button>
          <button
            onClick={() => setActiveTab("browse")}
            className={`flex-1 py-2.5 rounded-full text-sm font-semibold flex items-center justify-center gap-2 relative z-10 transition-colors ${activeTab === "browse" ? "text-[#F5F5F7]" : "text-[#A1A1AA]"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Browse
          </button>
        </div>
      </div>

      <div className="px-5 relative z-20">
        <AnimatePresence mode="wait">
          {activeTab === "search" ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
            <div className="relative group mb-6 z-30" id="search-input-container">
              <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A1A1AA]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                placeholder="Search for movies, series, people..."
                className="w-full h-14 pl-12 pr-12 bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl text-[#F5F5F7] placeholder-[#A1A1AA] focus:outline-none focus:ring-1 focus:ring-white/20 transition-all shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
              />
              {query ? (
                <button
                  onClick={handleClear}
                  className="absolute right-4 p-1.5 bg-white/10 rounded-full text-white/70 hover:text-white top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceSearch}
                  className="absolute right-5 top-1/2 -translate-y-1/2 p-1 bg-white/5 hover:bg-white/10 rounded-full text-[#FF3B30] hover:scale-110 active:scale-95 transition-all"
                  title="Voice Search"
                  id="voice-mic-btn"
                >
                  <Mic className="w-5 h-5 text-[#FF3B30]" />
                </button>
              )}

              {/* Animated Voice Listening Waveform overlay */}
              <AnimatePresence>
                {voiceActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-2xl rounded-2xl flex items-center justify-between px-5 z-[70] border border-[#FF3B30]/40 shadow-[0_8px_32px_rgba(255,59,48,0.2)]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-pulse shrink-0" />
                      <span className="text-sm font-semibold tracking-wide text-[#F5F5F7]">
                        {voiceStatus}
                      </span>
                    </div>
                    
                    {/* Animated sound waves */}
                    <div className="flex items-center gap-1 h-6">
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1 bg-[#FF3B30] rounded-full"
                          animate={{ 
                            height: voiceStatus === "Transcribing..." ? [4, 8, 4] : [4, 24, 4],
                          }}
                          transition={{
                            duration: voiceStatus === "Transcribing..." ? 0.9 : 0.5,
                            repeat: Infinity,
                            delay: i * 0.08,
                            ease: "easeInOut"
                          }}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={cancelVoiceSearch}
                      className="text-xs font-semibold px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-full text-white transition-all border border-white/5"
                    >
                      Cancel
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {isFocused && suggestions.length > 0 && (
                  <motion.div
                    ref={suggestionsRef}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute top-[calc(100%+8px)] left-0 right-0 bg-[#161616] border border-white/10 rounded-2xl overflow-hidden z-[60] shadow-2xl"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full text-left px-5 py-4 hover:bg-white/10 transition-colors flex items-center gap-3 border-b border-white/5 last:border-0"
                      >
                        <SearchIcon className="w-4 h-4 text-[#A1A1AA]" />
                        <span className="text-sm text-[#F5F5F7]">{s}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!query ? (
              <div className="space-y-12">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                  <button
                    onClick={() => setRecFilter("All")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium border transition-all ${recFilter === "All" ? "bg-white/[0.08] border-[#FF3B30]/30 text-[#F5F5F7]" : "bg-white/[0.04] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F7]"}`}
                  >
                    <LayoutGrid className={`w-4 h-4 ${recFilter === "All" ? "text-[#FF3B30]" : ""}`} /> All
                  </button>
                  <button
                    onClick={() => setRecFilter("Movies")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium border transition-all ${recFilter === "Movies" ? "bg-white/[0.08] border-[#FF3B30]/30 text-[#F5F5F7]" : "bg-white/[0.04] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F7]"}`}
                  >
                    <Film className={`w-4 h-4 ${recFilter === "Movies" ? "text-[#FF3B30]" : ""}`} /> Movies
                  </button>
                  <button
                    onClick={() => setRecFilter("Series")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium border transition-all ${recFilter === "Series" ? "bg-white/[0.08] border-[#FF3B30]/30 text-[#F5F5F7]" : "bg-white/[0.04] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F7]"}`}
                  >
                    <Tv className={`w-4 h-4 ${recFilter === "Series" ? "text-[#FF3B30]" : ""}`} /> Series
                  </button>
                  <button
                    onClick={() => setRecFilter("Anime")}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium border transition-all ${recFilter === "Anime" ? "bg-white/[0.08] border-[#FF3B30]/30 text-[#F5F5F7]" : "bg-white/[0.04] border-white/10 text-[#A1A1AA] hover:text-[#F5F5F7]"}`}
                  >
                    <Smile className={`w-4 h-4 ${recFilter === "Anime" ? "text-[#FF3B30]" : ""}`} /> Anime
                  </button>
                </div>

                {preferences?.kidsMode ? (
                  <section className="bg-white/[0.04] border border-white/5 rounded-2xl p-5" id="kids-cartoon-searches">
                    <div className="flex items-center gap-2 mb-4">
                      <Smile className="w-5 h-5 text-[#FF3B30] animate-pulse" />
                      <h3 className="text-sm font-bold text-[#F5F5F7]">
                        AxisKids Cartoon Search Ideas
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Toy Story",
                        "Frozen",
                        "Kung Fu Panda",
                        "Spirited Away",
                        "Mickey Mouse",
                        "Minions",
                        "SpongeBob",
                        "Spider-Man Animated",
                        "Peppa Pig",
                        "My Neighbor Totoro"
                      ].map((term, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#FF3B30]/30 transition-all cursor-pointer text-xs font-semibold text-[#A1A1AA] hover:text-[#F5F5F7]"
                          onClick={() => handlePopularClick(term)}
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#FF3B30] opacity-75" />
                          <span>{term}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {searchHistory.length > 0 && (
                      <section className="bg-white/[0.04] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                          <History className="w-4 h-4 text-[#FF3B30]" />
                          <h3 className="text-sm font-bold text-[#F5F5F7]">
                            Recent Searches
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {searchHistory.map((term, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer text-xs text-[#A1A1AA]"
                            >
                              <span onClick={() => handlePopularClick(term)}>
                                {term}
                              </span>
                              <X
                                className="w-3.5 h-3.5 text-[#A1A1AA] hover:text-[#F5F5F7] p-0.5 hover:bg-white/10 rounded-full transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newHistory = searchHistory.filter(
                                    (h) => h !== term,
                                  );
                                  localStorage.setItem(
                                    "axis_search_history",
                                    JSON.stringify(newHistory),
                                  );
                                  setSearchHistory(newHistory);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {popularSearches.length > 0 && (
                      <section className="bg-white/[0.04] border border-white/5 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#FF3B30]" />
                            <h3 className="text-sm font-bold text-[#F5F5F7]">
                              Popular Searches
                            </h3>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {popularSearches.slice(0, 8).map((term, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F7]"
                              onClick={() => handlePopularClick(term)}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                              <span>{term}</span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* Recommended For You - Horizontal Carousel with Infinite Scroll */}
                {filteredRecs.length > 0 && (
                  <section className="space-y-4 pt-6 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#FF3B30] animate-pulse" />
                        <div>
                          <h3 className="text-base font-bold text-[#F5F5F7]">Recommended For You</h3>
                          <p className="text-[10px] text-[#A1A1AA]">
                            Based on your watch history • Swipe to browse
                          </p>
                        </div>
                      </div>
                    </div>
                    <div 
                      onScroll={handleRecScroll}
                      className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5 snap-x snap-mandatory scroll-smooth"
                    >
                      {filteredRecs.map((item, itemIdx) => (
                        <motion.div
                          key={`${item.id}-${itemIdx}`}
                          onClick={() => openPreview(item.id)}
                          whileHover={{ scale: 1.04, y: -4 }}
                          whileTap={{ scale: 0.97 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25, mass: 0.8 }}
                          className="flex-none w-[110px] md:w-[130px] lg:w-[150px] snap-start cursor-pointer group"
                        >
                          <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-white/[0.08] shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-white/5 group-hover:border-white/15">
                            {item.poster ? (
                              <img
                                src={item.poster}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-85 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            {item.rating && (
                              <div className="absolute top-1.5 right-1.5 z-20">
                                <div className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md border border-white/5 rounded-full flex items-center gap-0.5 shadow-md">
                                  <span className="text-yellow-500 text-[9px]">★</span>
                                  <span className="font-bold text-white text-[9px]">{item.rating}</span>
                                </div>
                              </div>
                            )}

                            <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col justify-end">
                              <h4 className="text-white font-semibold leading-[1.2] mb-0.5 line-clamp-1 text-[10px] sm:text-[11px] md:text-xs tracking-tight group-hover:text-[#FF3B30] transition-colors">
                                {item.title}
                              </h4>
                              <div className="flex items-center justify-between font-normal text-white/40 text-[9px]">
                                <span>{item.year || '2024'}</span>
                                <span>{item.type === 2 || String(item.type || "").toLowerCase().includes("series") ? "Series" : "Movie"}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {recLoading && (
                        <div className="flex-none w-[120px] flex flex-col items-center justify-center gap-2 text-[#FF3B30] snap-start">
                          <Loader2 className="w-6 h-6 animate-spin" />
                          <span className="text-[10px] text-[#A1A1AA] font-semibold">Syncing...</span>
                        </div>
                      )}

                      {recHasMore && !recLoading && (
                        <div className="flex-none w-[120px] flex flex-col items-center justify-center snap-start text-xs text-[#A1A1AA] font-semibold">
                          <ArrowUpRight className="w-4 h-4 text-[#FF3B30] mb-1 animate-bounce" />
                          <span>More results</span>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* Horizontal Category Carousels with Infinite Scroll */}
                <div className="space-y-6">
                  {preferences?.kidsMode ? (
                    <>
                      <BrowseGenreRow genreId="" genreName="Trending Hits" subjectType={0} />
                      <BrowseGenreRow genreId="family" genreName="Kids & Family" subjectType={0} />
                      <BrowseGenreRow genreId="comedy" genreName="Funny Cartoons" subjectType={0} />
                      <BrowseGenreRow genreId="adventure" genreName="Fun Adventures" subjectType={0} />
                    </>
                  ) : (
                    <>
                      <BrowseGenreRow genreId="" genreName="Trending" subjectType={0} />
                      <BrowseGenreRow genreId="sci-fi" genreName="Sci-Fi" subjectType={0} />
                      <BrowseGenreRow genreId="action" genreName="Action" subjectType={0} />
                      <BrowseGenreRow genreId="comedy" genreName="Comedy" subjectType={0} />
                      <BrowseGenreRow genreId="drama" genreName="Drama" subjectType={0} />
                      <BrowseGenreRow genreId="thriller" genreName="Thriller" subjectType={0} />
                      <BrowseGenreRow genreId="documentary" genreName="Documentaries" subjectType={0} />
                      <BrowseGenreRow genreId="family" genreName="Kids & Family" subjectType={0} />
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fade-in">
                {error ? (
                  <div className="py-20 text-center text-[#FF3B30] font-semibold">
                    {error}
                  </div>
                ) : results.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar py-2">
                      {resultCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-5 py-2 rounded-full text-sm font-medium tracking-wide transition-all shrink-0 border ${activeCategory === cat ? "bg-white/[0.08] border-[#FF3B30]/30 text-[#F5F5F7]" : "bg-transparent border-white/10 text-[#A1A1AA] hover:text-[#F5F5F7]"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <h2 className="text-sm font-medium text-[#A1A1AA] px-1">
                      Results for "{query}"
                    </h2>

                    <PosterGrid
                      items={results.filter((item) => {
                        if (activeCategory === "All") return true;

                        const categoryLower = (
                          item.category || ""
                        ).toLowerCase();
                        const typeLower = String(item.type || "").toLowerCase();
                        const titleLower = (item.title || "").toLowerCase();
                        const genreLower = (
                          (item as any).genre || ""
                        ).toLowerCase();

                        if (activeCategory === "Movies") {
                          const isAnime =
                            genreLower.includes("anime") ||
                            titleLower.includes(" (anime)") ||
                            titleLower.startsWith("anime:") ||
                            typeLower.includes("anime");
                          if (isAnime) return false;
                          return (
                            typeLower.includes("movie") ||
                            categoryLower.includes("movie") ||
                            (item as any).subjectType === 1
                          );
                        }

                        if (activeCategory === "Series") {
                          const isAnime =
                            genreLower.includes("anime") ||
                            titleLower.includes(" (anime)") ||
                            titleLower.startsWith("anime:") ||
                            typeLower.includes("anime");
                          if (isAnime) return false;
                          return (
                            typeLower.includes("series") ||
                            typeLower.includes("tv") ||
                            categoryLower.includes("series") ||
                            (item as any).subjectType === 2
                          );
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

                        return categoryLower.includes(
                          activeCategory.toLowerCase(),
                        );
                      })}
                      loading={loading}
                      variant="grid"
                    />

                    {hasMore && <div ref={lastElementRef} className="h-10" />}
                  </>
                ) : !loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-inner backdrop-blur-md">
                      <SearchIcon className="w-10 h-10 text-[#A1A1AA]" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold tracking-tight text-[#F5F5F7]">
                        No results found
                      </h3>
                      <p className="text-[#A1A1AA] max-w-sm mx-auto text-sm leading-relaxed">
                        We couldn't find any matches for "
                        <span className="text-[#F5F5F7] font-medium">
                          {query}
                        </span>
                        ". Try another search term.
                      </p>
                    </div>
                    <button
                      onClick={handleClear}
                      className="mt-4 px-6 py-3 bg-white/[0.08] text-[#F5F5F7] text-sm font-semibold rounded-full border border-white/10 transition-all active:scale-95 hover:bg-white/10"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            </motion.div>
          ) : (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="-mx-5 px-5"
            >
              <Browse isEmbedded={true} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
