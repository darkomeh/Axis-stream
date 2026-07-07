import { useState, useEffect } from "react";
import { movieService } from "../services/movieService";
import { getAdminConfig } from "../services/firebaseService";
import { RankingItem } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Skeleton, ListSkeleton, CardSkeleton } from "../components/Skeleton";
import { 
  Trophy, 
  Star, 
  TrendingUp, 
  ChevronRight, 
  Play, 
  ArrowLeft, 
  Award, 
  Tv, 
  Clapperboard, 
  Calendar, 
  Sparkles,
  Flame,
  Medal,
  Activity
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { MovieImage } from "../components/MovieImage";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

export default function Ranking() {
  const navigate = useNavigate();
  const { openPreview } = useMediaPreview();
  const [allRankings, setAllRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Custom filter category
  const [activeCategory, setActiveCategory] = useState<"all" | "movies" | "series">("all");
  // Timeframe selector
  const [selectedTimeframe, setSelectedTimeframe] = useState<"all-time" | "trending">("all-time");

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const loadRankings = async () => {
    try {
      if (allRankings.length === 0) setLoading(true);
      setError(null);
      const [data, adminConfig, hotResult] = await Promise.all([
        movieService.getRanking(),
        getAdminConfig(),
        movieService.getHot()
      ]);
      
      let baseRankings = [...data];
      
      // Inject admin spotlights if enabled
      if (adminConfig?.spotlights?.top10) {
        const top10 = adminConfig.spotlights.top10;
        for (let i = 0; i < 10; i++) {
          if (top10[i]) {
            const existingIndex = baseRankings.findIndex(r => r.id === top10[i].id);
            if (existingIndex !== -1 && existingIndex !== i) {
              baseRankings.splice(existingIndex, 1);
            }
            if (baseRankings.length > i) baseRankings[i] = { ...baseRankings[i], ...top10[i] };
            else baseRankings.push(top10[i] as any);
          }
        }
      }

      // Mix in Hot movies/series to ensure we have at least 40 high quality items
      let pool: any[] = [];
      if (hotResult) {
        pool = [...hotResult.movies, ...hotResult.series];
      }

      let finalRankings = [...baseRankings];
      
      if (finalRankings.length < 50 && pool.length > 0) {
        const shuffledPool = pool.sort(() => 0.5 - Math.random());
        for (const item of shuffledPool) {
          if (finalRankings.length >= 50) break;
          if (!finalRankings.find(r => r.id === item.id)) {
            finalRankings.push({
              ...item,
              score: item.score || item.rating || "9.5",
              cover: item.cover || item.poster
            });
          }
        }
      }

      // Format types explicitly
      const formatted = finalRankings.map(item => {
        const isSeries = item.type === 2 || item.type === '2' || String(item.type).toLowerCase() === 'series' || String(item.category).toLowerCase() === 'series';
        return {
          ...item,
          formattedType: isSeries ? 'Series' : 'Movie'
        };
      });

      setAllRankings(formatted);
    } catch (e) {
      console.error("Failed to load rankings", e);
      setError("Failed to load rankings. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  // Filter the loaded list dynamically based on category
  const filteredItems = allRankings.filter(item => {
    if (activeCategory === "all") return true;
    if (activeCategory === "movies") return (item as any).formattedType === "Movie";
    if (activeCategory === "series") return (item as any).formattedType === "Series";
    return true;
  });

  // Sort based on timeframe selected (all-time highest score vs simulated trending)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (selectedTimeframe === "trending") {
      // Shuffled sort/trending score
      const scoreA = parseFloat(String(a.score || a.rating || "5.0")) + (Number(a.id) % 10) * 0.05;
      const scoreB = parseFloat(String(b.score || b.rating || "5.0")) + (Number(b.id) % 10) * 0.05;
      return scoreB - scoreA;
    }
    const valA = parseFloat(String(a.score || a.rating || "0.0"));
    const valB = parseFloat(String(b.score || b.rating || "0.0"));
    return valB - valA;
  });

  // Break items into top 3 (Podium) and next (List)
  const podiumItems = sortedItems.slice(0, 3);
  const listItems = sortedItems.slice(3);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center">
        <Trophy className="w-16 h-16 text-red-500 mb-6 opacity-80" />
        <h2 className="text-fluid-2xl font-bold text-white mb-3">Ranking System Unstable</h2>
        <p className="text-gray-400 max-w-md mb-8">{error}</p>
        <button onClick={loadRankings} className="px-8 py-3.5 bg-brand hover:bg-brand/90 text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(255,45,45,0.4)]">
          Rehydrate Database
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-24 relative overflow-hidden font-sans">
      {/* Background Poster Collage (Ambient & Sophisticated) */}
      <div className="fixed inset-0 z-0 opacity-[0.03] blur-[80px] pointer-events-none transition-opacity duration-1000">
        <img 
          src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=50&blur=8" 
          alt="immersive bg" 
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
      </div>

      <Navbar />
      
      {/* Dynamic Glowing Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="absolute top-1/2 left-10 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <div className="relative z-10 pt-24 px-fluid max-w-[1400px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
          <motion.button 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={handleBack}
            className="self-start p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all flex items-center gap-2 text-gray-400 hover:text-white group border border-white/5 shadow-lg backdrop-blur-md"
          >
            <ArrowLeft className="w-4.5 h-4.5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-fluid-xs font-bold uppercase tracking-wider pr-1">Back</span>
          </motion.button>
        </div>

        {/* Header Title Grid */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12 pb-8 border-b border-white/5">
          <div className="space-y-3">
            <h1 className="text-fluid-4xl md:text-fluid-5xl font-black mb-1 tracking-tight leading-none">
              GLOBAL RANKINGS
            </h1>
          </div>

          {/* Filter/Timeframe Control Center */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            {/* Category Selector */}
            <div className="bg-black/40 border border-white/5 rounded-2xl p-1.5 flex items-center shadow-2xl backdrop-blur-md">
              <button
                onClick={() => setActiveCategory("all")}
                className={`px-5 py-2 rounded-xl text-fluid-xs font-bold transition-all duration-300 uppercase tracking-wider ${
                  activeCategory === "all" 
                    ? "bg-brand text-white shadow-[0_4px_15px_rgba(255,45,45,0.4)]" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                All Content
              </button>
              <button
                onClick={() => setActiveCategory("movies")}
                className={`px-5 py-2 rounded-xl text-fluid-xs font-bold transition-all duration-300 uppercase tracking-wider ${
                  activeCategory === "movies" 
                    ? "bg-brand text-white shadow-[0_4px_15px_rgba(255,45,45,0.4)]" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Movies
              </button>
              <button
                onClick={() => setActiveCategory("series")}
                className={`px-5 py-2 rounded-xl text-fluid-xs font-bold transition-all duration-300 uppercase tracking-wider ${
                  activeCategory === "series" 
                    ? "bg-brand text-white shadow-[0_4px_15px_rgba(255,45,45,0.4)]" 
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Series
              </button>
            </div>

            {/* Timeframe Selector */}
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-1 flex items-center">
              <button
                onClick={() => setSelectedTimeframe("all-time")}
                className={`p-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all ${
                  selectedTimeframe === "all-time" 
                    ? "text-[#f5c518] bg-white/5 rounded-xl" 
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                ALL-TIME
              </button>
              <button
                onClick={() => setSelectedTimeframe("trending")}
                className={`p-2.5 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all flex items-center gap-1.5 ${
                  selectedTimeframe === "trending" 
                    ? "text-brand bg-white/5 rounded-xl" 
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                TRENDING
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-12 py-12 max-w-[1300px] mx-auto px-4">
            {/* Podium skeletons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end min-h-[300px] md:min-h-[450px]">
              <Skeleton className="h-64 rounded-3xl" />
              <Skeleton className="h-80 rounded-3xl" />
              <Skeleton className="h-56 rounded-3xl" />
            </div>
            {/* Grid list skeletons */}
            <div className="space-y-4 pt-8">
              <Skeleton className="h-6 w-48 rounded" />
              <ListSkeleton count={6} />
            </div>
          </div>
        ) : sortedItems.length > 0 ? (
          <div>
            {/* ================= PODIUM GLASS DISPLAY (TOP 3) ================= */}
            <div className="mb-16">
              {/* Desktop/Tablet Podium: Side-By-Side Design */}
              <div className="hidden md:grid grid-cols-3 gap-8 items-end max-w-[1300px] mx-auto min-h-[600px]">
                
                {/* 2nd Place Podium (Left) */}
                {podiumItems[1] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="flex flex-col items-center"
                  >
                    <div 
                      role="button"
                      onClick={() => openPreview(podiumItems[1].id)}
                      className="group relative w-full bg-gradient-to-b from-white/5 to-[#161616]/40 p-4 border border-white/5 rounded-[36px] hover:border-slate-400/40 transition-all duration-500 hover:shadow-[0_12px_40px_rgba(255,255,255,0.02)] flex flex-col items-center text-center cursor-pointer"
                    >
                      {/* Rank Indicator Badge */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-slate-400 to-slate-200 flex items-center justify-center font-black text-black z-20 shadow-lg text-fluid-xs">
                        2
                      </div>
                      
                      {/* Silver Shimmer Frame */}
                      <div className="relative w-72 md:w-80 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-slate-400/30 group-hover:scale-[1.03] transition-transform duration-500 shadow-2xl">
                        <MovieImage src={podiumItems[1].cover || podiumItems[1].poster} alt={podiumItems[1].title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-3 left-3 bg-[#f5c518] text-black px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-black" />
                          {podiumItems[1].score || podiumItems[1].rating || "9.5"}
                        </div>
                      </div>
                      
                      <div className="mt-5 space-y-1.5 w-full">
                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">🥈 SILVER MEDALIST</span>
                        <h3 className="font-extrabold text-fluid-base group-hover:text-brand transition-colors line-clamp-1 truncate w-full px-2">
                          {podiumItems[1].title}
                        </h3>
                        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 font-semibold">
                          <span>{podiumItems[1].year || "2024"}</span>
                          <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                          <span>{(podiumItems[1] as any).formattedType}</span>
                        </div>
                      </div>
                    </div>
                    {/* Visual Podium Base */}
                    <div className="w-4/5 h-16 bg-gradient-to-b from-white/10 to-transparent border-t border-white/10 rounded-t-2xl mt-4 flex items-center justify-center">
                      <span className="text-slate-400/80 font-black text-xl tracking-[0.3em]">II</span>
                    </div>
                  </motion.div>
                )}

                {/* 1st Place Podium (Center - Highest & Animated) */}
                {podiumItems[0] && (
                  <motion.div
                    initial={{ opacity: 0, y: 70 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0 }}
                    className="flex flex-col items-center transform -translate-y-4"
                  >
                    <div 
                      role="button"
                      onClick={() => openPreview(podiumItems[0].id)}
                      className="group relative w-full bg-gradient-to-b from-brand/10 via-[#18181a]/50 to-[#121214]/80 p-5 border-2 border-brand/20 rounded-[44px] hover:border-brand transition-all duration-500 hover:shadow-[0_20px_50px_rgba(255,45,45,0.15)] flex flex-col items-center text-center cursor-pointer"
                    >
                      {/* Premium Shimmer Golden Medal */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-gradient-to-r from-yellow-500 via-yellow-300 to-yellow-600 flex flex-col items-center justify-center font-black text-black z-20 shadow-[0_10px_30px_rgba(234,179,8,0.4)] animate-bounce-subtle">
                        <Trophy className="w-5 h-5 text-black" strokeWidth={2.5} />
                        <span className="text-[10px] leading-none mt-0.5">🏆 1</span>
                      </div>
                      
                      {/* Gold Glowing Core Frame */}
                      <div className="relative w-80 md:w-96 aspect-[2/3] rounded-3xl overflow-hidden border-3 border-[#ea9e05]/50 group-hover:scale-[1.04] transition-transform duration-500 shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
                        <MovieImage src={podiumItems[0].cover || podiumItems[0].poster} alt={podiumItems[0].title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-70" />
                        <div className="absolute bottom-4 left-4 bg-[#ea9e05] text-black px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-md">
                          <Star className="w-3.5 h-3.5 fill-black text-black" />
                          {podiumItems[0].score || podiumItems[0].rating || "9.9"}
                        </div>
                      </div>
                      
                      <div className="mt-6 space-y-2 w-full">
                        <div className="flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                          <span className="text-[10px] font-black text-[#ea9e05] uppercase tracking-widest">🥇 CHAMPION ARCHIVE</span>
                          <Sparkles className="w-3.5 h-3.5 text-yellow-500 animate-pulse" />
                        </div>
                        <h3 className="font-black text-fluid-2xl group-hover:text-brand transition-colors line-clamp-1 truncate w-full px-2 tracking-tight">
                          {podiumItems[0].title}
                        </h3>
                        <div className="flex items-center justify-center gap-3 text-sm text-gray-400 font-bold">
                          <span>{podiumItems[0].year || "2024"}</span>
                          <span className="w-2 h-2 bg-brand rounded-full" />
                          <span>{(podiumItems[0] as any).formattedType}</span>
                        </div>
                      </div>
                    </div>
                    {/* High Podium Base */}
                    <div className="w-4/5 h-20 bg-gradient-to-b from-brand/20 to-transparent border-t border-brand/30 rounded-t-3xl mt-4 flex items-center justify-center">
                      <span className="text-[#ea9e05] font-black text-2xl tracking-[0.3em]">I</span>
                    </div>
                  </motion.div>
                )}

                {/* 3rd Place Podium (Right) */}
                {podiumItems[2] && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-col items-center"
                  >
                    <div 
                      role="button"
                      onClick={() => openPreview(podiumItems[2].id)}
                      className="group relative w-full bg-gradient-to-b from-white/5 to-[#161616]/40 p-4 border border-white/5 rounded-[36px] hover:border-amber-700/40 transition-all duration-500 hover:shadow-[0_12px_40px_rgba(255,255,255,0.02)] flex flex-col items-center text-center cursor-pointer"
                    >
                      {/* Rank Indicator Badge */}
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 flex items-center justify-center font-black text-white z-20 shadow-lg text-fluid-xs">
                        3
                      </div>
                      
                      {/* Bronze Frame */}
                      <div className="relative w-72 md:w-80 aspect-[2/3] rounded-2xl overflow-hidden border-2 border-amber-600/30 group-hover:scale-[1.03] transition-transform duration-500 shadow-2xl">
                        <MovieImage src={podiumItems[2].cover || podiumItems[2].poster} alt={podiumItems[2].title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-60" />
                        <div className="absolute bottom-3 left-3 bg-[#f5c518] text-black px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-0.5">
                          <Star className="w-2.5 h-2.5 fill-black" />
                          {podiumItems[2].score || podiumItems[2].rating || "9.3"}
                        </div>
                      </div>
                      
                      <div className="mt-5 space-y-1.5 w-full">
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">🥉 BRONZE MEDALIST</span>
                        <h3 className="font-extrabold text-fluid-base group-hover:text-brand transition-colors line-clamp-1 truncate w-full px-2">
                          {podiumItems[2].title}
                        </h3>
                        <div className="flex items-center justify-center gap-3 text-xs text-gray-500 font-semibold">
                          <span>{podiumItems[2].year || "2024"}</span>
                          <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                          <span>{(podiumItems[2] as any).formattedType}</span>
                        </div>
                      </div>
                    </div>
                    {/* Visual Podium Base */}
                    <div className="w-4/5 h-12 bg-gradient-to-b from-white/10 to-transparent border-t border-white/10 rounded-t-2xl mt-4 flex items-center justify-center">
                      <span className="text-amber-600 font-black text-xl tracking-[0.3em]">III</span>
                    </div>
                  </motion.div>
                )}

              </div>

              {/* Mobile Fallback: Stacked Podium Cards */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {podiumItems.map((item, index) => {
                  const colors = [
                    { border: "border-yellow-500/40", medal: "🏆 Gold Champion", badge: "bg-yellow-500 text-black", text: "text-yellow-500" },
                    { border: "border-slate-400/30", medal: "🥈 Silver Leader", badge: "bg-slate-400 text-black", text: "text-slate-300" },
                    { border: "border-amber-700/30", medal: "🥉 Bronze Star", badge: "bg-amber-600 text-white", text: "text-amber-500" }
                  ];
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => openPreview(item.id)}
                      className={`relative flex items-center gap-4 p-3.5 rounded-2xl bg-white/[0.03] border ${colors[index]?.border || "border-white/5"} backdrop-blur-xl cursor-pointer hover:bg-white/[0.06] transition-all`}
                    >
                      {/* Left Rank Display */}
                      <div className="flex flex-col items-center justify-center pl-1 flex-shrink-0">
                        <span className="text-[10px] font-black uppercase text-gray-500 leading-none">Rank</span>
                        <span className={`text-2xl font-black ${colors[index]?.text || "text-white"} leading-tight`}>{index + 1}</span>
                      </div>
                      
                      {/* Compact Poster */}
                      <div className="w-16 h-24 rounded-xl overflow-hidden border border-white/10 flex-shrink-0 shadow-md">
                        <MovieImage src={item.cover || item.poster} alt={item.title} className="w-full h-full object-cover" />
                      </div>

                      {/* Info & Metadata */}
                      <div className="flex-1 min-w-0 text-left space-y-1">
                        <span className="text-[9px] font-black tracking-widest text-gray-400 uppercase">
                          {colors[index]?.medal}
                        </span>
                        <h4 className="font-extrabold text-sm text-white line-clamp-1 group-hover:text-brand transition-colors">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                          <span>{item.year || "2024"}</span>
                          <span className="w-1.5 h-1.5 bg-white/10 rounded-full" />
                          <span>{(item as any).formattedType}</span>
                        </div>
                      </div>

                      {/* Rating Badge */}
                      <div className="bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#f5c518] text-[#f5c518]" />
                        {item.score || item.rating || "9.5"}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ================= REMAINING LEADERBOARD GRID (4-30) ================= */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-5 h-5 text-gray-400" />
                <h3 className="text-fluid-xs font-black tracking-[0.2em] uppercase text-gray-400">Archival Contenders 04 - {sortedItems.length}</h3>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <AnimatePresence mode="popLayout">
                  {listItems.map((item, idx) => {
                    const actualRank = idx + 4;
                    return (
                      <motion.div
                        key={`${item.id}-${actualRank}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.5, delay: Math.min(idx * 0.02, 0.4) }}
                        layout
                      >
                        <div
                          role="button"
                          onClick={() => openPreview(item.id)}
                          className="group relative bg-[#0d0d0f]/60 backdrop-blur-xl border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/10 p-3.5 px-4 md:px-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-8 transition-all duration-300 cursor-pointer"
                        >
                          {/* Rank indicator */}
                          <div className="w-8 md:w-12 text-left font-sans text-fluid-lg font-black text-gray-500 group-hover:text-white transition-colors">
                            #{actualRank}
                          </div>

                          {/* Image with mini play symbol */}
                          <div className="relative w-20 h-28 md:w-28 md:h-40 rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-md">
                            <MovieImage src={item.cover || item.poster} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          </div>

                          {/* Info Column */}
                          <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1">
                              <span className="text-[9px] font-black tracking-widest text-[#f5c518] uppercase bg-white/5 px-2 py-0.5 rounded-full">
                                {(item as any).formattedType}
                              </span>
                              <span className="text-[10px] font-bold text-gray-500">{item.year || "2024"}</span>
                            </div>
                            <h4 className="font-extrabold text-fluid-xs md:text-fluid-lg tracking-tight text-white group-hover:text-brand transition-all truncate">
                              {item.title}
                            </h4>
                          </div>

                          {/* Visual score dynamic bar */}
                          <div className="hidden lg:flex flex-col items-end gap-1 flex-shrink-0 w-32 pr-4">
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Score Accuracy</span>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-brand to-[#f5c518] rounded-full transition-all duration-1000"
                                style={{ width: `${(parseFloat(String(item.score || item.rating || "9.0")) / 10) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Gold Rating badge */}
                          <div className="flex items-center gap-1 bg-[#151518]/90 border border-white/5 px-3 py-2 rounded-xl flex-shrink-0 font-bold text-xs">
                            <Star className="w-4 h-4 text-[#f5c518] fill-[#f5c518]" />
                            <span className="text-white font-black">{item.score || item.rating || "9.0"}</span>
                          </div>

                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-white/[0.02] border border-white/5 rounded-[40px] backdrop-blur-xl flex flex-col items-center justify-center gap-4">
            <Trophy className="w-12 h-12 text-white/20" />
            <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-fluid-xs">Empty Database Archive...</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
