import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Trophy, Tv, AlertCircle, RefreshCw, PlayCircle, ExternalLink, 
  CalendarDays, Activity, ChevronRight, Bell, Calendar, Flame,
  Menu, Search
} from "lucide-react";
import apiHelper from "../services/apiHelper";
import { useAuth } from "../contexts/AuthContext";
import LiveTVPlayer from "../components/LiveTVPlayer";
import SportsMatchDetails from "../components/SportsMatchDetails";
import { NoticeMessage } from "../components/NoticeMessage";
import { Skeleton } from "../components/Skeleton";
import { useParams, useNavigate } from "react-router-dom";

const getMatchSlug = (home: string, away: string) => {
  return `${home.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-vs-${away.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}`;
};

interface Match {
  home_logo?: string;
  away_logo?: string;
  start_time?: string;
  id: string;
  home_team: string;
  away_team: string;
  home_score: string;
  away_score: string;
  status: string;
  home_abbr?: string;
  away_abbr?: string;
  m3u8_url: string | null;
  channels: Record<string, string>;
  scraped_at: string;
  status_live?: string;
  league?: string;
  round?: string;
  odds?: {
    type: string;
    value: string;
  }[];
  period_scores?: {
    home: string | number;
    away: string | number;
    name: string;
  }[];
  streams?: {
    name: string;
    url: string;
    quality?: string;
    status?: string;
    rank?: number;
  }[];
}

const SPORTS = [
  { id: "football", name: "Football", icon: "⚽" },
  { id: "basketball", name: "Basketball", icon: "🏀" },
  { id: "cricket", name: "Cricket", icon: "🏏" },
  { id: "tennis", name: "Tennis", icon: "🎾" },
  { id: "volleyball", name: "Volleyball", icon: "🏐" },
  { id: "american-football", name: "American Football", icon: "🏈" },
];

const DATES = [
  { label: "Today", date: new Date() },
  { label: "Tomorrow", date: new Date(Date.now() + 86400000) },
  { label: "Wed", date: new Date(Date.now() + 86400000 * 2) },
  { label: "Thu", date: new Date(Date.now() + 86400000 * 3) },
  { label: "Fri", date: new Date(Date.now() + 86400000 * 4) },
  { label: "Sat", date: new Date(Date.now() + 86400000 * 5) },
  { label: "Sun", date: new Date(Date.now() + 86400000 * 6) },
];

const formatDatePill = (date: Date) => {
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate().toString().padStart(2, '0');
  return `${month} ${day}`;
};

