import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Heart, MessageCircle, Share2, Bookmark, Star, Download, Plus, Play, Check, 
  ChevronLeft, Users, Video, Send, X, Volume2, VolumeX, Flame, Verified,
  ExternalLink, ArrowDownToLine, ShoppingBag, Radio, Folder
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { movieService } from "../services/movieService";
import { MovieImage } from "../components/MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import Navbar from "../components/Navbar";

interface TrailItem {
  id: string;
  title: string;
  poster: string;
  background: string;
  rating: string;
  releaseYear: string;
  genres: string[];
  description: string;
  type: string;
  trailerUrl: string;
  likes: number;
  commentsCount: number;
  shares: number;
  saves: number;
  isLikedByMe: boolean;
  isSavedByMe: boolean;
  myRating: number | null;
  duration?: string;
  contentRating?: string;
}

// Fallback high quality YouTube trailers matched with popular Axis content
const FALLBACK_TRAILERS: { [key: string]: string } = {
  "1": "https://www.youtube.com/watch?v=1V7GgP7A8b4", // Jack Ryan
  "2": "https://www.youtube.com/watch?v=mqqft2x_Aa4", // The Batman
  "3": "https://www.youtube.com/watch?v=Way9Dexny3w", // Dune 2
  "4": "https://www.youtube.com/watch?v=Di310WS8zLk", // Wednesday
  "5": "https://www.youtube.com/watch?v=oqxAJKy0R4A", // Squid Game
  "6": "https://www.youtube.com/watch?v=d9MyW72ELq0", // Avatar
  "7": "https://www.youtube.com/watch?v=JfVOs4VSpmA", // Spider-Man
};

const DEFAULT_BIOS = "Official previews, trailers, and behind-the-scenes exclusives for high-octane blockbusters, series, and animes. Axis Trails is your premium ticket to cinema's upcoming heavyweights.";

function getYouTubeId(url: string) {
  if (!url) return "";
  if (url.length === 11 && !url.includes("/") && !url.includes(".") && !url.includes("?")) {
    return url;
  }
  const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[1].length === 11) ? match[1] : "";
}

function getEmbedUrl(url: string, autoplay = true, muted = true, isDataSaver = true) {
  if (!url) return "";
  const videoId = getYouTubeId(url);
  
  if (videoId) {
    const params = [
      "enablejsapi=1",
      autoplay ? "autoplay=1" : "autoplay=0",
      muted ? "mute=1" : "mute=0",
      "controls=0",
      "rel=0",
      "showinfo=0",
      "iv_load_policy=3",
      "loop=1",
      "modestbranding=1",
      `playlist=${videoId}`,
      "playsinline=1"
    ];
    if (isDataSaver) {
      params.push("vq=medium"); // Forces standard optimized mobile quality, cutting down trailer data weight to 5-10MB or less
    } else {
      params.push("vq=hd720"); // High fidelity streaming block
    }
    return `https://www.youtube.com/embed/${videoId}?${params.join("&")}`;
  }
  return url;
}

