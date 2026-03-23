import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { movieService } from "../services/movieService";
import { MediaItem } from "../types";
import PosterGrid from "../components/PosterGrid";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { Search, ArrowLeft } from "lucide-react";

const BAD_KEYWORDS = ['family guy', 'south park', 'rick and morty', 'adult', 'hentai', 'bojack', 'archer', 'big mouth'];

const isToon = (item: MediaItem) => {
  const title = item.title.toLowerCase();
  const isBad = BAD_KEYWORDS.some(keyword => title.includes(keyword));
  return !isBad;
};

export default function Toons() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadToons();
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const loadToons = async () => {
    setLoading(true);
    try {
      // Fetch Animation from United States (typically Toons)
      const data = await movieService.browse('Animation', 'United States', 1, 30, 0);
      setItems(data.filter(isToon));
    } catch (e) {
      console.error("Failed to load toons", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      // Just search directly, but filter out adult cartoons
      const data = await movieService.search(query);
      setItems(data.filter(isToon));
    } catch (e) {
      console.error("Failed to search toons", e);
    } finally {
      setLoading(false);
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
        <h1 className="text-4xl font-bold mb-8">Toons</h1>
        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cartoons..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-6 focus:outline-none focus:border-white/30 transition-all"
            />
          </div>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <PopcornLoader />
          </div>
        ) : items.length > 0 ? (
          <PosterGrid items={items} />
        ) : (
          <div className="text-center py-20 text-gray-500">No cartoons found.</div>
        )}
      </div>
      <Footer />
    </div>
  );
}
