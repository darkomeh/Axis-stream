import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Cast, Bell, Maximize, Settings, 
  Volume2, VolumeX, Play, Pause, Send, Activity, Share2, 
  ChevronDown, Flame, CheckCircle2, ShieldAlert
} from "lucide-react";
import type Hls from "hls.js";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { db, auth } from "../lib/firebase";
import { doc, updateDoc, increment, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../services/firebaseService";
import { MetaVerifiedBadge } from "./MetaVerifiedBadge";
import { useToast } from "../contexts/ToastContext";

interface Match {
  id: string;
  home_team: string;
  away_team: string;
  home_logo?: string;
  away_logo?: string;
  home_score: string;
  away_score: string;
  status: string;
  home_abbr?: string;
  away_abbr?: string;
  status_live?: string;
  start_time?: string;
  league?: string;
  round?: string;
  m3u8_url: string | null;
  odds?: { type: string; value: string }[];
  period_scores?: { home: string | number; away: string | number; name: string }[];
  streams?: { name: string; url: string; quality?: string }[];
  sport_type?: string;
}

interface SportsMatchDetailsProps {
  match: Match;
  initialStreamUrl?: string;
  onBack: () => void;
}

const loadHls = () => import("hls.js").then((m) => m.default);

const formatMatchDate = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return "TBD";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "TBD";

  const days = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
  const months = [
    "Jan.", "Feb.", "Mar.", "Apr.", "May", "June",
    "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."
  ];

  const dayName = days[date.getDay()];
  const dayOfMonth = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();

  let suffix = "th";
  if (dayOfMonth === 1 || dayOfMonth === 21 || dayOfMonth === 31) {
    suffix = "st";
  } else if (dayOfMonth === 2 || dayOfMonth === 22) {
    suffix = "nd";
  } else if (dayOfMonth === 3 || dayOfMonth === 23) {
    suffix = "rd";
  }

  return `${dayName} ${dayOfMonth}${suffix} ${monthName} ${year}`;
};

