import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Trophy, Flame, Ghost, Heart, Zap, Shield, Star, Crown, 
  Clapperboard, Clock, Terminal, Sparkles, Tv, ListPlus, Users, 
  Smile, Compass, Award, Film, Play 
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";

// Dynamically generate all 20 achievements based on the current stats & state
export function getAchievementsList(stats: any, watchlist: any[], playlists: any[], user: any) {
  return [
    {
      id: "first_steps",
      title: "First Steps",
      icon: Play,
      color: "text-emerald-400",
      bg: "from-emerald-600/20 to-emerald-900/10",
      border: "border-emerald-500/30",
      desc: "Watch your first cinematic title",
      condition: () => (stats?.totalViews || 0) >= 1,
      progress: Math.min((stats?.totalViews || 0) / 1, 1),
      maxProgress: 1,
      currentProgress: stats?.totalViews || 0,
      unit: "view"
    },
    {
      id: "7-day streak",
      title: "7-Day Streak",
      icon: Flame,
      color: "text-orange-500",
      bg: "from-orange-600/20 to-orange-900/10",
      border: "border-orange-500/30",
      desc: "Keep the flame burning (7 days in a row)",
      condition: () => (stats?.currentStreak || 0) >= 7,
      progress: Math.min((stats?.currentStreak || 0) / 7, 1),
      maxProgress: 7,
      currentProgress: stats?.currentStreak || 0,
      unit: "days"
    },
    {
      id: "30-day streak",
      title: "Monthly Marathon",
      icon: Crown,
      color: "text-red-500",
      bg: "from-red-600/20 to-red-900/10",
      border: "border-red-500/30",
      desc: "Ultimate dedication (30 days in a row)",
      condition: () => (stats?.currentStreak || 0) >= 30,
      progress: Math.min((stats?.currentStreak || 0) / 30, 1),
      maxProgress: 30,
      currentProgress: stats?.currentStreak || 0,
      unit: "days"
    },
    {
      id: "Weekend Binger",
      title: "Weekend Binger",
      icon: Zap,
      color: "text-yellow-500",
      bg: "from-yellow-600/20 to-yellow-900/10",
      border: "border-yellow-500/30",
      desc: "Watch 5 titles on the weekends",
      condition: () => (stats?.weekendCount || 0) >= 5 || (stats?.totalViews || 0) >= 5,
      progress: Math.min((stats?.weekendCount || stats?.totalViews || 0) / 5, 1),
      maxProgress: 5,
      currentProgress: stats?.weekendCount || Math.min(stats?.totalViews || 0, 5),
      unit: "views"
    },
    {
      id: "Cinephile",
      title: "Cinephile",
      icon: Clapperboard,
      color: "text-blue-500",
      bg: "from-blue-600/20 to-blue-900/10",
      border: "border-blue-500/30",
      desc: "Add 10 items to your watchlist",
      condition: () => (watchlist?.length || 0) >= 10,
      progress: Math.min((watchlist?.length || 0) / 10, 1),
      maxProgress: 10,
      currentProgress: watchlist?.length || 0,
      unit: "items"
    },
    {
      id: "Time Traveler",
      title: "Time Traveler",
      icon: Clock,
      color: "text-purple-500",
      bg: "from-purple-600/20 to-purple-900/10",
      border: "border-purple-500/30",
      desc: "Watch over 10 hours of premium content",
      condition: () => (stats?.watchTimeMinutes || 0) >= 600,
      progress: Math.min((stats?.watchTimeMinutes || 0) / 600, 1),
      maxProgress: 10,
      currentProgress: Math.floor((stats?.watchTimeMinutes || 0) / 60),
      unit: "hrs"
    },
    {
      id: "Horror Master",
      title: "Horror Master",
      icon: Ghost,
      color: "text-emerald-400",
      bg: "from-emerald-600/20 to-emerald-900/10",
      border: "border-emerald-500/30",
      desc: "Expert of the dark arts (Watch 5 Horror)",
      condition: () => (stats?.genreProgress?.Horror || 0) >= 5,
      progress: Math.min((stats?.genreProgress?.Horror || 0) / 5, 1),
      maxProgress: 5,
      currentProgress: stats?.genreProgress?.Horror || 0,
      unit: "movies"
    },
    {
      id: "Romance King",
      title: "Romance King",
      icon: Heart,
      color: "text-pink-500",
      bg: "from-pink-600/20 to-pink-900/10",
      border: "border-pink-500/30",
      desc: "True romantic at heart (Watch 5 Romance)",
      condition: () => (stats?.genreProgress?.Romance || 0) >= 5,
      progress: Math.min((stats?.genreProgress?.Romance || 0) / 5, 1),
      maxProgress: 5,
      currentProgress: stats?.genreProgress?.Romance || 0,
      unit: "movies"
    },
    {
      id: "the_architect",
      title: "The Architect",
      icon: Terminal,
      color: "text-red-500 font-mono font-bold tracking-widest animate-pulse",
      bg: "from-red-950/40 via-black to-red-950/20 shadow-[0_0_20px_rgba(229,9,20,0.4)]",
      border: "border-red-500/50",
      desc: "Special Creator badge reserved exclusively for the Dev God.",
      condition: () => user?.email?.toLowerCase() === 'greatmayuku2@gmail.com',
      progress: user?.email?.toLowerCase() === 'greatmayuku2@gmail.com' ? 1 : 0,
      maxProgress: 1,
      currentProgress: user?.email?.toLowerCase() === 'greatmayuku2@gmail.com' ? 1 : 0,
      unit: "dev"
    },
    {
      id: "elite_streamer",
      title: "Elite Streamer",
      icon: Award,
      color: "text-yellow-400",
      bg: "from-yellow-600/20 to-yellow-900/10",
      border: "border-yellow-400/30",
      desc: "Unlock premium viewing tier (Watch 15 titles)",
      condition: () => (stats?.totalViews || 0) >= 15,
      progress: Math.min((stats?.totalViews || 0) / 15, 1),
      maxProgress: 15,
      currentProgress: stats?.totalViews || 0,
      unit: "views"
    },
    {
      id: "action_junkie",
      title: "Action Junkie",
      icon: Zap,
      color: "text-orange-400",
      bg: "from-orange-600/20 to-orange-950/10",
      border: "border-orange-500/30",
      desc: "High octane action thrill (Watch 3 Action)",
      condition: () => (stats?.genreProgress?.Action || 0) >= 3,
      progress: Math.min((stats?.genreProgress?.Action || 0) / 3, 1),
      maxProgress: 3,
      currentProgress: stats?.genreProgress?.Action || 0,
      unit: "movies"
    },
    {
      id: "scifi_fanatic",
      title: "Sci-Fi Fanatic",
      icon: Compass,
      color: "text-sky-400",
      bg: "from-sky-600/20 to-sky-950/10",
      border: "border-sky-500/30",
      desc: "Beyond the cosmos (Watch 3 Sci-Fi / Fantasy)",
      condition: () => (stats?.genreProgress?.['Sci-Fi'] || stats?.genreProgress?.['Science Fiction'] || stats?.genreProgress?.['Fantasy'] || 0) >= 3,
      progress: Math.min((stats?.genreProgress?.['Sci-Fi'] || stats?.genreProgress?.['Science Fiction'] || stats?.genreProgress?.['Fantasy'] || 0) / 3, 1),
      maxProgress: 3,
      currentProgress: stats?.genreProgress?.['Sci-Fi'] || stats?.genreProgress?.['Science Fiction'] || stats?.genreProgress?.['Fantasy'] || 0,
      unit: "movies"
    },
    {
      id: "anime_otaku",
      title: "Anime Otaku",
      icon: Sparkles,
      color: "text-pink-400",
      bg: "from-pink-600/20 to-pink-950/10",
      border: "border-pink-500/30",
      desc: "Sub or Dub? (Watch 3 Anime or Cartoons)",
      condition: () => (stats?.genreProgress?.Anime || stats?.genreProgress?.Animation || 0) >= 3,
      progress: Math.min((stats?.genreProgress?.Anime || stats?.genreProgress?.Animation || 0) / 3, 1),
      maxProgress: 3,
      currentProgress: stats?.genreProgress?.Anime || stats?.genreProgress?.Animation || 0,
      unit: "titles"
    },
    {
      id: "comedy_critic",
      title: "Comedy Critic",
      icon: Smile,
      color: "text-yellow-400",
      bg: "from-yellow-600/20 to-yellow-950/10",
      border: "border-yellow-500/30",
      desc: "Laugh out loud (Watch 3 Comedy)",
      condition: () => (stats?.genreProgress?.Comedy || 0) >= 3,
      progress: Math.min((stats?.genreProgress?.Comedy || 0) / 3, 1),
      maxProgress: 3,
      currentProgress: stats?.genreProgress?.Comedy || 0,
      unit: "movies"
    },
    {
      id: "curator_pro",
      title: "Curator Pro",
      icon: ListPlus,
      color: "text-violet-400",
      bg: "from-violet-600/20 to-violet-950/10",
      border: "border-violet-500/30",
      desc: "Create custom playlists to organize content",
      condition: () => (playlists?.length || 0) >= 1,
      progress: Math.min((playlists?.length || 0) / 1, 1),
      maxProgress: 1,
      currentProgress: playlists?.length || 0,
      unit: "playlist"
    },
    {
      id: "social_star",
      title: "Social Star",
      icon: Users,
      color: "text-indigo-400",
      bg: "from-indigo-600/20 to-indigo-950/10",
      border: "border-indigo-500/30",
      desc: "Active with our premium community features",
      condition: () => (stats?.totalViews || 0) >= 8,
      progress: Math.min((stats?.totalViews || 0) / 8, 1),
      maxProgress: 8,
      currentProgress: stats?.totalViews || 0,
      unit: "views"
    },
    {
      id: "cinematic_explorer",
      title: "Cinematic Explorer",
      icon: Compass,
      color: "text-teal-400",
      bg: "from-teal-600/20 to-teal-950/10",
      border: "border-teal-500/30",
      desc: "Explore 3 different genres of movies/series",
      condition: () => Object.keys(stats?.genreProgress || {}).length >= 3,
      progress: Math.min(Object.keys(stats?.genreProgress || {}).length / 3, 1),
      maxProgress: 3,
      currentProgress: Object.keys(stats?.genreProgress || {}).length,
      unit: "genres"
    },
    {
      id: "purity_streamer",
      title: "Pure Streamer",
      icon: Tv,
      color: "text-lime-400",
      bg: "from-lime-600/20 to-lime-950/10",
      border: "border-lime-500/30",
      desc: "Enjoy Axis TV ad-free native stream (Watch 12 titles)",
      condition: () => (stats?.totalViews || 0) >= 12,
      progress: Math.min((stats?.totalViews || 0) / 12, 1),
      maxProgress: 12,
      currentProgress: stats?.totalViews || 0,
      unit: "views"
    },
    {
      id: "movie_buff",
      title: "Movie Buff",
      icon: Film,
      color: "text-amber-500",
      bg: "from-amber-600/20 to-amber-950/10",
      border: "border-amber-500/30",
      desc: "High volume premium viewer (Watch 20 or more titles)",
      condition: () => (stats?.totalViews || 0) >= 20,
      progress: Math.min((stats?.totalViews || 0) / 20, 1),
      maxProgress: 20,
      currentProgress: stats?.totalViews || 0,
      unit: "views"
    },
    {
      id: "super_fan",
      title: "Axis Super Fan",
      icon: Trophy,
      color: "text-fuchsia-400",
      bg: "from-fuchsia-600/20 to-fuchsia-950/10",
      border: "border-fuchsia-500/30",
      desc: "Ultimate cinematic master (views & watchlist combined)",
      condition: () => (stats?.totalViews || 0) >= 10 && (watchlist?.length || 0) >= 3,
      progress: Math.min(((stats?.totalViews || 0) + (watchlist?.length || 0)) / 13, 1),
      maxProgress: 13,
      currentProgress: (stats?.totalViews || 0) + (watchlist?.length || 0),
      unit: "points"
    }
  ];
}

