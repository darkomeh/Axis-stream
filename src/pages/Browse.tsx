import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import TopTenGrid from "../components/TopTenGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { ErrorMessage } from "../components/ErrorMessage";
import { Filter, ChevronDown, X, Loader2, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialType = searchParams.get("type") || "0";

  const [items, setItems] = useState<MediaItem[]>([]);
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedType, setSelectedType] = useState(initialType);

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
    movieService.getTrending().then(setTrending).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
    loadItems(1, true);
  }, [selectedGenre, selectedCountry, selectedType]);

  useEffect(() => {
    if (page > 1) {
      loadItems(page, false);
    }
  }, [page]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const loadItems = async (p: number, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
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
      setHasMore(data.length === 20);
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
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      <Navbar />
      
      <div className="pt-28 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <button 
          onClick={handleBack}
          className="mb-8 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold mb-2">Browse</h1>
            <p className="text-gray-400">Discover your next favorite movie or series</p>
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all md:hidden"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          <div className="hidden md:flex items-center gap-4">
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-6 py-2.5 focus:outline-none focus:border-white/30 cursor-pointer hover:bg-white/10 transition-colors"
            >
              {TYPES.map(t => <option key={t.id} value={t.id} className="bg-[#121212]">{t.name}</option>)}
            </select>
            <select 
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-6 py-2.5 focus:outline-none focus:border-white/30 cursor-pointer hover:bg-white/10 transition-colors"
            >
              {GENRES.map(g => <option key={g.id} value={g.id} className="bg-[#121212]">{g.name}</option>)}
            </select>
            <select 
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full px-6 py-2.5 focus:outline-none focus:border-white/30 cursor-pointer hover:bg-white/10 transition-colors"
            >
              {COUNTRIES.map(c => <option key={c.id} value={c.id} className="bg-[#121212]">{c.name}</option>)}
            </select>
            
            {(selectedGenre || selectedCountry || selectedType !== "0") && (
              <button
                onClick={() => {
                  setSelectedGenre("");
                  setSelectedCountry("");
                  setSelectedType("0");
                }}
                className="px-4 py-2 text-sm font-medium text-white/40 hover:text-white transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Clear
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden mb-8 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {TYPES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedType(t.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${selectedType === t.id ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-gray-400'}`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Genre</label>
                  <div className="flex flex-wrap gap-2">
                    {GENRES.slice(0, 6).map(g => (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGenre(g.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${selectedGenre === g.id ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-gray-400'}`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Country</label>
                  <div className="flex flex-wrap gap-2">
                    {COUNTRIES.slice(0, 6).map(c => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCountry(c.id)}
                        className={`px-4 py-2 rounded-full text-sm transition-all ${selectedCountry === c.id ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-gray-400'}`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                {(selectedGenre || selectedCountry || selectedType !== "0") && (
                  <button
                    onClick={() => {
                      setSelectedGenre("");
                      setSelectedCountry("");
                      setSelectedType("0");
                      setShowFilters(false);
                    }}
                    className="w-full py-3 bg-white/10 rounded-xl text-sm font-bold hover:bg-white/20 transition-colors mt-4"
                  >
                    Clear All Filters
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!selectedGenre && !selectedCountry && selectedType === "0" && trending.length > 0 && (
          <div className="-mx-6 lg:-mx-12 mb-12">
            <TopTenGrid title="Top 10 Trending" items={trending.slice(0, 10)} />
          </div>
        )}

        {error ? (
          <div className="py-20">
            <ErrorMessage message={error} onRetry={() => loadItems(1, true)} />
          </div>
        ) : (
          <div className="space-y-12">
            <PosterGrid items={items} loading={loading} />
            
            {hasMore && (
              <div ref={lastElementRef} className="flex justify-center pt-8 h-20">
                {loadingMore && (
                  <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Loading more...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
