import { useState, useEffect } from "react";
import { movieService } from "../services/movieService";
import { RankingItem } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { Trophy, Star, TrendingUp, ChevronRight, Play, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import { MovieImage } from "../components/MovieImage";

export default function Ranking() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const loadRankings = async () => {
      try {
        if (rankings.length === 0) setLoading(true);
        const data = await movieService.getRanking();
        setRankings(data.slice(0, 50));
      } catch (e) {
        console.error("Failed to load rankings", e);
      } finally {
        setLoading(false);
      }
    };
    loadRankings();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      
      <div className="pt-28 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <button 
          onClick={handleBack}
          className="mb-8 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 bg-brand/20 rounded-2xl border border-brand/30">
            <Trophy className="w-8 h-8 text-brand" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2 tracking-tight">Top Rankings</h1>
            <p className="text-gray-400">The most popular and highly-rated content right now</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <PopcornLoader />
          </div>
        ) : rankings.length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {rankings.map((item, idx) => (
              <motion.div
                key={`${item.id}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-500"
              >
                <Link to={`/details/${item.id}`} className="flex items-center gap-6 p-6 md:p-8">
                  {/* Rank Number */}
                  <div className="flex-shrink-0 w-12 md:w-20 text-center">
                    <span className={`text-4xl md:text-6xl font-black italic tracking-tighter ${idx < 3 ? 'text-brand' : 'text-gray-700'}`}>
                      {idx + 1}
                    </span>
                  </div>

                  {/* Poster */}
                  <div className="flex-shrink-0 w-20 md:w-32 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform duration-500">
                    {item.cover || item.poster ? (
                      <MovieImage 
                        src={item.cover || item.poster} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500 text-xs text-center p-4">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 space-y-2 md:space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>{item.type == 1 || item.type === '1' || item.type === 'Movie' || item.category === 'Movies' ? 'Movie' : 'Series'}</span>
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold group-hover:text-brand transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-4 text-sm font-medium text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span>{item.score || item.rating || 'N/A'}</span>
                      </div>
                      <div className="w-1 h-1 bg-white/20 rounded-full" />
                      <span>{item.year || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="hidden md:flex flex-shrink-0 items-center gap-4">
                    <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-brand group-hover:text-white group-hover:shadow-[0_0_20px_rgba(229,9,20,0.5)] transition-all duration-500">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </div>
                    <ChevronRight className="w-8 h-8 text-gray-700 group-hover:text-white transition-colors" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40">
            <p className="text-gray-500 text-lg">No rankings available at the moment.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