const formatMatchTime = (dateInput: string | Date | undefined): string => {
  if (!dateInput) return "TBD";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "TBD";

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

export default function SportsMatchDetails({ match, initialStreamUrl, onBack }: SportsMatchDetailsProps) {
  const { user, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "chat">("overview");
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [currentMatch, setCurrentMatch] = useState<Match>(match);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("Auto HD");

  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(
    initialStreamUrl || (match.streams && match.streams.length > 0 ? match.streams[0].url : match.m3u8_url)
  );
  
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [pollData, setPollData] = useState({ home: 0, draw: 0, away: 0 });
  const [hasVoted, setHasVoted] = useState<string | null>(null);

  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(true);
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    if (!currentMatch.start_time || currentMatch.status !== "UPCOMING") {
      setTimeLeft("");
      return;
    }

    const updateTimer = () => {
      const target = new Date(currentMatch.start_time!).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft("Starting Now");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, "0");
      const mStr = String(minutes).padStart(2, "0");
      const sStr = String(seconds).padStart(2, "0");

      setTimeLeft(`${hStr}:${mStr}:${sStr}`);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [currentMatch.start_time, currentMatch.status]);

  useEffect(() => {
    setCurrentMatch(match);
    if (!currentStreamUrl && match.streams && match.streams.length > 0) {
      setCurrentStreamUrl(match.streams[0].url);
    }
  }, [match]);

  useEffect(() => {
    if (!match.id) return;
    const pollLiveMatch = async () => {
      try {
        const response = await axios.get(`/api/matches?sport=${match.sport_type || 'all'}`);
        const allMatches: Match[] = response.data.matches || [];
        const updated = allMatches.find((m: Match) => m.id === match.id);
        
        if (updated) {
          setCurrentMatch(prev => {
            if (prev.home_score !== updated.home_score || prev.away_score !== updated.away_score) {
              showToast(`GOAL! ${updated.home_team} ${updated.home_score} - ${updated.away_score} ${updated.away_team}`, "success");
            }
            if (prev.status !== "LIVE" && updated.status === "LIVE") {
              showToast(`${updated.home_team} vs ${updated.away_team} is now LIVE!`, "info");
            }
            return {
              ...prev,
              home_score: updated.home_score,
              away_score: updated.away_score,
              status_live: updated.status_live,
              status: updated.status,
              odds: updated.odds || prev.odds,
              period_scores: updated.period_scores || prev.period_scores,
              streams: updated.streams || prev.streams
            };
          });
        }
      } catch (err) {}
    };

    const interval = setInterval(pollLiveMatch, 5000);
    return () => clearInterval(interval);
  }, [match.id, match.sport_type, showToast]);

  const getLiveStatusText = (m: Match) => {
    if (m.status_live && m.status_live.toLowerCase() !== "living" && m.status_live.toLowerCase() !== "unknown" && !isNaN(Number(m.status_live))) {
      return `${m.status_live}'`;
    }
    if (m.status === "HALF_TIME") return "HT";
    if (m.status === "FINISHED") return "FT";
    if (m.status === "UPCOMING") return "UPCOMING";
    return "LIVE";
  };

  useEffect(() => {
    setIsVideoLoading(true);
  }, [currentStreamUrl]);

  const handleVideoPlaying = () => {
    setIsVideoLoading(false);
  };

  const handleVideoWaiting = () => {
    setIsVideoLoading(true);
  };

  useEffect(() => {
    let isSubscribed = true;
    const video = videoRef.current;
    if (!video || !currentStreamUrl || !user) return;

    const initPlayer = async () => {
      const HlsClass = await loadHls();
      if (!isSubscribed) return;

      if (HlsClass.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new HlsClass({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        const proxyUrl = currentStreamUrl.includes('.m3u8') ? `/api/proxy/playlist.m3u8?url=${encodeURIComponent(currentStreamUrl)}` : currentStreamUrl;
        hls.loadSource(proxyUrl);
        hls.attachMedia(video);
        hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
          const playPromise = video.play();
          playPromiseRef.current = playPromise;
          playPromise.then(() => {
            setIsVideoLoading(false);
          }).catch(() => {
            setIsVideoLoading(false);
          });
          setIsPlaying(true);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = currentStreamUrl.includes('.m3u8') ? `/api/proxy/playlist.m3u8?url=${encodeURIComponent(currentStreamUrl)}` : currentStreamUrl;
        video.addEventListener("loadedmetadata", () => {
          const playPromise = video.play();
          playPromiseRef.current = playPromise;
          playPromise.then(() => {
            setIsVideoLoading(false);
          }).catch(() => {
            setIsVideoLoading(false);
          });
          setIsPlaying(true);
        });
      }
    };
    initPlayer();
    return () => {
      isSubscribed = false;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [currentStreamUrl, user]);

  useEffect(() => {
    if (!match.id) return;
    const pollRef = doc(db, "sports_polls", match.id);
    getDoc(pollRef).then(docSnap => {
      if (!docSnap.exists()) setDoc(pollRef, { home: 0, draw: 0, away: 0 }).catch(() => {});
    }).catch(() => {});

    const unsubscribe = onSnapshot(pollRef, (docSnap) => {
      if (docSnap.exists()) setPollData(docSnap.data() as { home: number, draw: number, away: number });
    });
    return () => unsubscribe();
  }, [match.id]);

  useEffect(() => {
    if (!match.id || !user) return;
    const chatRef = collection(db, "sports_chat", match.id, "messages");
    const q = query(chatRef, orderBy("timestamp", "asc"), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      console.warn("Sports chat subscription failed:", error);
    });
    return () => unsubscribe();
  }, [match.id, user]);

  const handleVote = async (choice: 'home' | 'draw' | 'away') => {
    if (hasVoted) return;
    setHasVoted(choice);
    try {
      await updateDoc(doc(db, "sports_polls", match.id), { [choice]: increment(1) });
    } catch (error) {}
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !user) return;
    try {
      await addDoc(collection(db, "sports_chat", match.id, "messages"), {
        text: chatInput,
        uid: auth.currentUser?.uid || user.id,
        email: user.email || "",
        displayName: user.name || user.username || "Fan",
        photoURL: user.avatar || null,
        timestamp: serverTimestamp(),
        role: user.role || "user"
      });
      setChatInput("");
    } catch (error) {}
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        const playPromise = video.play();
        playPromiseRef.current = playPromise;
        setIsPlaying(true);
        playPromise.catch((err) => {
          if (err.name !== "AbortError") {
            console.error("Playback error:", err);
          }
        });
      } else {
        if (playPromiseRef.current) {
          playPromiseRef.current
            .then(() => {
              video.pause();
              setIsPlaying(false);
            })
            .catch(() => {
              video.pause();
              setIsPlaying(false);
            });
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); } 
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  const resetControls = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const handlePlayerTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest(".no-click-toggle")
    ) {
      return;
    }

    if (showControls) {
      setShowControls(false);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      resetControls();
    }
  };

  const shareMatch = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast("Match link copied to clipboard!", "success");
  };

  const totalVotes = pollData.home + pollData.draw + pollData.away;
  const homePct = totalVotes ? Math.round((pollData.home / totalVotes) * 100) : 0;
  const drawPct = totalVotes ? Math.round((pollData.draw / totalVotes) * 100) : 0;
  const awayPct = totalVotes ? Math.round((pollData.away / totalVotes) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#080808] flex flex-col text-[#F5F5F7] overflow-hidden font-sans selection:bg-[#FF3B30]/30 selection:text-white">
      {/* Video Player Section */}
      <div 
        ref={containerRef}
        className={`relative bg-black w-full shrink-0 ${isFullscreen ? 'h-full' : 'h-[30vh] sm:h-[40vh] md:h-[50vh]'} shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-20 group`}
        onMouseMove={resetControls}
        onClick={handlePlayerTap}
      >
        {user ? (
          currentMatch.status === "UPCOMING" ? (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c12] to-[#040406] flex flex-col items-center justify-center p-6 text-center z-10">
              <div className="absolute inset-0 bg-cover bg-center opacity-15" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=600&auto=format&fit=crop')` }} />
              <div className="relative z-10 max-w-lg w-full flex flex-col items-center">
                {/* League Badge */}
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-[#A1A1AA] font-bold uppercase tracking-widest mb-6">
                  {currentMatch.league || "International Match"}
                </span>

                {/* Matchup row */}
                <div className="flex items-center justify-center gap-6 sm:gap-10 w-full mb-8">
                  {/* Home */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-center">
                      {currentMatch.home_logo ? (
                        <img src={currentMatch.home_logo} className="w-full h-full object-contain" alt="" />
                      ) : (
                        <span className="text-xl">🛡️</span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold mt-2 text-white truncate max-w-[100px] sm:max-w-[140px]">{currentMatch.home_team}</span>
                  </div>

                  {/* VS / Divider */}
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-[#FF3B30] tracking-wider">VS</span>
                  </div>

                  {/* Away */}
                  <div className="flex flex-col items-center flex-1">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/[0.04] border border-white/10 p-3 flex items-center justify-center">
                      {currentMatch.away_logo ? (
                        <img src={currentMatch.away_logo} className="w-full h-full object-contain" alt="" />
                      ) : (
                        <span className="text-xl">⚔️</span>
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-bold mt-2 text-white truncate max-w-[100px] sm:max-w-[140px]">{currentMatch.away_team}</span>
                  </div>
                </div>

                {/* Countdown display */}
                <div className="bg-white/[0.02] border border-white/10 rounded-[24px] px-8 py-5 flex flex-col items-center w-full max-w-sm backdrop-blur-md">
                  <span className="text-[10px] font-bold text-[#FF3B30] tracking-widest uppercase mb-1">Match Starts In</span>
                  <span className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-widest">{timeLeft || "00:00:00"}</span>
                </div>

                <p className="text-[11px] text-[#A1A1AA] mt-6 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5 text-[#FF3B30]" /> Notifications enabled. We'll alert you the moment kick-off begins.
                </p>
              </div>
            </div>
          ) : (
            <video 
              ref={videoRef} 
              className="w-full h-full object-contain animate-fade-in" 
              playsInline 
              muted={isMuted}
              onWaiting={handleVideoWaiting}
              onPlaying={handleVideoPlaying}
              onLoadedData={handleVideoPlaying}
              onCanPlay={handleVideoPlaying}
              onLoadStart={handleVideoWaiting}
              onSeeking={handleVideoWaiting}
              onSeeked={handleVideoPlaying}
            />
          )
        ) : (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md bg-white/[0.03] border border-white/10 rounded-[32px] p-8 backdrop-blur-xl flex flex-col items-center shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-center justify-center mb-5 text-[#FF3B30]">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Login Required to Stream</h3>
              <p className="text-[#A1A1AA] text-sm mb-6 leading-relaxed">
                Live high-definition broadcasts are reserved exclusively for signed-in members of our sports community. Sign in now to enjoy instant access to all live channels, real-time chats, and custom polls.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); loginWithGoogle(); }}
                className="w-full py-3.5 px-6 rounded-full bg-[#FF3B30] hover:bg-[#E03126] text-white font-semibold text-sm transition-all duration-300 shadow-[0_4px_20px_rgba(255,59,48,0.3)] hover:shadow-[0_6px_24px_rgba(255,59,48,0.5)] active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Sign In with Google</span>
              </button>
            </div>
          </div>
        )}

        {user && isVideoLoading && currentMatch.status !== "UPCOMING" && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-[#FF3B30] animate-spin" />
          </div>
        )}
        
        <AnimatePresence>
          {showControls && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 flex flex-col justify-between">
              {/* Top Bar */}
              <div className="bg-gradient-to-b from-black/80 to-transparent p-4 pt-safe flex items-center justify-between">
                <button onClick={onBack} className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex items-center gap-2">
                   <button onClick={(e) => { e.stopPropagation(); shareMatch(); }} className="p-2 text-white/80 hover:text-white hover:bg-black/40 rounded-full transition-all">
                     <Share2 className="w-5 h-5" />
                   </button>
                   <button onClick={(e) => { e.stopPropagation(); showToast("Searching for cast devices...", "info"); }} className="p-2 text-white/80 hover:text-white hover:bg-black/40 rounded-full transition-all">
                     <Cast className="w-5 h-5" />
                   </button>
                </div>
              </div>

              {/* Center Play/Pause */}
              <div className="flex-1 flex items-center justify-center">
                {user && !isVideoLoading && currentMatch.status !== "UPCOMING" && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay();
                      resetControls();
                    }}
                    className="w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 backdrop-blur-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all cursor-pointer shadow-2xl z-30"
                  >
                    {isPlaying ? <Pause className="w-8 h-8 text-white" /> : <Play className="w-8 h-8 text-white ml-1" />}
                  </button>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="bg-gradient-to-t from-black via-black/60 to-transparent p-4 pb-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#FF3B30]/20 border border-[#FF3B30]/30 text-[#FF3B30] text-[10px] font-bold uppercase rounded backdrop-blur-md">
                      <span className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full animate-pulse shadow-[0_0_8px_rgba(255,59,48,0.8)]" />
                      LIVE
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="p-1.5 hover:bg-white/10 rounded transition-colors"><Maximize className="w-4 h-4 text-white" /></button>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:scale-110 transition-transform">
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 h-1 bg-white/20 rounded-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 bottom-0 bg-[#FF3B30] w-[98%]" />
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="text-white hover:scale-110 transition-transform">
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(true); }} className="text-white hover:scale-110 transition-transform">
                    <Settings className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] shrink-0 bg-[#080808] z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-8">
          {["overview", "chat"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`relative pb-1 text-sm font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab ? "text-white" : "text-[#A1A1AA] hover:text-white/80"
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div layoutId="activeTabSportsDetails" className="absolute -bottom-[17px] left-0 right-0 h-0.5 bg-[#FF3B30] rounded-t-full shadow-[0_-2px_8px_rgba(255,59,48,0.6)]" />
              )}
            </button>
          ))}
        </div>
        <button onClick={shareMatch} className="flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
          <Share2 className="w-3.5 h-3.5" />
          SHARE
        </button>
      </div>

      {/* Content */}
      <div className={`flex-1 bg-[#080808] ${activeTab === "chat" ? "flex flex-col overflow-hidden p-0" : "overflow-y-auto p-4 sm:p-6 scrollbar-hide"}`}>
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6 max-w-3xl mx-auto w-full pb-10">
              
              {/* Scoreboard */}
              <div className="flex flex-col items-center justify-center py-6 px-4">
                <div className="flex items-center justify-between w-full max-w-md gap-4">
                  <div className="flex flex-col items-center flex-1">
                     <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-3 shadow-lg backdrop-blur-md mb-3 flex items-center justify-center overflow-hidden">
                       {currentMatch.home_logo && <img src={currentMatch.home_logo} className="w-full h-full object-contain drop-shadow-md" alt="" />}
                     </div>
                     <span className="font-bold text-sm text-center">{currentMatch.home_abbr || currentMatch.home_team.substring(0,3).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex flex-col items-center flex-1">
                     {currentMatch.status === "UPCOMING" ? (
                       <span className="text-3xl font-light text-[#A1A1AA] mb-1">VS</span>
                     ) : (
                       <div className="flex items-center gap-3 text-4xl sm:text-5xl font-bold tracking-tighter text-white mb-1">
                          <span>{currentMatch.home_score}</span>
                          <span className="text-white/20 font-light">-</span>
                          <span>{currentMatch.away_score}</span>
                       </div>
                     )}
                     <span className="text-[#FF3B30] font-bold text-sm">{getLiveStatusText(currentMatch)}</span>
                  </div>

                  <div className="flex flex-col items-center flex-1">
                     <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/[0.04] border border-white/[0.08] rounded-[20px] p-3 shadow-lg backdrop-blur-md mb-3 flex items-center justify-center overflow-hidden">
                       {currentMatch.away_logo && <img src={currentMatch.away_logo} className="w-full h-full object-contain drop-shadow-md" alt="" />}
                     </div>
                     <span className="font-bold text-sm text-center">{currentMatch.away_abbr || currentMatch.away_team.substring(0,3).toUpperCase()}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col items-center text-center">
                  <span className="text-sm font-semibold text-[#A1A1AA] uppercase tracking-widest">{currentMatch.league || "International"}</span>
                  <span className="text-[10px] text-[#A1A1AA]/60 uppercase mt-1">{currentMatch.round}</span>
                </div>
              </div>

              {/* Vote Poll */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-white">Who wins?</h3>
                  <span className="text-xs font-semibold text-[#A1A1AA]">{totalVotes.toLocaleString()} votes</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleVote('home')} className="relative h-12 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors flex items-center px-4 justify-between group">
                    <div className="absolute inset-0 bg-[#FF3B30]/20 origin-left transition-transform duration-1000 ease-out" style={{ transform: `scaleX(${hasVoted ? homePct / 100 : 0})` }} />
                    <span className="relative z-10 font-bold text-sm flex items-center gap-2">
                       <span className="w-4 h-4 flex items-center justify-center bg-white/10 rounded-full text-[8px]">H</span>
                       {currentMatch.home_team}
                    </span>
                    {hasVoted && <span className="relative z-10 font-bold text-sm">{homePct}%</span>}
                  </button>
                  <button onClick={() => handleVote('draw')} className="relative h-12 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors flex items-center px-4 justify-between group">
                    <div className="absolute inset-0 bg-white/10 origin-left transition-transform duration-1000 ease-out" style={{ transform: `scaleX(${hasVoted ? drawPct / 100 : 0})` }} />
                    <span className="relative z-10 font-bold text-sm flex items-center gap-2">
                       <span className="w-4 h-4 flex items-center justify-center bg-white/10 rounded-full text-[8px]">D</span>
                       Draw
                    </span>
                    {hasVoted && <span className="relative z-10 font-bold text-sm">{drawPct}%</span>}
                  </button>
                  <button onClick={() => handleVote('away')} className="relative h-12 rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-colors flex items-center px-4 justify-between group">
                    <div className="absolute inset-0 bg-[#00C7BE]/20 origin-left transition-transform duration-1000 ease-out" style={{ transform: `scaleX(${hasVoted ? awayPct / 100 : 0})` }} />
                    <span className="relative z-10 font-bold text-sm flex items-center gap-2">
                       <span className="w-4 h-4 flex items-center justify-center bg-white/10 rounded-full text-[8px]">A</span>
                       {currentMatch.away_team}
                    </span>
                    {hasVoted && <span className="relative z-10 font-bold text-sm">{awayPct}%</span>}
                  </button>
                </div>
              </div>

              {/* Match Info Card */}
              <div className="bg-white/[0.04] border border-white/[0.08] rounded-[28px] p-6 backdrop-blur-xl flex flex-col gap-4">
                <h3 className="font-bold text-sm text-white mb-2">Match Info</h3>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Sport</span>
                  <span className="text-sm font-bold text-white capitalize">{currentMatch.sport_type || 'Football'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">League</span>
                  <span className="text-sm font-bold text-white">{currentMatch.league || 'Friendly'}</span>
                </div>
                {currentMatch.round && (
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Round</span>
                    <span className="text-sm font-bold text-white">{currentMatch.round}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Kickoff Date</span>
                  <span className="text-sm font-bold text-white">{currentMatch.start_time ? formatMatchDate(currentMatch.start_time) : 'TBD'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Kickoff Time</span>
                  <span className="text-sm font-bold text-white">{currentMatch.start_time ? formatMatchTime(currentMatch.start_time) : 'TBD'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-xs text-[#A1A1AA] font-semibold uppercase tracking-wider">Status</span>
                  <span className={`text-sm font-bold ${currentMatch.status === 'LIVE' ? 'text-[#FF3B30]' : 'text-white'}`}>{currentMatch.status}</span>
                </div>
              </div>

              {/* Stream Info & Reminders */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-[24px] p-5 backdrop-blur-xl flex flex-col justify-center">
                   <div className="flex items-center gap-2 mb-2">
                     <Activity className="w-4 h-4 text-[#00C7BE]" />
                     <span className="text-xs font-bold text-white">Stream Info</span>
                   </div>
                   <div className="text-[10px] text-[#A1A1AA] flex flex-col gap-1 mt-1 font-semibold uppercase tracking-wider">
                     <span>Quality: <span className="text-white">Auto HD</span></span>
                     <span>Latency: <span className="text-white">Low</span></span>
                     <span>Type: <span className="text-white">HLS Direct</span></span>
                     <div className="flex items-center gap-1 mt-1 text-[#00C7BE]">
                       <CheckCircle2 className="w-3 h-3" /> Best Stream Active
                     </div>
                   </div>
                </div>

                <div 
                  onClick={() => {
                    setNotificationsEnabled(!notificationsEnabled);
                    showToast(notificationsEnabled ? "Match alerts disabled" : "Push notifications enabled!", notificationsEnabled ? "info" : "success");
                  }}
                  className={`border rounded-[24px] p-5 backdrop-blur-xl flex flex-col justify-center items-center text-center cursor-pointer transition-colors ${
                    notificationsEnabled ? "bg-[#FF3B30]/10 border-[#FF3B30]/30" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                  }`}
                >
                   <Bell className={`w-6 h-6 mb-2 ${notificationsEnabled ? "text-[#FF3B30]" : "text-[#A1A1AA]"}`} />
                   <span className={`text-sm font-bold ${notificationsEnabled ? "text-[#FF3B30]" : "text-white"}`}>
                     {notificationsEnabled ? "Reminders On" : "Notify Me"}
                   </span>
                </div>
              </div>

            </motion.div>
          )}

          {activeTab === "chat" && (
            <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 bg-[#080808] overflow-hidden">
              
              <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00C7BE] shadow-[0_0_8px_rgba(0,199,190,0.8)]" />
                  <span className="text-sm font-bold text-white tracking-wide">Live Chat</span>
                </div>
                <div className="flex items-center gap-2 px-2.5 py-1 bg-white/10 rounded-full">
                  <ShieldAlert className="w-3 h-3 text-[#A1A1AA]" />
                  <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">Slow Mode</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[#A1A1AA] opacity-60">
                    <Send className="w-8 h-8 mb-3" />
                    <p className="text-sm font-semibold">Be the first to chat!</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id || idx} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                        {msg.photoURL ? <img src={msg.photoURL} alt="" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-white">{msg.displayName.substring(0,1)}</span>}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold ${msg.role === 'admin' ? 'text-[#FF3B30]' : 'text-[#A1A1AA]'}`}>{msg.displayName}</span>
                          {(msg.email === 'greatmayuku2@gmail.com' || msg.displayName === '×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永' || msg.displayName?.includes('Busy') || msg.displayName?.toLowerCase() === 'greatmayuku2' || (msg.uid === user?.id && user?.email === 'greatmayuku2@gmail.com')) && <MetaVerifiedBadge className="w-3.5 h-3.5" />}
                          {msg.role === 'admin' && <span className="px-1.5 py-0.5 bg-[#FF3B30]/20 text-[#FF3B30] text-[8px] font-bold uppercase rounded">Mod</span>}
                        </div>
                        <p className="text-sm text-white mt-1 leading-snug">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 bg-white/[0.02] border-t border-white/[0.08] flex gap-3 items-center">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={user ? "Message..." : "Sign in to chat"}
                  disabled={!user}
                  className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-full px-5 py-3 text-sm font-medium text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-[#A1A1AA]"
                />
                <button 
                  type="submit" 
                  disabled={!user || !chatInput.trim()}
                  className="w-11 h-11 rounded-full bg-[#FF3B30] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed shrink-0 transition-transform hover:scale-105 active:scale-95"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
