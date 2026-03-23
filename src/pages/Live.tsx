import { useState, useEffect } from "react";
import { movieService } from "../services/movieService";
import { LiveMatch } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PopcornLoader from "../components/PopcornLoader";
import { Radio, Trophy, Clock, PlayCircle, ExternalLink, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

export default function Live() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const loadLive = async () => {
      try {
        const data = await movieService.getLive();
        setMatches(data);
      } catch (e) {
        console.error("Failed to load live matches", e);
      } finally {
        setLoading(false);
      }
    };
    loadLive();
  }, []);

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
        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 bg-red-600/20 rounded-2xl border border-red-600/30">
            <Radio className="w-8 h-8 text-red-600 animate-pulse" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">Live Sports</h1>
            <p className="text-gray-400">Stream live matches and events from around the world</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-40">
            <PopcornLoader />
          </div>
        ) : matches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match, idx) => (
              <motion.div
                key={`${match.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 hover:border-white/20 transition-all duration-500"
              >
                {/* Match Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>{match.leagueName}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-600/20 border border-red-600/30 rounded-full text-[10px] font-bold text-red-600 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>

                {/* Match Content */}
                <div className="p-8 space-y-8">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 text-center space-y-3">
                      <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                        {match.homeLogo ? (
                          <img src={match.homeLogo} alt={match.homeName} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 bg-white/5 rounded-lg" />
                        )}
                      </div>
                      <p className="text-sm font-bold line-clamp-1">{match.homeName}</p>
                    </div>

                    <div className="text-center space-y-1">
                      <div className="text-3xl font-black tracking-tighter">
                        {match.homeScore} : {match.awayScore}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest justify-center">
                        <Clock className="w-3 h-3" />
                        <span>{match.matchTime}</span>
                      </div>
                    </div>

                    <div className="flex-1 text-center space-y-3">
                      <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500">
                        {match.awayLogo ? (
                          <img src={match.awayLogo} alt={match.awayName} className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 bg-white/5 rounded-lg" />
                        )}
                      </div>
                      <p className="text-sm font-bold line-clamp-1">{match.awayName}</p>
                    </div>
                  </div>
                </div>

                {/* Match Footer / Action */}
                <div className="p-6 pt-0">
                  <button className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group/btn">
                    <PlayCircle className="w-5 h-5" />
                    <span>Watch Match</span>
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
              <Radio className="w-10 h-10 text-gray-500" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">No Live Matches</h3>
              <p className="text-gray-400">There are no live sports matches currently streaming. Check back later!</p>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
