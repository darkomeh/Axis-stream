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
    <div className="min-h-screen bg-[#000000] text-white pb-20 relative overflow-hidden">
      {/* Background Poster Collage (Subtle) */}
      <div className="fixed inset-0 z-0 opacity-10 blur-[100px] pointer-events-none">
        <img 
          src="https://picsum.photos/seed/cinema-ranking/1920/1080?blur=10" 
          alt="background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-black to-black" />
      </div>

      <Navbar />
      
      <div className="relative z-10 pt-28 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <motion.button 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleBack}
          className="mb-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all flex items-center gap-2 text-gray-400 hover:text-white group border border-white/5"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back</span>
        </motion.button>

        <div className="flex flex-col md:flex-row md:items-end gap-6 mb-16">
          <div className="p-5 bg-brand/10 rounded-[32px] border border-brand/20 shadow-[0_0_50px_rgba(255,45,45,0.1)]">
            <Trophy className="w-10 h-10 text-brand filter drop-shadow-[0_0_10px_rgba(255,45,45,0.5)]" />
          </div>
          <div>
            <h1 className="text-5xl md:text-7xl font-black mb-3 tracking-tighter uppercase italic leading-none">
              Axis <span className="text-brand">Rankings</span>
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">The ultimate hall of fame for cinematic excellence</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <PopcornLoader />
          </div>
        ) : rankings.length > 0 ? (
          <div className="grid grid-cols-1 gap-8">
            {rankings.map((item, idx) => (
              <motion.div
                key={`${item.id}-${idx}`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.8 }}
                className="group relative"
              >
                {/* Large Background Rank Shadow */}
                <span className="absolute -left-10 md:-left-16 top-1/2 -translate-y-1/2 font-black text-[150px] md:text-[250px] leading-none tracking-tighter text-transparent select-none opacity-10 transition-all duration-700 pointer-events-none group-hover:opacity-20 group-hover:scale-110" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.3)', fontFamily: 'Inter' }}>
                   {idx + 1}
                </span>

                <Link to={`/details/${item.id}`} className="relative block bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[40px] overflow-hidden hover:bg-white/[0.07] hover:border-white/20 transition-all duration-500 shadow-2xl active:scale-[0.99]">
                  <div className="flex items-center gap-6 md:gap-12 p-6 md:p-10">
                    
                    {/* Rank Number Circle */}
                    <div className="flex-shrink-0 w-16 h-16 md:w-24 md:h-24 rounded-full bg-black/40 border border-white/10 flex items-center justify-center z-10 shadow-inner group-hover:border-brand/50 transition-colors">
                      <span className={`text-2xl md:text-4xl font-black italic tracking-tighter ${idx < 3 ? 'text-brand' : 'text-white/40'}`}>
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Poster with Glass Frame */}
                    <div className="flex-shrink-0 w-24 md:w-44 aspect-[2/3] rounded-[24px] overflow-hidden border border-white/10 shadow-2xl group-hover:scale-105 transition-transform duration-700 relative z-10">
                      {item.cover || item.poster ? (
                        <MovieImage 
                          src={item.cover || item.poster} 
                          alt={item.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500 text-[10px] text-center p-4 font-black uppercase">
                          No Poster
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-3 md:space-y-6 z-10">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                           <TrendingUp className="w-3 h-3 text-brand" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                             {item.type == 1 || item.type === '1' || item.type === 'Movie' || item.category === 'Movies' ? 'Film' : 'Series'}
                           </span>
                        </div>
                        {idx < 3 && (
                          <span className="px-3 py-1 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(255,45,45,0.4)] animate-pulse">
                            TOP 3
                          </span>
                        )}
                      </div>

                      <h3 className="text-2xl md:text-5xl font-black group-hover:text-brand transition-all tracking-tighter leading-tight uppercase line-clamp-2 italic">
                        {item.title}
                      </h3>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#f5c518]/10 rounded-xl border border-[#f5c518]/20">
                          <Star className="w-5 h-5 text-[#f5c518] fill-[#f5c518]" />
                          <span className="text-lg md:text-xl font-black text-[#f5c518] italic">{item.score || item.rating || '9.8'}</span>
                        </div>
                        
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Released</span>
                           <span className="text-sm md:text-base font-bold text-white/60">{item.year || '2024'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="hidden lg:flex flex-shrink-0 items-center gap-6 z-10">
                      <div className="w-20 h-20 bg-white text-black rounded-[24px] flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-all duration-500 shadow-2xl transform group-hover:rotate-6 active:scale-95 group-hover:shadow-[0_0_40px_rgba(255,45,45,0.3)]">
                        <Play className="w-8 h-8 fill-current translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-xl">
            <PopcornLoader />
            <p className="text-gray-500 font-black uppercase tracking-widest mt-8">Establishing Network Connection...</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
