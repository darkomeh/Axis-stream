import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Tv, AlertCircle, RefreshCw, PlayCircle, ExternalLink, CalendarDays, Activity } from "lucide-react";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import LiveTVPlayer from "../components/LiveTVPlayer";
import { NoticeMessage } from "../components/NoticeMessage";
import { Skeleton } from "../components/Skeleton";

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
  m3u8_url: string | null;
  channels: Record<string, string>;
  scraped_at: string;
  status_live?: string;
  league?: string;
  round?: string;
  sport_type?: string;
  home_abbr?: string;
  away_abbr?: string;
  odds?: {
    type: string;
    value: string;
  }[];
  period_scores?: {
    home: string;
    away: string;
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

export default function Sports() {
  const { preferences } = useAuth();
  const [activeTab, setActiveTab] = useState<"live" | "upcoming">("live");
  const [activeSport, setActiveSport] = useState<string>("football");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStream, setSelectedStream] = useState<{ url: string; title: string } | null>(null);

  const fetchMatches = async (type: "live" | "upcoming", sport: string = activeSport) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/matches/${type}?sport=${sport}`);
      const rawMatches: Match[] = response.data.matches || [];
      const uniqueMatches: Match[] = [];
      const seenIds = new Set<string>();
      for (const m of rawMatches) {
        if (m && m.id) {
          const idStr = String(m.id);
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            m.id = idStr; // ensure it is a string
            uniqueMatches.push(m);
          }
        }
      }
      setMatches(uniqueMatches);
    } catch (err: any) {
      console.error(`Failed to fetch ${type} matches:`, err);
      setError(`Failed to load ${type} matches. The servers might be busy.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(activeTab, activeSport);
  }, [activeTab, activeSport]);

  const handlePlayStream = (match: Match, channelUrl?: string) => {
    let targetUrl = channelUrl || match.m3u8_url;
    if (!targetUrl) {
      alert("No stream available for this match.");
      return;
    }

    // If it's an m3u8, route it through our proxy
    if (targetUrl.includes(".m3u8")) {
      const proxyUrl = `/api/proxy/playlist.m3u8?url=${encodeURIComponent(targetUrl)}`;
      setSelectedStream({
        url: proxyUrl,
        title: `${match.home_team} vs ${match.away_team}`
      });
    } else {
      // It's a web player URL, open in new tab
      window.open(targetUrl, "_blank");
    }
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

  // If a stream is selected, show the player
  if (selectedStream) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center">
          <h2 className="text-white font-bold text-lg md:text-xl">{selectedStream.title}</h2>
          <button 
            onClick={() => setSelectedStream(null)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors"
          >
            Close Player
          </button>
        </div>
        <div className="flex-1 w-full h-full">
          {/* We use LiveTVPlayer as it's optimized for HLS live streams */}
          <LiveTVPlayer
            url={selectedStream.url}
            name={selectedStream.title}
            logo=""
            description="Live Sports Stream"
            currentProgram={selectedStream.title}
            onBack={() => setSelectedStream(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f7] pb-32">
      {/* Header */}
      <div className="relative pt-20 pb-10 px-6 lg:px-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/20 via-black to-[#111] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-brand/20 rounded-xl">
                <Trophy className="w-6 h-6 text-brand" />
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">AxisSports Hub</h1>
            </div>
            <p className="text-gray-400 text-sm md:text-base max-w-xl">
              Your premium destination for live matches, upcoming fixtures, and optimized streaming powered by the Axis streaming engine.
            </p>
          </div>
          
          <div className="relative flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md self-start md:self-auto">
            <button
              onClick={() => setActiveTab("live")}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors z-10 ${
                activeTab === "live" 
                  ? "text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {activeTab === "live" && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/25"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  style={{ zIndex: -1 }}
                />
              )}
              <Activity className={`w-4 h-4 ${activeTab === "live" ? "animate-pulse" : ""}`} />
              Live Now
            </button>
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors z-10 ${
                activeTab === "upcoming" 
                  ? "text-white" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {activeTab === "upcoming" && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand rounded-xl shadow-lg shadow-brand/25"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  style={{ zIndex: -1 }}
                />
              )}
              <CalendarDays className="w-4 h-4" />
              Upcoming
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-5 h-48">
                <Skeleton className="w-full h-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-[#ff3b30] mb-4 opacity-80" />
            <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
            <p className="text-gray-400 max-w-md mb-6">{error}</p>
            <button 
              onClick={() => fetchMatches(activeTab, activeSport)}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-full font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        ) : matches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white/[0.02] border border-white/5 rounded-3xl">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Tv className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Matches Found</h3>
            <p className="text-gray-400 max-w-md mb-6">
              There are currently no {activeTab} matches available. Please check back later.
            </p>
            <button 
              onClick={() => fetchMatches(activeTab, activeSport)}
              className="flex items-center gap-2 px-6 py-3 bg-brand/10 hover:bg-brand/20 text-brand rounded-full font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {matches.map((match, idx) => (
                <div 
                  key={`${match.id}-${idx}`}
                  className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/10 hover:border-brand/40 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)] hover:-translate-y-1"
                >
                  {/* Status Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    {match.status === "LIVE" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        <span className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full animate-pulse" />
                        {match.status_live && match.status_live !== "Living" && !isNaN(Number(match.status_live)) ? `${match.status_live}'` : 'LIVE'}
                      </span>
                    ) : match.status === "HALF_TIME" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        HT
                      </span>
                    ) : match.status === "FINISHED" ? (
                      <span className="px-3 py-1 bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        FT
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-brand/10 border border-brand/30 text-brand text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="p-6 pt-12 flex flex-col h-full">
                    
                    <div className="mb-4 text-center flex flex-col items-center">
                      <div className="flex items-center gap-2 mb-1">
                        {match.sport_type && (
                          <span className="text-[9px] px-2 py-0.5 bg-white/10 rounded-full text-white uppercase tracking-wider">
                            {match.sport_type}
                          </span>
                        )}
                        {match.league && (
                          <p className="text-xs font-semibold text-brand/80 tracking-wide uppercase line-clamp-1">{match.league}</p>
                        )}
                      </div>
                      {match.round && (
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{match.round}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex-1 text-center">
                        
                        <div className="w-12 h-12 mx-auto bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 overflow-hidden">
                          {match.home_logo ? (
                            <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🛡️</span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm leading-tight text-white line-clamp-2">{match.home_team}</h3>
                        {match.home_abbr && <p className="text-[10px] text-gray-500 mt-1">{match.home_abbr}</p>}
                      </div>
                      
                      
                      <div className="flex flex-col items-center justify-center px-2">
                        {match.status === "UPCOMING" ? (
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500 text-sm font-bold tracking-widest mb-1">VS</span>
                            {match.start_time && (
                              <span className="text-xs text-brand font-medium bg-brand/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        ) : (

                          <div className="flex items-center gap-2 text-2xl font-black tracking-tighter text-white">
                            <span>{match.home_score}</span>
                            <span className="text-brand/50">-</span>
                            <span>{match.away_score}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 text-center">
                        
                        <div className="w-12 h-12 mx-auto bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 overflow-hidden">
                          {match.away_logo ? (
                            <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">⚔️</span>
                          )}
                        </div>

                        <h3 className="font-bold text-sm leading-tight text-white line-clamp-2">{match.away_team}</h3>
                        {match.away_abbr && <p className="text-[10px] text-gray-500 mt-1">{match.away_abbr}</p>}
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-white/10">
                      {match.odds && match.odds.length > 0 && (
                        <div className="flex justify-center gap-4 mb-4 mt-2 pt-3 border-t border-white/5">
                          {match.odds.map((odd: any, i: number) => (
                             <div key={i} className="flex gap-2 text-[10px]">
                               <span className="font-bold text-gray-500">{odd.type}</span>
                               <span className="text-brand font-semibold">{odd.value}</span>
                             </div>
                          ))}
                        </div>
                      )}
                      
                      {match.period_scores && match.period_scores.length > 0 && (
                        <div className="flex justify-center gap-3 mb-4 text-[10px] text-gray-400">
                          {match.period_scores.map((ps: any, i: number) => (
                             <div key={i} className="flex flex-col items-center">
                               <span className="font-bold text-gray-500 mb-0.5">{ps.name}</span>
                               <span className="text-white">{ps.home}-{ps.away}</span>
                             </div>
                          ))}
                        </div>
                      )}
                      
                      {match.channels && Object.keys(match.channels).length > 0 && (
                        <div className="flex flex-col gap-2 mb-4">
                           <p className="text-[10px] text-gray-500 font-semibold mb-1 uppercase tracking-widest text-center">TV Channels</p>
                           <div className="flex flex-wrap justify-center gap-1.5">
                             {Object.entries(match.channels).map(([name, url], idx) => (
                                <span key={idx} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[9px] text-gray-300">
                                   {name}
                                </span>
                             ))}
                           </div>
                        </div>
                      )}
                      
                      {match.streams && match.streams.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Available Streams ({match.streams.length}):</p>
                          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
                            {match.streams.map((stream: any, idx: number) => {
                              const isHls = stream.type === 'm3u8';
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handlePlayStream(match, stream.url)}
                                  className={`flex-1 min-w-[100px] flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[10px] font-semibold transition-all ${
                                    isHls
                                       ? "bg-brand/20 text-brand hover:bg-brand/30 border border-brand/30"
                                       : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {isHls ? <PlayCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    <span className="truncate max-w-[80px]">{stream.name}</span>
                                  </div>
                                  <span className="text-[9px] opacity-70">{stream.quality || 'HD'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <button disabled className="w-full py-3 bg-white/5 text-gray-500 rounded-xl font-semibold cursor-not-allowed">
                          No Streams Available
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