export default function Achievements() {
  const navigate = useNavigate();
  const { user, stats, watchlist, playlists } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const handleBack = () => {
    navigate(-1);
  };

  const allAchievements = getAchievementsList(stats, watchlist || [], playlists || [], user);
  
  // Showcase is strictly completed achievements, max 6
  const earnedShowcase = allAchievements.filter(a => a.condition()).slice(0, 6);

  // Filtered achievements for the main grid
  const filteredAchievements = allAchievements.filter(achievement => {
    const isEarned = achievement.condition();
    if (activeFilter === 'unlocked') return isEarned;
    if (activeFilter === 'locked') return !isEarned;
    return true;
  });

  return (
    <div className="min-h-screen bg-black text-white pb-32 overflow-x-hidden pt-24 font-sans selection:bg-brand/30">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-brand/5 to-black pointer-events-none" />

      {/* Custom Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-6 md:px-12 backdrop-blur-3xl bg-black/40 border-b border-white/5">
        <button
          onClick={handleBack}
          className="flex items-center gap-3 transition-colors group"
        >
          <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Achievements
          </h1>
        </button>
        <div className="flex items-center gap-2 bg-brand/10 px-4 py-2 rounded-full border border-brand/20">
            <Trophy className="w-4 h-4 text-brand" />
            <span className="text-sm font-bold text-brand">{allAchievements.filter(a => a.condition()).length} / {allAchievements.length}</span>
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 space-y-12">
        
        {/* PREMIUM SHOWCASE TAB - MAX 6 EARNED */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold tracking-wider flex items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">
                <Star className="w-5 h-5 text-yellow-400 fill-current animate-spin" style={{ animationDuration: '6s' }} />
                EARNED SHOWCASE (MAX 6)
              </h2>
              <p className="text-xs text-gray-400 mt-1">Your proudest moments displayed for the world to see</p>
            </div>
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
              {earnedShowcase.length} Showcase badges
            </span>
          </div>

          {earnedShowcase.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {earnedShowcase.map((achievement, idx) => {
                const Icon = achievement.icon;
                const isArchitect = achievement.id === "the_architect";
                return (
                  <motion.div
                    key={`showcase-${achievement.id}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: idx * 0.08, type: "spring", stiffness: 100 }}
                    className={`relative rounded-2xl p-4 border text-center flex flex-col items-center justify-center overflow-hidden transition-all duration-300 hover:scale-105 hover:-translate-y-1 group bg-gradient-to-b ${achievement.bg} ${isArchitect ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,9,20,0.3)]' : 'border-brand/40 shadow-[0_4px_20px_rgba(229,9,20,0.15)]'}`}
                  >
                    {/* Rotating Premium Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-brand/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/30 border border-white/10 mb-3 relative z-10">
                      <Icon className={`w-6 h-6 ${achievement.color}`} />
                    </div>

                    <h3 className="text-xs font-extrabold text-white tracking-wide truncate w-full relative z-10">{achievement.title}</h3>
                    <span className="text-[9px] text-brand font-bold uppercase tracking-widest mt-1 relative z-10">UNLOCKED</span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-8 text-center"
            >
              <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-300">Your Earned Showcase is Empty</p>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Watch premium films, compile custom playlists, or maintain a daily watch streak to lock in your elite Showcase trophies!
              </p>
            </motion.div>
          )}
        </div>

        {/* ALL ACHIEVEMENTS GRID WITH FILTER CONTROLS */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-brand" />
                All Achievements
              </h2>
              <p className="text-xs text-gray-400 mt-1">Unlock and track progress on all 20 of our unique trophies</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeFilter === 'all' ? 'bg-brand text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                All ({allAchievements.length})
              </button>
              <button
                onClick={() => setActiveFilter('unlocked')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeFilter === 'unlocked' ? 'bg-brand text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                Unlocked ({allAchievements.filter(a => a.condition()).length})
              </button>
              <button
                onClick={() => setActiveFilter('locked')}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${activeFilter === 'locked' ? 'bg-brand text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
              >
                In Progress ({allAchievements.filter(a => !a.condition()).length})
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredAchievements.map((achievement, idx) => {
                const isEarned = achievement.condition();
                const Icon = achievement.icon;
                
                return (
                  <motion.div
                    layout
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`relative overflow-hidden rounded-3xl p-6 border ${isEarned ? achievement.border : 'border-white/5'} ${isEarned ? `bg-gradient-to-br ${achievement.bg}` : 'bg-white/[0.02]'}`}
                  >
                    {!isEarned && <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10" />}
                    
                    <div className={`relative z-20 flex flex-col h-full ${!isEarned ? 'opacity-50' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isEarned ? achievement.border : 'border-white/10'} ${isEarned ? 'bg-black/20' : 'bg-white/5'}`}>
                                <Icon className={`w-7 h-7 ${isEarned ? achievement.color : 'text-gray-500'}`} />
                            </div>
                            {isEarned && (
                                <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center text-brand">
                                    <Star className="w-4 h-4 fill-current" />
                                </div>
                            )}
                        </div>
                        
                        <h3 className="text-lg font-bold tracking-wide text-white mb-2">{achievement.title}</h3>
                        <p className="text-xs text-gray-400 font-medium mb-6 flex-1">{achievement.desc}</p>
                        
                        <div className="space-y-2 mt-auto">
                            <div className="flex justify-between items-end text-[10px] font-bold text-gray-500 tracking-wider">
                                <span>PROGRESS</span>
                                <span>{achievement.currentProgress} / {achievement.maxProgress} {achievement.unit}</span>
                            </div>
                            <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${achievement.progress * 100}%` }}
                                    transition={{ duration: 1, delay: 0.1 }}
                                    className={`h-full ${isEarned ? 'bg-brand shadow-[0_0_10px_rgba(255,45,45,0.8)]' : 'bg-gray-600'}`} 
                                />
                            </div>
                        </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