export default function Trails() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();
  
  const [items, setItems] = useState<TrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showCreatorPanel, setShowCreatorPanel] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isDataSaver, setIsDataSaver] = useState(true); // Enabled by default to satisfy ultra low data request

  // High fidelity customized panel states matching the requested Figma/AI mockup
  const [showPlaylistSheet, setShowPlaylistSheet] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState("1080p");
  const [isAddingNewPlaylist, setIsAddingNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [localPlaylists, setLocalPlaylists] = useState([
    { id: "p1", name: "Watch Later", videoCount: 12, checked: false },
    { id: "p2", name: "Action Movies", videoCount: 24, checked: true },
    { id: "p3", name: "Thrillers", videoCount: 18, checked: false },
    { id: "p4", name: "Favorite Trailers", videoCount: 9, checked: false }
  ]);

  const [commentLikes, setCommentLikes] = useState<Record<string, { count: number; liked: boolean }>>({
    "c1": { count: 245, liked: false },
    "c3": { count: 132, liked: false },
    "comment-1": { count: 98, liked: false }
  });

  const toggleCommentLike = (commId: string) => {
    setCommentLikes(prev => {
      const current = prev[commId] || { count: Math.floor(Math.random() * 20) + 1, liked: false };
      return {
        ...prev,
        [commId]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked
        }
      };
    });
  };

  const togglePlaylistCheck = (playlistId: string) => {
    setLocalPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const nextChecked = !p.checked;
        return {
          ...p,
          checked: nextChecked,
          videoCount: nextChecked ? p.videoCount + 1 : Math.max(0, p.videoCount - 1)
        };
      }
      return p;
    }));
  };

  const handleCreateLocalPlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const newP = {
      id: `p-${Date.now()}`,
      name: newPlaylistName.trim(),
      videoCount: 1,
      checked: true
    };
    setLocalPlaylists(prev => [...prev, newP]);
    setNewPlaylistName("");
    setIsAddingNewPlaylist(false);
    showToast(`Playlist "${newP.name}" created!`, "success");
  };
  
  // Localized comments mock engine
  const [commentsMap, setCommentsMap] = useState<Record<string, Array<{id: string, name: string, text: string, time: string, isOfficial?: boolean}>>>({});
  const [newCommentText, setNewCommentText] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);

  // Synchronize HTML5 video mute states on active slider change or isMuted toggle
  useEffect(() => {
    if (activeVideoRef.current) {
      activeVideoRef.current.muted = isMuted;
      try {
        if (!isMuted) {
          activeVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        // Safe play exception capture
      }
    }
  }, [isMuted, activeIndex]);

  // Reset iframe spinner on scroll transition
  useEffect(() => {
    setIframeLoading(true);
  }, [activeIndex]);

  // Load feed items by combining homepage lists, trending lists, hot lists and fetching details
  useEffect(() => {
    async function loadFeed() {
      try {
        setLoading(true);
        const [homepage, trending, hot] = await Promise.all([
          movieService.getHomepage().catch(() => ({ topPickList: [], homeList: [], latestMovies: [], latestSeries: [] })),
          movieService.getTrending(1, 40).catch(() => []),
          movieService.getHot().catch(() => ({ movies: [], series: [] }))
        ]);
        
        // Accumulate unique items
        const rawList = [
          ...(homepage.topPickList || []),
          ...(homepage.homeList || []),
          ...(homepage.latestMovies || []),
          ...(homepage.latestSeries || []),
          ...(trending || []),
          ...(hot.movies || []),
          ...(hot.series || [])
        ];
        
        // Remove duplicates
        const uniqueIds = new Set<string>();
        const uniqueList = rawList.filter(item => {
          if (!item.id || uniqueIds.has(item.id)) return false;
          uniqueIds.add(item.id);
          return true;
        });

        // SHUFFLE RANDOMLY so the feed displays different/random trailers on every navigation!
        const shuffledList = [...uniqueList].sort(() => Math.random() - 0.5);

        // Slice a manageable count of 18 items for snappy detail fetching
        const sampleList = shuffledList.slice(0, 18);

        // Map and load trailers
        const trailItems: TrailItem[] = [];
        
        for (let i = 0; i < sampleList.length; i++) {
          const item = sampleList[i];
          try {
            // Fetch detailed metadata including backdrop and trailer URL
            const details = await movieService.getDetails(item.id);
            const rawTrailer = details.trailerUrl || details.detailPath || "";
            
            // Generate stable randomized likes/shares count for beauty
            const seed = parseInt(item.id) || i + 3;
            
            // Prefer real trailer URL from API, but fall back to a high-quality trailer if empty
            const finalTrailer = rawTrailer ? rawTrailer : (FALLBACK_TRAILERS[String(i % 7 + 1)] || FALLBACK_TRAILERS["1"]);
            
            trailItems.push({
              id: item.id,
              title: item.title,
              poster: item.poster || details.poster || "",
              background: details.background || item.poster || "",
              rating: details.rating || item.rating || "8.5",
              releaseYear: details.year || item.year || "2026",
              genres: details.genres || (item.category ? [item.category] : ["Premiere"]),
              description: details.description || item.description || "A masterfully curated theatrical release showing exclusively on Axis TV.",
              type: String(details.type || (item.type === "Series" || item.type === 2 ? "Series" : "Movie")),
              trailerUrl: finalTrailer,
              likes: (seed * 4322) % 85000 + 4200,
              commentsCount: (seed * 892) % 4500 + 120,
              shares: (seed * 342) % 1500 + 45,
              saves: (seed * 123) % 900 + 20,
              isLikedByMe: false,
              isSavedByMe: false,
              myRating: null,
              duration: details.duration,
              contentRating: details.contentRating || "16+",
            });
          } catch (err) {
            // Robust single-item skip recovery
          }
        }

        if (trailItems.length === 0) {
          // Absolute fallback if everything fails
          trailItems.push({
            id: "fallback-idx-1",
            title: "Jack Ryan: Ghost War",
            poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&q=80",
            background: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1080&q=80",
            rating: "9.2",
            releaseYear: "2026",
            genres: ["Action", "Suspense", "Thriller"],
            description: "Tom Clancy's operational counter-intelligence operative races across borders in high-stakes visual espionage.",
            type: "Movie",
            trailerUrl: "https://www.youtube.com/watch?v=1V7GgP7A8b4",
            likes: 42390,
            commentsCount: 2011,
            shares: 849,
            saves: 302,
            isLikedByMe: false,
            isSavedByMe: false,
            myRating: null,
            duration: "106 min",
            contentRating: "18+",
          });
        }

        setItems(trailItems);
        
        // Populate initial comments
        const initialComments: Record<string, any> = {};
        trailItems.forEach(item => {
          initialComments[item.id] = [
            { id: "c1", name: "Chidi_Axis", text: "Genuinely excited for this! Cinematography looks legendary 🔥", time: "2h ago" },
            { id: "c2", name: "Axis Trails", text: "Premiering next Friday under Axis TV Exclusives. Set your timers!", time: "1h ago", isOfficial: true },
            { id: "c3", name: "Aisha_O", text: "The audio pacing is so tense. Definitely watching.", time: "45m ago" }
          ];
        });
        setCommentsMap(initialComments);

      } catch (err) {
        showToast("Unable to load trails feed right now.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, []);

  // Handle snapping / scroll event for calculating active slide index
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const height = e.currentTarget.clientHeight || window.innerHeight;
    const calculatedIndex = Math.round(scrollTop / height);
    if (calculatedIndex !== activeIndex && calculatedIndex >= 0 && calculatedIndex < items.length) {
      setActiveIndex(calculatedIndex);
      // Close side panels automatically to maintain immersive feed
      setShowComments(false);
      setShowRatingPicker(false);
      setShowDownloadPanel(false);
    }
  };

  const activeItem = items[activeIndex];

  // Actions Toggle Controls
  const toggleLike = (id: string) => {
    if (!user) {
      showToast("Access Profile tab to sign in & like trails", "info");
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          isLikedByMe: !item.isLikedByMe,
          likes: item.isLikedByMe ? item.likes - 1 : item.likes + 1
        };
      }
      return item;
    }));
  };

  const toggleSave = (id: string) => {
    if (!user) {
      showToast("Access Profile tab to sign in & save to watchlist", "info");
      return;
    }
    const target = items.find(t => t.id === id);
    if (!target) return;
    
    // Check real AuthContext status
    const isSaved = isInWatchlist(id);
    if (isSaved) {
      removeFromWatchlist(id);
      showToast("Removed from watchlist", "success");
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, saves: Math.max(0, item.saves - 1) };
        }
        return item;
      }));
    } else {
      addToWatchlist({
        id: target.id,
        title: target.title,
        poster: target.poster,
        rating: target.rating,
        type: target.type === "Series" || target.type === "2" ? "Series" : "Movie",
        year: target.releaseYear
      });
      showToast("Added to your watchlist!", "success");
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, saves: item.saves + 1 };
        }
        return item;
      }));
    }
  };

  const handleRate = (id: string, stars: number) => {
    if (!user) {
      showToast("Please sign in or configure profile first", "info");
      return;
    }
    showToast(`Rated ${stars}/10 Stars! Thank you.`, "success");
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return {
          ...item,
          myRating: stars
        };
      }
      return item;
    }));
    setShowRatingPicker(false);
  };

  const handleShare = (item: TrailItem) => {
    const shareUrl = `${window.location.origin}/details/${item.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast("Cinematic link copied to clipboard!", "success");
      setItems(prev => prev.map(t => t.id === item.id ? { ...t, shares: t.shares + 1 } : t));
    }).catch(() => {
      showToast("Error copying link.", "error");
    });
  };

  const startDownload = () => {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);
    showToast("Initializing High-Definition stream download...", "info");
    
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        const next = prev + Math.floor(Math.random() * 15) + 5;
        if (next >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsDownloading(false);
            showToast("Offline trailer download completed successfully!", "success");
          }, 0);
          return 100;
        }
        return next;
      });
    }, 400);
  };

  const postComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!user) {
      showToast("Sign in to comment", "info");
      return;
    }
    
    const currentComments = commentsMap[activeItem.id] || [];
    const newComment = {
      id: `comment-${Date.now()}`,
      name: user.username || "You",
      text: newCommentText.trim(),
      time: "Just now"
    };

    setCommentsMap(prev => ({
      ...prev,
      [activeItem.id]: [newComment, ...currentComments]
    }));

    setItems(prev => prev.map(t => t.id === activeItem.id ? { ...t, commentsCount: t.commentsCount + 1 } : t));
    setNewCommentText("");

    // Simulate official creator response after 2 seconds
    setTimeout(() => {
      const respComment = {
        id: `official-${Date.now()}`,
        name: "Axis Trails",
        text: "Thanks for commenting! Ensure to add this to your playlist and toggle reminders.",
        time: "Just now",
        isOfficial: true
      };
      setCommentsMap(prev => ({
        ...prev,
        [activeItem.id]: [...prev[activeItem.id], respComment]
      }));
    }, 1500);
  };

  const followCreator = () => {
    const nextFollow = !isFollowing;
    setIsFollowing(nextFollow);
    showToast(nextFollow ? "Followed Axis Trails!" : "Unfollowed creator section", "success");
  };

  return (
    <div className="flex h-[100dvh] w-full bg-black text-white relative overflow-hidden font-sans lg:pl-64">
      {/* Hide standard layout backgrounds or footers inside this immersive player */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        /* Lock view height to solve mobile layout triggers */
        @supports (-webkit-touch-callout: none) {
          .h-screen {
            height: -webkit-fill-available;
          }
        }
      `}</style>

      {/* Primary DESKTOP SIDEBAR overlay layout integration */}
      <div className="hidden lg:block">
        <Navbar />
      </div>

      {/* Main Reels content viewport panel */}
      <div className="flex-1 w-full h-full relative flex flex-col justify-between">
        
        {/* Loading overlay panel */}
        {loading && (
          <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center gap-4">
            <Radio className="w-12 h-12 text-brand animate-pulse" />
            <div className="text-center space-y-1">
              <p className="text-sm font-black uppercase tracking-widest text-brand">Axis Trails</p>
              <p className="text-xs text-white/50 animate-pulse">Syncing vertical cinema stream...</p>
            </div>
          </div>
        )}

        {/* Liquid Glass Top Header overlay */}
        <header className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/80 to-transparent pt-4 pb-12 px-4 flex items-center justify-between pointer-events-auto select-none gap-2">
          <button 
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/10 backdrop-blur-md active:scale-95 transition-all text-white/80 hover:text-white shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 xs:gap-3 bg-black/55 px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md max-w-xs overflow-hidden">
            {/* Elegant Data Saver Pill Button */}
            <button 
              onClick={() => {
                setIsDataSaver(prev => !prev);
                showToast(
                  !isDataSaver 
                    ? "Data Saver Active (~5-10MB mobile quality blocks)" 
                    : "Ultra HD Quality Enabled (Standard bandwidth)",
                  "info"
                );
              }}
              className={`text-[9px] font-black uppercase tracking-wider py-1 px-2.5 rounded-full transition-all flex items-center gap-1 active:scale-95 shrink-0 ${
                isDataSaver 
                  ? "bg-green-500/25 text-green-400 border border-green-500/35 shadow-[0_0_10px_rgba(34,197,94,0.15)]" 
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              <Flame className="w-2.5 h-2.5" />
              <span className="hidden xs:inline">Data Saver</span>
              <span>{isDataSaver ? "ON" : "OFF"}</span>
            </button>

            <span className="text-white/20 select-none">|</span>

            <div className="flex items-center gap-3">
              <span className="text-white/40 text-[10px] font-bold cursor-pointer hover:text-white transition-all uppercase tracking-wider">
                Follow
              </span>
              <span className="text-white text-[10px] font-black uppercase tracking-wider relative shrink-0">
                For You
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-brand rounded-full" />
              </span>
            </div>
          </div>

          <button 
            onClick={() => setIsMuted(prev => !prev)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 border border-white/10 backdrop-blur-md active:scale-95 transition-all text-white/80 hover:text-white shrink-0"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-brand" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </header>

        {/* Master swipable snap container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory hide-scrollbar w-full h-full bg-[#03060f]"
          style={{ scrollSnapType: "y mandatory", scrollBehavior: "auto" }}
        >
          {items.map((item, index) => {
            const isCurrentlyActive = index === activeIndex;
            const isPreloadingNext = index === activeIndex + 1;
            const isPreloadingPrev = index === activeIndex - 1;
            const shouldRenderVideo = isCurrentlyActive || isPreloadingNext || isPreloadingPrev;

            const isYoutube = item.trailerUrl && getYouTubeId(item.trailerUrl) !== "";
            const embedSrc = shouldRenderVideo 
              ? getEmbedUrl(item.trailerUrl, isCurrentlyActive, isMuted, isDataSaver) 
              : "";
            
            const isWatchlisted = isInWatchlist(item.id);

            return (
              <div 
                key={`slide-${item.id}-${index}`}
                className="w-full h-full snap-start relative flex flex-col justify-end bg-black overflow-hidden select-none"
                style={{ height: "100dvh" }}
              >
                
                {/* 1. Cinematic Background Backdrop & Video Embed Frame */}
                <div className="absolute inset-0 w-full h-full bg-black z-0">
                  {/* Blurred ambient glow backdrop (visible at all times for beautiful mood) */}
                  <div className="absolute inset-0 w-full h-full select-none pointer-events-none overflow-hidden scale-110 opacity-35 blur-3xl z-0">
                    <MovieImage
                      src={item.background || item.poster}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {shouldRenderVideo ? (
                    <div className="w-full h-full relative">
                      {!item.trailerUrl ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a13]/80 z-20">
                          <div className="relative z-10 px-8 py-6 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-col items-center gap-3 max-w-xs text-center shadow-2xl">
                            <span className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40">🎬</span>
                            <span className="text-sm font-black uppercase tracking-wider text-white">No Trailer</span>
                            <span className="text-xs text-white/50 leading-relaxed">This exclusive release does not have a public trailer. Check out the movie overview below instead!</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`w-full h-full relative pointer-events-none transition-opacity duration-300 ${isCurrentlyActive ? 'opacity-100' : 'opacity-0'}`}>
                          {isYoutube ? (
                            <iframe
                              src={embedSrc}
                              title={item.title}
                              onLoad={() => {
                                if (isCurrentlyActive) {
                                  setIframeLoading(false);
                                }
                              }}
                              className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full aspect-video border-0 select-none brightness-95 pointer-events-none z-10 shadow-2xl"
                              allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                              loading="eager"
                            />
                          ) : (
                            <video
                              ref={el => { if (isCurrentlyActive) activeVideoRef.current = el; }}
                              src={item.trailerUrl}
                              autoPlay={isCurrentlyActive}
                              muted={isMuted}
                              loop
                              playsInline
                              preload={isDataSaver && !isCurrentlyActive ? "metadata" : "auto"}
                              onWaiting={() => { if (isCurrentlyActive) setIframeLoading(true); }}
                              onPlaying={() => { if (isCurrentlyActive) setIframeLoading(false); }}
                              onCanPlay={() => { if (isCurrentlyActive) setIframeLoading(false); }}
                              className="absolute inset-x-0 top-1/2 -translate-y-1/2 w-full aspect-video object-contain brightness-95 pointer-events-none z-10"
                            />
                          )}
                          
                          {/* Active iframe spinner or buffer loaded tracker */}
                          {iframeLoading && isCurrentlyActive && (
                            <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
                              <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                              <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand animate-pulse">Loading Video Teaser...</span>
                            </div>
                          )}

                          {/* Sound indicator helper toast on slide */}
                          {isMuted && isCurrentlyActive && (
                            <div className="absolute top-[88px] left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-full text-[9px] uppercase font-bold text-white/80 pointer-events-none tracking-widest select-none flex items-center gap-1.5 animate-pulse z-40">
                              <VolumeX className="w-3 px-px text-brand" />
                              <span>Mute On • Tap Screen To Hear</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Image cover overlay displayed before active iframe is fully buffered/ready, or for preloading slides */}
                      {(!isCurrentlyActive || (isYoutube && iframeLoading)) && (
                        <MovieImage
                          src={item.background || item.poster}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-contain z-10 brightness-[0.7] transition-opacity duration-300 pointer-events-none"
                        />
                      )}

                      {/* Interactive block overlay: Clicking the background anywhere toggles global mute */}
                      {isCurrentlyActive && (
                        <div 
                          onClick={() => setIsMuted(p => !p)}
                          className="absolute inset-0 z-20 cursor-pointer pointer-events-auto" 
                        />
                      )}
                    </div>
                  ) : (
                    <MovieImage
                      src={item.background}
                      alt={item.title}
                      className="w-full h-full object-contain brightness-[0.5]"
                    />
                  )}
                  {/* Dense gradient overlays to support crystal-clear scannability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/35 z-10 pointer-events-none" />
                  <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/75 to-transparent z-15 pointer-events-none" />
                                {/* 2. Floating CENTER-RIGHT Actions Menu Column - Styled like TikTok/ChatGPT mockup */}
                <div className="absolute right-4 bottom-28 sm:bottom-32 z-30 flex flex-col items-center gap-4.5">
                  
                  {/* Axis Avatar profile badge with bottom overlapping plus (+) trigger */}
                  <div className="relative mb-2 flex flex-col items-center select-none">
                    <button 
                      onClick={() => setShowCreatorPanel(true)}
                      className="w-[50px] h-[50px] rounded-full border-2 border-white/20 p-0.5 bg-black hover:border-brand/50 transition-colors shadow-2xl relative"
                    >
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-black text-[10px] text-white tracking-wider">
                        AXIS
                      </div>
                    </button>
                    {/* Glowing active indicator */}
                    <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-black" />
                    
                    {/* Overlay plus expand buttons */}
                    <AnimatePresence>
                      {!isFollowing && (
                        <motion.button
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            followCreator();
                          }}
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white text-black hover:bg-brand flex items-center justify-center font-bold shadow-xl transition-all"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[4px]" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* LIKE BUTTON Block */}
                  <div className="flex flex-col items-center select-none">
                    <button 
                      onClick={() => toggleLike(item.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl backdrop-blur-md border active:scale-90 transition-all ${
                        item.isLikedByMe 
                          ? "bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                          : "bg-black/40 border-white/10 text-white/95 hover:bg-black/60"
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${item.isLikedByMe ? "fill-current" : ""}`} />
                    </button>
                    <span className="text-[11px] font-black text-white/90 drop-shadow mt-1">
                      {item.isLikedByMe ? "24.8K" : "24.7K"}
                    </span>
                  </div>

                  {/* COMMENTS BUTTON Drawer trigger */}
                  <div className="flex flex-col items-center select-none">
                    <button 
                      onClick={() => setShowComments(true)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-black/40 border border-white/10 text-white hover:bg-black/60 active:scale-90 shadow-xl backdrop-blur-md"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <span className="text-[11px] font-black text-white/90 drop-shadow mt-1">
                      1.2K
                    </span>
                  </div>

                  {/* BOOKMARK BUTTON Playlist sheet trigger */}
                  <div className="flex flex-col items-center select-none">
                    <button 
                      onClick={() => {
                        setShowPlaylistSheet(true);
                      }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all border active:scale-90 shadow-xl backdrop-blur-md ${
                        localPlaylists.some(p => p.checked)
                          ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]" 
                          : "bg-black/40 border-white/10 text-white hover:bg-black/60"
                      }`}
                    >
                      <Bookmark className={`w-5 h-5 ${localPlaylists.some(p => p.checked) ? "fill-current" : ""}`} />
                    </button>
                    <span className="text-[11px] font-black text-white/90 drop-shadow mt-1">
                      8.9K
                    </span>
                  </div>

                  {/* STAR RATING trigger */}
                  <div className="flex flex-col items-center select-none">
                    <button 
                      onClick={() => setShowRatingPicker(true)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center shadow-xl backdrop-blur-md border active:scale-90 transition-all ${
                        item.myRating 
                          ? "bg-brand/20 border-brand text-brand shadow-[0_0_15px_rgba(244,196,48,0.3)]" 
                          : "bg-black/40 border-white/10 text-amber-500/90 hover:bg-black/60"
                      }`}
                    >
                      <Star className={`w-5 h-5 ${item.myRating ? "fill-current" : "fill-current text-amber-500/35"}`} />
                    </button>
                    <span className="text-[11px] font-black text-[#f4c430] drop-shadow mt-1">
                      {item.myRating ? `${item.myRating}.0` : item.rating}
                    </span>
                  </div>

                  {/* GENERIC SHARE trigger */}
                  <div className="flex flex-col items-center select-none">
                    <button 
                      onClick={() => handleShare(item)}
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-black/40 border border-white/10 text-white hover:bg-black/60 active:scale-90 shadow-xl backdrop-blur-md"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    <span className="text-[11px] font-black text-white/90 drop-shadow mt-1">
                      3.6K
                    </span>
                  </div>

                </div>

                {/* 3. Immersive Bottom-Left Information & Action Dashboard - High Fidelity Design */}
                <div className="absolute left-4 bottom-5 max-w-[calc(100%-80px)] z-30 select-none space-y-3 pb-2 pt-4 pr-3">
                  
                  {/* Title / Header of the current video */}
                  <div className="space-y-0.5">
                    <h2 className="text-white text-xl sm:text-2xl font-black uppercase tracking-tight leading-none drop-shadow">
                      {item.title}
                    </h2>
                    
                    {/* Media category lists */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold text-white/60 pt-1">
                      <span>{item.releaseYear}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-[#a5b4fc]">{item.genres.slice(0, 2).join(", ")}</span>
                      <span className="text-white/30">•</span>
                      <span>{item.duration || "2h 49m"}</span>
                    </div>
                  </div>

                  {/* Teaser info text paragraph */}
                  <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-sm line-clamp-3 mb-1 pr-4">
                    {item.description}
                  </p>

                  {/* Orange Rating badge pill representing live counts */}
                  <div className="flex items-center">
                    <div className="inline-flex items-center gap-1.5 bg-black/55 border border-white/10 px-3 py-1 rounded-full text-xs text-[#f4c430] font-black shadow-lg">
                      <Star className="w-3.5 h-3.5 fill-current text-[#f4c430]" />
                      <span>{item.myRating ? `${item.myRating}.0` : item.rating}/10</span>
                      <span className="text-white/30">•</span>
                      <span className="text-white/80">{(parseInt(item.id) || 7) * 15}K Ratings</span>
                    </div>
                  </div>

                  {/* 4. Giant Elegant Metallic Call-To-Action Play Button */}
                  <div className="pt-1 pointer-events-auto">
                    <Link
                      to={`/details/${item.id}`}
                      className="w-full sm:w-[320px] flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] text-slate-950 font-black text-xs tracking-widest uppercase transition-all shadow-[0_4px_25px_rgba(77,107,254,0.35)] hover:bg-gradient-to-t active:scale-95 text-center"
                    >
                      <span>Watch Now</span>
                      <Play className="w-4 h-4 fill-current text-slate-950 stroke-none" />
                    </Link>
                  </div>

                </div>              </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ==========================================
          5. BOTTOM COMMENTS METROPOLITAN SHEET
         ========================================== */}
      <AnimatePresence>
        {showComments && activeItem && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="absolute bottom-0 inset-x-0 h-[65vh] bg-[#0c101b]/98 border-t border-white/10 rounded-t-[30px] z-[120] flex flex-col justify-between shadow-[0_-20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
          >
            {/* Header section of comment drawer */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 select-none shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-black uppercase tracking-wider font-sans">
                  Comments
                </span>
                <span className="text-white/40 text-[11px] bg-white/5 px-2 py-0.5 rounded-full font-bold">
                  {activeItem.commentsCount}
                </span>
              </div>
              <button 
                onClick={() => setShowComments(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-colors text-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of comments scrolling viewport */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 hide-scrollbar">
              {((commentsMap[activeItem.id]) || []).map((comm) => (
                <div key={comm.id} className="flex gap-3 items-start p-1 relative">
                  
                  {/* Initials profile avatar scene */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black select-none shrink-0 ${
                    comm.isOfficial 
                      ? "bg-brand text-black shadow-[0_0_10px_rgba(244,196,48,0.3)]" 
                      : "bg-white/10 text-white"
                  }`}>
                    {comm.isOfficial ? "AT" : comm.name.substring(0, 2).toUpperCase()}
                  </div>

                  {/* Comment context body block */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 wrap">
                      <span className="text-white/90 text-xs font-extrabold lowercase">
                        @{comm.name.toLowerCase()}
                      </span>
                      {comm.isOfficial && (
                        <span className="bg-brand text-black text-[7px] font-black uppercase px-1 rounded flex items-center gap-0.5">
                          <Verified className="w-2 h-2" />
                          <span>Creator</span>
                        </span>
                      )}
                      <span className="text-white/35 text-[9px] font-medium">{comm.time}</span>
                    </div>
                    <p className="text-white/80 text-xs sm:text-sm leading-relaxed font-sans pr-4 select-text">
                      {comm.text}
                    </p>
                  </div>

                </div>
              ))}
            </div>

            {/* Bottom stick content input field */}
            <form 
              onSubmit={postComment}
              className="p-4 border-t border-white/5 bg-[#070a12]/95 backdrop-blur-md flex items-center gap-3 shrink-0"
            >
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={user ? `Add public comment on ${activeItem.title}...` : "Sign in under profile to join discussion..."}
                disabled={!user}
                className="flex-1 bg-white/5 rounded-full py-3.5 px-5 text-xs text-white focus:outline-none focus:bg-white/10 focus:border-brand/40 border border-white/5 transition-all placeholder-white/30"
              />
              <button
                type="submit"
                disabled={!user || !newCommentText.trim()}
                className="w-11 h-11 rounded-full bg-brand disabled:bg-white/5 text-black disabled:text-white/30 flex items-center justify-center active:scale-95 transition-all shadow-[0_4px_12px_rgba(244,196,48,0.2)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ==========================================
          6. RATING INTERACTIVE GLASS PICKER MODAL
         ========================================== */}
      <AnimatePresence>
        {showRatingPicker && activeItem && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[150] flex items-center justify-center p-4 select-none">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-[#090d16] border border-white/10 p-6 rounded-[24px] flex flex-col items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
            >
              <div className="flex flex-col items-center text-center gap-1">
                <div className="w-12 h-12 rounded-full bg-brand/10 flex items-center justify-center text-brand mb-2">
                  <Star className="w-6 h-6 fill-current text-brand" />
                </div>
                <h3 className="text-white text-base font-black uppercase tracking-wider font-sans">
                  Rate Trailer
                </h3>
                <p className="text-white/40 text-xs px-2">
                  Add your rating for "{activeItem.title}" to update the community average scores out of 10.
                </p>
              </div>

              {/* 10 Star dynamic voting grid */}
              <div className="grid grid-cols-5 gap-2 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => {
                  const isGold = (activeItem.myRating || 0) >= star;

                  return (
                    <button
                      key={`star-idx-${star}`}
                      onClick={() => handleRate(activeItem.id, star)}
                      className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center text-xs border transition-all duration-200 ${
                        isGold 
                          ? "bg-brand/20 border-brand text-brand shadow-[0_0_10px_rgba(244,196,48,0.2)]" 
                          : "bg-white/[0.03] border-white/5 text-white/50 hover:border-white/20 hover:text-white"
                      }`}
                    >
                      {star}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowRatingPicker(false)}
                className="w-full py-3.5 bg-white/5 text-white/80 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white/10 transition-colors"
              >
                Cancel / Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          7. SAVE TO PLAYLIST HIGH-FIDELITY BOTTOM SHEET
         ========================================== */}
      <AnimatePresence>
        {showPlaylistSheet && activeItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[140] flex items-end justify-center">
            {/* Click backdrop to close */}
            <div className="absolute inset-0 z-0" onClick={() => setShowPlaylistSheet(false)} />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="relative w-full max-w-sm sm:max-w-md bg-[#0a0d16] border-t border-white/10 rounded-t-[30px] z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[75vh]"
            >
              {/* Central pull pill graphic */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 shrink-0" />

              <div className="px-5 pb-3 flex items-center justify-between border-b border-white/5 shrink-0">
                <h3 className="text-white text-md font-black uppercase tracking-wider font-sans">
                  Save to Playlist
                </h3>
                <button
                  onClick={() => setIsAddingNewPlaylist(p => !p)}
                  className="text-xs font-bold text-[#809bfb] hover:text-white transition-colors"
                >
                  {isAddingNewPlaylist ? "Cancel" : "+ New Playlist"}
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-4">
                {/* Inline Add New Playlist Field */}
                <AnimatePresence>
                  {isAddingNewPlaylist && (
                    <motion.form
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      onSubmit={handleCreateLocalPlaylist}
                      className="space-y-2 overflow-hidden border-b border-white/5 pb-4"
                    >
                      <label className="block text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        New Playlist Name
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          placeholder="e.g. Action Masterpieces..."
                          className="flex-1 bg-white/5 rounded-xl px-4 py-2 text-xs text-white border border-white/10 focus:outline-none focus:border-brand/40"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-[#809bfb] hover:bg-opacity-90 text-black font-extrabold text-xs"
                        >
                          Create
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Playlists List row layout */}
                <div className="space-y-3">
                  {localPlaylists.map((play) => (
                    <div 
                      key={play.id}
                      onClick={() => {
                        togglePlaylistCheck(play.id);
                        showToast(
                          play.checked 
                            ? `Removed "${activeItem.title}" from ${play.name}` 
                            : `Saved "${activeItem.title}" to ${play.name}!`,
                          "success"
                        );
                      }}
                      className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:bg-white/5 hover:border-white/10 transition-all select-none"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/40">
                          <Folder className="w-5 h-5 text-[#809bfb]" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-bold font-sans">
                            {play.name}
                          </p>
                          <p className="text-white/40 text-[10px] font-semibold mt-0.5">
                            {play.videoCount} videos
                          </p>
                        </div>
                      </div>

                      {/* Circular check indicator */}
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        play.checked 
                          ? "bg-[#809bfb] border-[#809bfb] text-black" 
                          : "border-white/20 bg-transparent"
                      }`}>
                        {play.checked && <Check className="w-3.5 h-3.5 stroke-[3px]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save done action */}
              <div className="p-4 border-t border-white/5 shrink-0 bg-black/40">
                <button
                  onClick={() => setShowPlaylistSheet(false)}
                  className="w-full py-3.5 bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_15px_rgba(77,107,254,0.25)]"
                >
                  Save / Close
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          8. HIGH-FIDELITY DOWNLOAD MOVIE RESOLUTION SELECT SHEET
         ========================================== */}
      <AnimatePresence>
        {showDownloadPanel && activeItem && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[140] flex items-end justify-center">
            {/* Click backdrop to close if not downloading */}
            <div className="absolute inset-0 z-0" onClick={() => { if (!isDownloading) setShowDownloadPanel(false); }} />
            
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="relative w-full max-w-sm sm:max-w-md bg-[#0a0d16] border-t border-white/10 rounded-t-[30px] z-10 shadow-[0_-15px_40px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            >
              {/* Central pull pill graphic */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto my-3 shrink-0" />

              <div className="px-5 pb-3 flex items-center justify-between border-b border-white/5 shrink-0">
                <h3 className="text-white text-md font-black uppercase tracking-wider font-sans">
                  {isDownloading ? "Downloading Movie" : "Download Movie"}
                </h3>
                {!isDownloading && (
                  <button
                    onClick={() => setShowDownloadPanel(false)}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="p-5 space-y-5">
                {isDownloading ? (
                  /* Active compilation tracking bar */
                  <div className="space-y-4 py-3 select-none">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#809bfb]/10 flex items-center justify-center text-[#809bfb] shrink-0">
                        <ArrowDownToLine className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white text-xs font-bold leading-tight truncate">
                          Downloading "{activeItem.title}"
                        </h4>
                        <p className="text-white/40 text-[10px] uppercase font-semibold tracking-wider mt-0.5">
                          Resolution: {selectedResolution} Full HD
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-extrabold text-white">
                        <span className="text-[#809bfb]">Compilation blocks syncing</span>
                        <span>{downloadProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden p-px border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] rounded-full transition-all duration-200"
                          style={{ width: `${downloadProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-white/35">
                        <span>Speed: 15.4 Mbps</span>
                        <span>{downloadProgress < 100 ? "Syncing download packages..." : "Completed!"}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Resolution selectors list */
                  <div className="space-y-3.5">
                    <p className="text-white/50 text-xs leading-relaxed">
                      Select local download resolution size. Offline items will sync onto your playlist account.
                    </p>

                    <div className="space-y-2.5">
                      {[
                        { res: "1080p", label: "1080p Ultra HD", desc: "Highest definition", size: "2.4 GB" },
                        { res: "720p", label: "720p HD", desc: "Standard high resolution", size: "1.2 GB" },
                        { res: "480p", label: "480p SD", desc: "Data saver compatibility", size: "600 MB" },
                        { res: "360p", label: "360p Low", desc: "Minimum bandwidth size", size: "300 MB" },
                      ].map((opt) => (
                        <div
                          key={opt.res}
                          onClick={() => setSelectedResolution(opt.res)}
                          className={`flex items-center justify-between p-3.5 bg-white/[0.02] border rounded-2xl cursor-pointer hover:bg-white/5 transition-all select-none ${
                            selectedResolution === opt.res 
                              ? "border-[#809bfb] bg-[#809bfb]/5" 
                              : "border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              selectedResolution === opt.res 
                                ? "border-[#809bfb] text-[#809bfb]" 
                                : "border-white/20"
                            }`}>
                              {selectedResolution === opt.res && (
                                <div className="w-2 h-2 rounded-full bg-[#809bfb]" />
                              )}
                            </div>
                            <div>
                              <p className="text-white text-xs font-bold leading-tight">{opt.label}</p>
                              <p className="text-white/40 text-[10px] font-semibold mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                          <span className="text-white/60 text-xs font-extrabold">{opt.size}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Download action buttons bar */}
              <div className="p-4 border-t border-white/5 bg-black/40">
                {isDownloading ? (
                  <button
                    disabled
                    className="w-full py-3.5 bg-white/5 text-white/30 rounded-full font-bold text-xs uppercase tracking-widest cursor-not-allowed"
                  >
                    Processing Download...
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsDownloading(true);
                      startDownload();
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] text-slate-950 rounded-full font-black text-xs uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_15px_rgba(77,107,254,0.25)]"
                  >
                    Download ({selectedResolution})
                  </button>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          9. CREATOR ACCOUNT PROFILE SLIDEOUT PANEL (DESIGNED AFTER CHATGPT)
         ========================================== */}
      <AnimatePresence>
        {showCreatorPanel && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[140] flex justify-end">
            {/* Click backdrop to exit creator details */}
            <div className="absolute inset-0 z-0 animate-fade-in" onClick={() => setShowCreatorPanel(false)} />
            
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 29, stiffness: 220 }}
              className="relative w-full max-w-sm sm:max-w-md h-full bg-[#0a0d16] border-l border-white/10 z-10 shadow-[0_0_60px_rgba(0,0,0,0.95)] overflow-y-auto flex flex-col"
            >
              {/* Creator Card header banner */}
              <div className="h-40 w-full relative shrink-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#809bfb]/25 via-black/40 to-[#0a0d16] z-10" />
                <div className="absolute inset-0 bg-black/40" />
                
                {/* Back / Close Button */}
                <button 
                  onClick={() => setShowCreatorPanel(false)}
                  className="absolute top-6 left-6 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black border border-white/10 flex items-center justify-center text-white/90 active:scale-95 transition-all shadow-md"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Main Content Scroll Body */}
              <div className="flex-1 px-6 pb-12 flex flex-col items-center text-center -mt-16 relative z-20 space-y-6">
                
                {/* Large white margin GLOWING AVATAR panel */}
                <div className="w-24 h-24 rounded-full border-[3px] border-white bg-black flex items-center justify-center shadow-2xl relative select-none">
                  <div className="text-white font-black text-xl tracking-widest uppercase">
                    AXIS
                  </div>
                  <span className="absolute bottom-1 right-1 w-4.5 h-4.5 bg-green-500 rounded-full border-[3px] border-black" />
                </div>

                {/* Verified name lines */}
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <h2 className="text-white text-xl font-black uppercase tracking-wider font-sans leading-none">
                      Axis Trails
                    </h2>
                    <Verified className="w-4.5 h-4.5 text-[#809bfb] fill-current" />
                  </div>
                  <p className="text-[#809bfb] text-xs font-black uppercase tracking-widest mt-1">
                    AXIS Labs™ Official Creator
                  </p>
                </div>

                {/* Account metrics row - centered & high-contrast */}
                <div className="flex items-center gap-4 select-none bg-white/[0.02] border border-white/5 py-4 px-6 rounded-2xl w-full justify-around shadow-sm font-sans">
                  <div className="text-center">
                    <p className="text-white text-md font-black">96</p>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5">Videos</p>
                  </div>
                  <div className="border-r border-white/10 h-7" />
                  <div className="text-center">
                    <p className="text-white text-md font-black">250K</p>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5">Followers</p>
                  </div>
                  <div className="border-r border-white/10 h-7" />
                  <div className="text-center">
                    <p className="text-white text-md font-black">1</p>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5">Following</p>
                  </div>
                </div>

                {/* Description bio matching figma source */}
                <p className="text-white/75 text-xs sm:text-sm leading-relaxed font-sans max-w-sm px-1 pt-1">
                  The official source for premium movie trailers, cinematic moments, and exclusive previews. Produced in-house by AXIS Labs™.
                </p>

                {/* Primary capsule style action: FOLLOW details */}
                <div className="w-full pt-1">
                  <button
                    onClick={followCreator}
                    className={`w-full py-3.5 text-xs font-black tracking-widest uppercase rounded-full transition-all shadow-md active:scale-95 ${
                      isFollowing 
                        ? "bg-white/10 border border-white/10 text-white" 
                        : "bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] text-slate-950"
                    }`}
                  >
                    {isFollowing ? "✓ Following Account" : "Follow Axis Trails"}
                  </button>
                </div>

                {/* "Links" section block header and buttons */}
                <div className="space-y-2.5 w-full pt-4 text-left select-none">
                  <h3 className="text-white/45 text-[10px] font-black uppercase tracking-widest pl-1">
                    Connect Channels
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a 
                      href="https://youtube.com" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 text-white/80 transition-colors"
                    >
                      <span className="text-red-500">📺</span>
                      <span className="font-bold">YouTube</span>
                    </a>
                    <a 
                      href="https://telegram.org" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 text-white/80 transition-colors"
                    >
                      <span className="text-sky-400">💬</span>
                      <span className="font-bold">Telegram</span>
                    </a>
                  </div>
                </div>

                {/* Preview Collection Items thumbnails */}
                <div className="space-y-3 w-full pt-4 text-left select-none">
                  <h3 className="text-white text-xs font-black uppercase tracking-wider font-sans pl-1">
                    Trending Trailers Preview
                  </h3>
                  <div className="grid grid-cols-3 gap-2.5 font-sans">
                    {items.slice(0, 3).map((mItem, mIdx) => (
                      <div 
                        key={`crea-thumb-${mItem.id}`}
                        onClick={() => {
                          setShowCreatorPanel(false);
                          setActiveIndex(mIdx);
                        }}
                        className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 hover:border-[#809bfb] transition-colors cursor-pointer relative group"
                      >
                        <MovieImage
                          src={mItem.poster}
                          alt={mItem.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <Play className="w-5 h-5 text-white fill-current opacity-70 group-hover:opacity-100" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer copyright */}
                <div className="text-white/20 text-[9px] font-semibold uppercase tracking-widest pt-5 select-none w-full border-t border-white/[0.03]">
                  © 2024 AXIS Labs™. All rights reserved.
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