export default function Sports() {
  const { user, preferences } = useAuth();
  const { matchSlug } = useParams();
  const navigate = useNavigate();

  const [activeSport, setActiveSport] = useState<string>("football");
  const [activeDateIndex, setActiveDateIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState("All");
  
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<{ match: Match; initialStreamUrl?: string } | null>(null);

  const fetchMatches = async (sport: string = activeSport, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await apiHelper.get(`/api/matches?sport=${sport}`);
      const rawMatches: Match[] = response.data.matches || [];
      const uniqueMatches: Match[] = [];
      const seenIds = new Set<string>();
      for (const m of rawMatches) {
        if (m && m.id && !seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueMatches.push(m);
        }
      }
      setMatches(uniqueMatches);
      
      if (selectedMatch) {
        const updated = uniqueMatches.find(m => m.id === selectedMatch.match.id);
        if (updated) {
          setSelectedMatch(prev => prev ? { ...prev, match: updated } : null);
        }
      }
    } catch (err: any) {
      console.error(`Failed to fetch matches:`, err);
      setError(`Failed to load matches. The servers might be busy.`);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(activeSport);
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(() => {
      fetchMatches(activeSport, true);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [activeSport]);

  // Synchronize router slug param with selectedMatch state
  useEffect(() => {
    if (matchSlug && matches.length > 0) {
      const matched = matches.find(m => {
        const slug = getMatchSlug(m.home_team, m.away_team);
        if (slug === matchSlug.toLowerCase()) return true;
        
        // Loose check: see if home and away team names exist in the slug
        const cleanSlug = matchSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanHome = m.home_team.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanAway = m.away_team.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanSlug.includes(cleanHome) && cleanSlug.includes(cleanAway);
      });
      
      if (matched) {
        setSelectedMatch({ match: matched });
      } else {
        // If matchSlug is present but no match is found, we can query all matches instead of just activeSport
        // to see if we can locate it across any sport
        const searchAcrossAll = async () => {
          try {
            const promises = SPORTS.map(s => apiHelper.get(`/api/matches?sport=${s.id}`));
            const responses = await Promise.all(promises);
            const allMatches = responses.flatMap(r => r.data.matches || []);
            const found = allMatches.find(m => {
              const slug = getMatchSlug(m.home_team, m.away_team);
              if (slug === matchSlug.toLowerCase()) return true;
              const cleanSlug = matchSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
              const cleanHome = m.home_team.toLowerCase().replace(/[^a-z0-9]/g, '');
              const cleanAway = m.away_team.toLowerCase().replace(/[^a-z0-9]/g, '');
              return cleanSlug.includes(cleanHome) && cleanSlug.includes(cleanAway);
            });
            if (found) {
              setSelectedMatch({ match: found });
            } else {
              navigate("/sports");
            }
          } catch {
            navigate("/sports");
          }
        };
        searchAcrossAll();
      }
    } else if (!matchSlug && selectedMatch) {
      setSelectedMatch(null);
    }
  }, [matchSlug, matches]);

  const handleOpenMatchDetails = (match: Match) => {
    navigate(`/sports/live/${getMatchSlug(match.home_team, match.away_team)}`);
  };

  const handleBack = () => {
    navigate("/sports");
  };

  if (preferences?.kidsMode) {
    return (
      <div className="pt-24 pb-32 px-6 flex flex-col items-center justify-center text-center min-h-[60vh]">
        <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-brand" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Not Available in Kids Mode</h2>
        <p className="text-gray-400 max-w-md">
          Live sports are currently restricted in Kids Mode. Please switch to a regular profile to access the Sports Hub.
        </p>
      </div>
    );
  }

  // If a match is selected, show the details view
  if (selectedMatch) {
    return (
      <SportsMatchDetails 
        match={selectedMatch.match} 
        initialStreamUrl={selectedMatch.initialStreamUrl} 
        onBack={handleBack} 
      />
    );
  }

  const liveMatches = matches.filter(m => m.status === "LIVE" || m.status === "HALF_TIME");
  const upcomingMatches = matches.filter(m => m.status === "UPCOMING");
  const finishedMatches = matches.filter(m => m.status === "FINISHED");
  
  const featuredMatch = liveMatches.length > 0 ? liveMatches[0] : (upcomingMatches.length > 0 ? upcomingMatches[0] : null);

  const renderStatusLive = (match: Match) => {
    if (match.status === "LIVE" || match.status === "Living") {
       if (match.status_live && match.status_live !== "Living" && match.status_live !== "Unknown" && !match.status_live.toLowerCase().includes("unknown")) {
         return isNaN(Number(match.status_live)) ? match.status_live : `${match.status_live}'`;
       }
       return 'LIVE';
    }
    if (match.status === "HALF_TIME") return "HT";
    if (match.status === "FINISHED") return "FT";
    return "";
  };

  return (
    <div className="min-h-screen bg-[#080808] text-[#F5F5F7] pb-32 font-sans selection:bg-[#FF3B30]/30 selection:text-white">
      {/* HEADER */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#080808]/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 sm:px-6 py-4 flex items-center justify-between pt-safe">
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-white font-black text-sm sm:text-lg tracking-tight uppercase flex items-center gap-2">
            <span className="w-6 h-6 bg-[#FF3B30] rounded-full flex items-center justify-center text-white text-xs shadow-[0_0_10px_rgba(255,59,48,0.5)]">
               <Trophy className="w-3.5 h-3.5" />
            </span>
            Axis Sports Hub
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF3B30] rounded-full border-[2px] border-[#080808]" />
          </button>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-brand/20 ml-1 sm:ml-2 overflow-hidden border border-white/20">
            {user?.avatar ? (
              <img src={user.avatar} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-brand">U</div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Sport Selector */}
      <div className="pt-28 px-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 min-w-max">
          {SPORTS.map((sport) => (
            <button
              key={sport.id}
              onClick={() => setActiveSport(sport.id)}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                activeSport === sport.id 
                  ? "bg-[#FF3B30]/10 text-white border border-[#FF3B30]/30" 
                  : "bg-white/[0.06] text-[#A1A1AA] border border-white/5 hover:bg-white/[0.10] hover:text-white"
              }`}
            >
              <span>{sport.icon}</span>
              {sport.name}
            </button>
          ))}
        </div>
      </div>

      {loading && matches.length === 0 ? (
        <div className="px-6 mt-8 flex flex-col gap-8">
           <Skeleton className="w-full h-64 rounded-[28px] bg-white/5" />
           <div className="flex gap-4">
             <Skeleton className="flex-1 h-24 rounded-2xl bg-white/5" />
             <Skeleton className="flex-1 h-24 rounded-2xl bg-white/5" />
             <Skeleton className="flex-1 h-24 rounded-2xl bg-white/5" />
           </div>
        </div>
      ) : error && matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="w-12 h-12 text-[#FF3B30] mb-4 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
          <p className="text-[#A1A1AA] max-w-md mb-6">{error}</p>
          <button 
            onClick={() => fetchMatches(activeSport)}
            className="flex items-center gap-2 px-6 py-3 bg-[#FF3B30]/20 hover:bg-[#FF3B30]/30 text-[#FF3B30] rounded-full font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      ) : (
        <div className="px-6 mt-6 max-w-7xl mx-auto flex flex-col gap-8">
          
          {/* FEATURED LIVE MATCH CARD */}
          {featuredMatch && (
            <div 
              onClick={() => handleOpenMatchDetails(featuredMatch)}
              className="relative w-full rounded-[28px] overflow-hidden bg-white/[0.04] border border-white/[0.08] cursor-pointer group"
            >
              {/* Cinematic Background */}
              <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.05] via-[#080808]/80 to-[#080808] z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/60 to-[#080808] z-10" />
                <img 
                  src="https://images.unsplash.com/photo-1577223625816-7546f13df25d?q=80&w=1200&auto=format&fit=crop" 
                  alt="Stadium" 
                  className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>

              <div className="relative z-20 p-6 sm:p-8 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    {(featuredMatch.status === "LIVE" || featuredMatch.status === "HALF_TIME") ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FF3B30]/20 border border-[#FF3B30]/40 text-[#FF3B30] text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                        <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                        LIVE
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest rounded-full backdrop-blur-md">
                        UPCOMING
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-[#A1A1AA] font-medium">
                      <Flame className="w-3.5 h-3.5" /> 12.4K watching
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-white/10 border border-white/10 rounded uppercase text-[10px] font-bold tracking-wider text-[#A1A1AA]">
                    HD
                  </span>
                </div>

                <div className="flex items-center justify-between mb-6 max-w-xl mx-auto w-full">
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center p-3 shadow-lg backdrop-blur-sm">
                      {featuredMatch.home_logo ? (
                        <img src={featuredMatch.home_logo} className="w-full h-full object-contain drop-shadow-md" alt={featuredMatch.home_team} />
                      ) : (
                        <span className="text-2xl">🛡️</span>
                      )}
                    </div>
                    <span className="mt-4 font-bold text-sm sm:text-base text-center line-clamp-1">{featuredMatch.home_abbr || featuredMatch.home_team.substring(0,3).toUpperCase()}</span>
                  </div>

                  <div className="flex flex-col items-center flex-1 px-4">
                    {(featuredMatch.status === "UPCOMING") ? (
                       <span className="text-2xl sm:text-3xl font-light tracking-tight text-[#A1A1AA] mb-2">VS</span>
                    ) : (
                      <div className="flex items-center gap-4 text-4xl sm:text-5xl font-bold tracking-tighter text-white drop-shadow-md mb-2">
                        <span>{featuredMatch.home_score}</span>
                        <span className="text-white/30 text-3xl font-light">-</span>
                        <span>{featuredMatch.away_score}</span>
                      </div>
                    )}
                    <span className="px-3 py-1 bg-[#FF3B30]/20 text-[#FF3B30] rounded-full text-xs font-bold tracking-wider">
                      {renderStatusLive(featuredMatch)}
                    </span>
                    <span className="mt-3 text-xs text-[#A1A1AA] text-center line-clamp-1">{featuredMatch.league || "International"}</span>
                  </div>

                  <div className="flex flex-col items-center flex-1">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center p-3 shadow-lg backdrop-blur-sm">
                      {featuredMatch.away_logo ? (
                        <img src={featuredMatch.away_logo} className="w-full h-full object-contain drop-shadow-md" alt={featuredMatch.away_team} />
                      ) : (
                        <span className="text-2xl">⚔️</span>
                      )}
                    </div>
                    <span className="mt-4 font-bold text-sm sm:text-base text-center line-clamp-1">{featuredMatch.away_abbr || featuredMatch.away_team.substring(0,3).toUpperCase()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                    Watch Live
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA] font-medium">
                    <Activity className="w-3.5 h-3.5" />
                    {featuredMatch.streams?.length || "Multiple"} Streams
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QUICK STATS */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/[0.04] border border-[#FF3B30]/30 rounded-[20px] p-4 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#FF3B30]/10 to-transparent pointer-events-none" />
              <Activity className="w-5 h-5 text-[#FF3B30] mb-2" />
              <span className="text-2xl font-bold text-white mb-1">{liveMatches.length}</span>
              <span className="text-[10px] font-bold text-[#FF3B30] uppercase tracking-widest">LIVE Matches</span>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-4 flex flex-col items-center justify-center">
              <CalendarDays className="w-5 h-5 text-[#00C7BE] mb-2" />
              <span className="text-2xl font-bold text-white mb-1">{upcomingMatches.length}</span>
              <span className="text-[10px] font-bold text-[#00C7BE] uppercase tracking-widest">UPCOMING Matches</span>
            </div>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-4 flex flex-col items-center justify-center">
              <Trophy className="w-5 h-5 text-[#A1A1AA] mb-2" />
              <span className="text-2xl font-bold text-white mb-1">{finishedMatches.length}</span>
              <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">FINISHED Matches</span>
            </div>
          </div>

          {/* DATE PICKER */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-2">
            <div className="flex items-center justify-center w-12 h-12 shrink-0 bg-white/[0.04] border border-white/[0.08] rounded-xl text-[#A1A1AA] mr-2">
              <Calendar className="w-5 h-5" />
            </div>
            {DATES.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDateIndex(i)}
                className={`flex flex-col items-center justify-center w-16 h-16 shrink-0 rounded-[16px] transition-colors border ${
                  activeDateIndex === i 
                    ? "bg-[#FF3B30] border-[#FF3B30] text-white" 
                    : "bg-white/[0.04] border-white/[0.08] text-[#A1A1AA] hover:bg-white/[0.08]"
                }`}
              >
                <span className={`text-[10px] uppercase tracking-wider font-bold mb-1 ${activeDateIndex === i ? 'text-white/80' : 'text-[#A1A1AA]'}`}>
                  {i === 0 ? "TODAY" : i === 1 ? "TMR" : d.label.toUpperCase()}
                </span>
                <span className={`text-sm font-bold ${activeDateIndex === i ? 'text-white' : 'text-white'}`}>
                  {formatDatePill(d.date).split(' ')[1]} {formatDatePill(d.date).split(' ')[0]}
                </span>
              </button>
            ))}
          </div>

          {/* FILTERS */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {["All", "Live", "Football", "Basketball", "Cricket"].map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
                  activeFilter === filter
                    ? filter === "Live" 
                      ? "bg-[#FF3B30]/20 text-[#FF3B30] border-[#FF3B30]/40 flex items-center gap-1.5"
                      : "bg-[#FF3B30] text-white border-[#FF3B30]"
                    : "bg-white/[0.06] text-[#A1A1AA] border-white/[0.08] hover:bg-white/[0.1]"
                }`}
              >
                {filter === "Live" && activeFilter === filter && <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-pulse" />}
                {filter}
              </button>
            ))}
          </div>

          {/* LIVE NOW SECTION */}
          {(activeFilter === "All" || activeFilter === "Live") && liveMatches.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
                  Live Now
                </h2>
                <button className="text-[#FF3B30] text-xs font-bold uppercase tracking-wider hover:opacity-80">View All</button>
              </div>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-4">
                {liveMatches.slice(0, 5).map(match => (
                  <div 
                    key={match.id}
                    onClick={() => handleOpenMatchDetails(match)}
                    className="flex-shrink-0 w-64 bg-white/[0.04] border border-white/[0.08] hover:border-white/20 rounded-[20px] p-4 cursor-pointer transition-all"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[#FF3B30]/20 text-[#FF3B30] text-[9px] font-bold uppercase rounded">
                        <span className="w-1 h-1 bg-[#FF3B30] rounded-full animate-pulse" /> LIVE
                      </span>
                      <span className="text-[10px] font-bold text-[#FF3B30]">{renderStatusLive(match)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2 w-[40%]">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                           {match.home_logo && <img src={match.home_logo} className="w-full h-full object-contain" alt={match.home_team} />}
                        </div>
                        <span className="font-bold text-xs truncate">{match.home_abbr || match.home_team.substring(0,3).toUpperCase()}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 font-bold text-sm">
                         <span>{match.home_score}</span>
                         <span className="text-white/30">-</span>
                         <span>{match.away_score}</span>
                      </div>

                      <div className="flex items-center justify-end gap-2 w-[40%] text-right">
                        <span className="font-bold text-xs truncate">{match.away_abbr || match.away_team.substring(0,3).toUpperCase()}</span>
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                           {match.away_logo && <img src={match.away_logo} className="w-full h-full object-contain" alt={match.away_team} />}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-[#A1A1AA] pt-3 border-t border-white/[0.06]">
                      <span className="truncate max-w-[120px]">{match.league || "Friendly"}</span>
                      <span className="flex items-center gap-1"><Tv className="w-3 h-3" /> {match.streams?.length || 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING MATCHES SECTION */}
          {(activeFilter === "All" || activeFilter === "Upcoming") && upcomingMatches.length > 0 && (
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00C7BE]" />
                  Upcoming Matches
                </h2>
                <button className="text-[#FF3B30] text-xs font-bold uppercase tracking-wider hover:opacity-80">View All</button>
              </div>
              
              <div className="flex flex-col gap-3">
                {upcomingMatches.slice(0, 10).map(match => (
                  <div 
                    key={match.id}
                    onClick={() => handleOpenMatchDetails(match)}
                    className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] rounded-[20px] p-4 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {match.home_logo && <img src={match.home_logo} className="w-full h-full object-contain" alt={match.home_team} />}
                        </div>
                        <span className="font-bold text-sm text-white">{match.home_team}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                          {match.away_logo && <img src={match.away_logo} className="w-full h-full object-contain" alt={match.away_team} />}
                        </div>
                        <span className="font-bold text-sm text-white">{match.away_team}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center px-4 flex-1">
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider text-center line-clamp-1 mb-1">{match.league}</span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <CalendarDays className="w-3.5 h-3.5 text-[#00C7BE]" />
                        {match.start_time ? new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 flex-1">
                      <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-full text-xs font-bold hover:bg-white/5 transition-colors text-white">
                        <PlayCircle className="w-3.5 h-3.5 text-[#FF3B30]" /> View Match
                      </button>
                      <button className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-[#A1A1AA] hover:text-white hover:bg-white/[0.1] transition-colors border border-white/[0.08]">
                        <Bell className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No matches fallback if filtered out */}
          {liveMatches.length === 0 && upcomingMatches.length === 0 && (
             <div className="py-12 flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.06] rounded-[28px] text-center px-6">
                <Trophy className="w-10 h-10 text-[#A1A1AA] mb-4 opacity-50" />
                <h3 className="text-white font-bold text-lg mb-2">No Matches Found</h3>
                <p className="text-[#A1A1AA] text-sm">There are no {activeFilter.toLowerCase()} matches at the moment.</p>
             </div>
          )}

        </div>
      )}
    </div>
  );
}

