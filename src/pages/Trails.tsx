import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Heart, MessageCircle, Share2, Bookmark, Star, Download, Plus, Play, Check, 
  ChevronLeft, Users, Video, Send, X, Volume2, VolumeX, Flame, Verified,
  ExternalLink, ArrowDownToLine, ShoppingBag, Radio, Folder, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { movieService } from "../services/movieService";
import { MovieImage } from "../components/MovieImage";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import Navbar from "../components/Navbar";
import { MetaVerifiedBadge } from "../components/MetaVerifiedBadge";
import { Skeleton, ListSkeleton, CardSkeleton } from "../components/Skeleton";
import { formatDurationToHours, slugify } from "../types";

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
  const { movieSlug } = useParams();
  const { showToast } = useToast();
  const { user, preferences, isInWatchlist, addToWatchlist, removeFromWatchlist } = useAuth();

  const [isDesktop, setIsDesktop] = useState(() => {
    try {
      return typeof window !== "undefined" && window.innerWidth >= 1024;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [items, setItems] = useState<TrailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => {
    try {
      return localStorage.getItem('axis_followed_axistrails') === 'true';
    } catch {
      return false;
    }
  });
  const [showCreatorPanel, setShowCreatorPanel] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [showDownloadPanel, setShowDownloadPanel] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  const [isDataSaver, setIsDataSaver] = useState(false);
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; x: number; y: number }>>([]);

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
        const hot = await movieService.getHot().catch(() => ({ movies: [], series: [] }));
        
        let firstHotId = hot.movies[0]?.id || hot.series[0]?.id || "default_id";
        
        // Fetch recommendations based on the first hot item
        const recommendations = await movieService.getRecommendations(firstHotId, 1, 30).catch(() => []);
        
        // Accumulate unique items
        const rawList = [
          ...(recommendations || []),
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
            if (!rawTrailer) continue;
            const finalTrailer = rawTrailer;
            
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
              likes: Math.floor(Math.random() * 25000) + 1200,
              commentsCount: Math.floor(Math.random() * 25) + 5,
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

        // if everything fails, we just have an empty list, UI handles it.

        let finalList = trailItems;
        if (movieSlug) {
          try {
            const searchTitle = movieSlug.replace(/-/g, " ");
            const searchResults = await movieService.search(searchTitle);
            if (searchResults && searchResults.length > 0) {
              const bestMatch = searchResults.find(m => 
                slugify(m.title) === movieSlug.toLowerCase()
              ) || searchResults[0];
              
              const details = await movieService.getDetails(bestMatch.id);
              const rawTrailer = details.trailerUrl || details.detailPath || "";
              if (!rawTrailer) throw new Error("No trailer");
              const finalTrailer = rawTrailer;
              
              const sharedItem: TrailItem = {
                id: bestMatch.id,
                title: bestMatch.title,
                poster: bestMatch.poster || details.poster || "",
                background: details.background || bestMatch.poster || "",
                rating: details.rating || bestMatch.rating || "8.5",
                releaseYear: details.year || bestMatch.year || "2026",
                genres: details.genres || (bestMatch.category ? [bestMatch.category] : ["Premiere"]),
                description: details.description || bestMatch.description || "A masterfully curated theatrical release showing exclusively on Axis TV.",
                type: String(details.type || (bestMatch.type === "Series" || bestMatch.type === 2 ? "Series" : "Movie")),
                trailerUrl: finalTrailer,
                likes: Math.floor(Math.random() * 25000) + 1200,
                commentsCount: Math.floor(Math.random() * 25) + 5,
                shares: 110,
                saves: 85,
                isLikedByMe: false,
                isSavedByMe: false,
                myRating: null,
                duration: details.duration,
                contentRating: details.contentRating || "16+",
              };
              
              finalList = [sharedItem, ...trailItems.filter(t => t.id !== sharedItem.id)];
            }
          } catch (e) {
            console.warn("Shared slug load failed", e);
          }
        }

        setItems(finalList);
        setActiveIndex(0);
        
        // Populate initial comments
        const initialComments: Record<string, any> = {};
        
        

        finalList.forEach(item => {
          const generatedComments: any[] = [];
          
          // 1. Add official Axis Trails comment
          generatedComments.push({
            id: `official-${item.id}`,
            name: "Axis Trails",
            text: `🎯 Axis TV Selects: Presenting "${item.title}" (${item.releaseYear}). Genre: ${item.genres.join(', ')}. IMDb prediction: ${item.rating || '8.8'}/10. Description: ${item.description.slice(0, 85)}... Watch this movie now!`,
            time: "1h ago",
            isOfficial: true
          });
          
          initialComments[item.id] = generatedComments;
        });
        setCommentsMap(initialComments);

      } catch (err) {
        showToast("Unable to load trails feed right now.", "error");
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [movieSlug]);

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
    const shareUrl = `${window.location.origin}/trails/${slugify(item.title)}`;
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
      time: "Just now",
      isDev: user.email === "greatmayuku2@gmail.com"
    };

    setCommentsMap(prev => ({
      ...prev,
      [activeItem.id]: [newComment, ...currentComments]
    }));

    setItems(prev => prev.map(t => t.id === activeItem.id ? { ...t, commentsCount: t.commentsCount + 1 } : t));
    setNewCommentText("");

    
  };

  const followCreator = () => {
    setIsFollowing(true);
    try {
      localStorage.setItem('axis_followed_axistrails', 'true');
    } catch {}
    showToast("Permanently followed Axis Trails!", "success");
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>, item: TrailItem) => {
    e.preventDefault();
    if (!item.isLikedByMe) {
      toggleLike(item.id);
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newHeart = {
      id: Date.now() + Math.random(),
      x,
      y
    };
    
    setFloatingHearts(prev => [...prev, newHeart]);
    
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 800);
  };

  const formatShortNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="flex h-[100dvh] w-full bg-[#04060c] text-white relative overflow-hidden font-sans lg:pl-64 justify-center items-center">
      {/* Immersive blurred full screen ambient glow background on desktop */}
      <div className="absolute inset-0 hidden lg:block z-0 pointer-events-none overflow-hidden scale-110 opacity-20 blur-[130px] transition-all duration-1000 select-none">
        {activeItem && (
          <MovieImage
            src={activeItem.background || activeItem.poster}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Hide standard layout backgrounds or footers inside this immersive player */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.33%, 0, 0); }
        }
        .animate-marquee-slow {
          display: flex;
          width: max-content;
          animation: marquee 16s linear infinite;
        }
        /* Lock view height to solve mobile layout triggers */
        @supports (-webkit-touch-callout: none) {
          .h-screen {
            height: -webkit-fill-available;
          }
        }
      `}</style>

      {/* Primary DESKTOP SIDEBAR overlay layout integration */}
      <div className="hidden lg:block relative z-30 select-none">
        <Navbar />
      </div>

      {/* Immersive cinematic dashboard centered on desktop, full-viewport on mobile */}
      <div className="relative w-full h-[100dvh] lg:h-[88vh] lg:max-h-[820px] lg:my-auto lg:w-[94vw] lg:max-w-[1240px] lg:rounded-[32px] bg-[#070a13] border border-transparent lg:border-white/10 overflow-hidden shadow-2xl lg:shadow-[0_24px_85px_rgba(0,0,0,0.85)] z-20 flex flex-col">
        
        {/* Loading overlay panel */}
        {loading && (
          <div className="absolute inset-0 bg-[#04060c]/98 z-50 p-6 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="w-24 h-8 rounded-full" />
                <Skeleton className="w-24 h-8 rounded-full" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-end w-full mb-12">
              <div className="flex-1 space-y-4">
                <Skeleton className="h-12 w-2/3 rounded-lg" />
                <div className="flex gap-3">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div className="space-y-2 max-w-xl">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>
              <div className="w-full md:w-80 shrink-0 space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Liquid Glass Top Header overlay on mobile only (desktop layout has inline header elements) */}
        <header className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-black/85 via-black/45 to-transparent pt-4 pb-12 px-4 flex items-center justify-between pointer-events-auto select-none gap-2 lg:hidden">
          <button 
            onClick={() => navigate("/")}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-black/45 border border-white/10 backdrop-blur-md active:scale-95 transition-all text-white/80 hover:text-white shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center font-black uppercase tracking-widest text-[11px] text-white/80 bg-black/40 border border-white/10 backdrop-blur-md px-4 py-2 rounded-full shadow-lg">
            Axis Trails
          </div>

          <div className="w-10 h-10 shrink-0 opacity-0 pointer-events-none" />
        </header>

        {/* Master swipable snap container */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-scroll snap-y snap-mandatory hide-scrollbar w-full h-full bg-[#03050a] relative"
          style={{ scrollSnapType: "y mandatory", scrollBehavior: "auto" }}
        >
          {items.map((item, index) => {
            const isCurrentlyActive = index === activeIndex;
            const shouldRenderMobileVideo = isCurrentlyActive && !isDesktop;
            const shouldRenderDesktopVideo = isCurrentlyActive && isDesktop;

            const isYoutube = item.trailerUrl && getYouTubeId(item.trailerUrl) !== "";
            const embedSrcMobile = shouldRenderMobileVideo 
              ? getEmbedUrl(item.trailerUrl, isCurrentlyActive, isMuted, isDataSaver) 
              : "";
            const embedSrcDesktop = shouldRenderDesktopVideo 
              ? getEmbedUrl(item.trailerUrl, isCurrentlyActive, isMuted, isDataSaver) 
              : "";
            
            const isWatchlisted = isInWatchlist(item.id);

            return (
              <div 
                key={`slide-${item.id}-${index}`}
                className="w-full h-full snap-start relative bg-black overflow-hidden select-none"
                style={{ height: "100%" }}
              >
                
                {/* ========================================================
                    MOBILE VIEW (lg:hidden) - Ultra-slick Fullscreen TikTok Style
                   ======================================================== */}
                <div className="w-full h-full flex flex-col justify-end relative lg:hidden">
                  {/* Cinematic Background Backdrop & Video Embed Frame */}
                  <div className="absolute inset-0 w-full h-full bg-black z-0">
                    <div className="absolute inset-0 w-full h-full select-none pointer-events-none overflow-hidden scale-110 opacity-35 blur-3xl z-0">
                      <MovieImage
                        src={item.background || item.poster}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {shouldRenderMobileVideo ? (
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
                                src={embedSrcMobile}
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
                            
                            {iframeLoading && isCurrentlyActive && (
                              <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
                                <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand animate-pulse">Loading Video Teaser...</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {(!isCurrentlyActive || (isYoutube && iframeLoading)) && (
                          <MovieImage
                            src={item.background || item.poster}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-contain z-10 brightness-[0.7] transition-opacity duration-300 pointer-events-none"
                          />
                        )}

                        {isCurrentlyActive && (
                          <div 
                            onDoubleClick={(e) => handleDoubleClick(e, item)}
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/35 z-10 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black via-black/75 to-transparent z-15 pointer-events-none" />
                  </div>

                  {isCurrentlyActive && floatingHearts.map(heart => (
                    <motion.div
                      key={heart.id}
                      initial={{ scale: 0, opacity: 1, rotate: Math.random() * 40 - 20 }}
                      animate={{ 
                        scale: [1, 2.2, 1.8], 
                        opacity: [1, 1, 0],
                        y: heart.y - 120 
                      }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="absolute pointer-events-none z-40 text-[#ff0050] drop-shadow-[0_0_20px_rgba(255,0,80,0.9)]"
                      style={{ left: heart.x - 24, top: heart.y - 24 }}
                    >
                      <Heart className="w-12 h-12 fill-current" />
                    </motion.div>
                  ))}

                  <div className="absolute right-3.5 bottom-24 z-30 flex flex-col items-center gap-4.5 selection:bg-transparent">
                    <div className="relative mb-2 flex flex-col items-center select-none">
                      <button 
                        onClick={() => setShowCreatorPanel(true)}
                        className="w-11 h-11 rounded-full border-2 border-white/20 p-0.5 bg-black hover:border-brand/50 transition-colors shadow-2xl relative"
                      >
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-black text-[9px] text-white tracking-widest leading-none">
                          AXIS
                        </div>
                      </button>
                      <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                      
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
                            className="absolute -bottom-1 w-[18px] h-[18px] rounded-full bg-[#ff0050] text-white hover:scale-105 flex items-center justify-center font-bold shadow-xl transition-all"
                          >
                            <Plus className="w-3 h-3 stroke-[3px]" />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-center select-none group">
                      <button 
                        onClick={() => toggleLike(item.id)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-75 shadow-lg backdrop-blur-md ${
                          item.isLikedByMe 
                            ? "bg-[#ff0050]/20 border-[#ff0050] text-[#ff0050] shadow-[0_0_12px_rgba(255,0,80,0.4)]" 
                            : "bg-black/35 border-white/10 text-white/95 hover:bg-black/55 group-hover:scale-105"
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${item.isLikedByMe ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-[10px] font-black text-white/90 drop-shadow mt-1 select-none font-mono">
                        {formatShortNumber(item.likes)}
                      </span>
                    </div>

                    {!preferences?.kidsMode && (
                      <div className="flex flex-col items-center select-none group">
                        <button 
                          onClick={() => setShowComments(true)}
                          className="w-11 h-11 rounded-full flex items-center justify-center border border-white/10 text-white bg-black/35 hover:bg-black/55 group-hover:scale-105 transition-all duration-200 active:scale-75 shadow-lg backdrop-blur-md"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </button>
                        <span className="text-[10px] font-black text-white/90 drop-shadow mt-1 select-none font-mono">
                          {formatShortNumber(item.commentsCount)}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col items-center select-none group">
                      <button 
                        onClick={() => toggleSave(item.id)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-200 active:scale-75 shadow-lg backdrop-blur-md ${
                          isInWatchlist(item.id)
                            ? "bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" 
                            : "bg-black/35 border-white/10 text-white hover:bg-black/55 group-hover:scale-105"
                        }`}
                      >
                        <Bookmark className={`w-5 h-5 ${isInWatchlist(item.id) ? "fill-current" : ""}`} />
                      </button>
                      <span className="text-[10px] font-black text-white/90 drop-shadow mt-1 select-none font-mono">
                        {formatShortNumber(item.saves)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center select-none group">
                      <button 
                        onClick={() => handleShare(item)}
                        className="w-11 h-11 rounded-full flex items-center justify-center border border-white/10 text-white bg-black/35 hover:bg-black/55 group-hover:scale-105 transition-all duration-200 active:scale-75 shadow-lg backdrop-blur-md"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                      <span className="text-[10px] font-black text-white/90 drop-shadow mt-1 select-none font-mono">
                        {formatShortNumber(item.shares)}
                      </span>
                    </div>
                  </div>

                  <div className="absolute left-3.5 bottom-4 max-w-[calc(100%-72px)] z-30 select-none space-y-2 pointer-events-none pb-1 pr-1 text-left">
                    <div className="flex items-center gap-1.5 pointer-events-auto">
                      <span 
                        onClick={() => setShowCreatorPanel(true)}
                        className="text-white text-xs font-black lowercase hover:underline cursor-pointer flex items-center gap-1 leading-none select-text"
                      >
                        @axistrails
                      </span>
                      <MetaVerifiedBadge className="w-3.5 h-3.5" />
                      <span className="bg-[#ff0050]/20 text-[#ff0050] text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-[#ff0050]/10 tracking-widest leading-none scale-95 origin-left">
                        Creator
                      </span>
                    </div>

                    <div className="space-y-0.5 pointer-events-auto select-text">
                      <h3 className="text-white text-xs font-black uppercase tracking-wider line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-white/85 text-[10px] leading-relaxed line-clamp-2 pr-1 font-sans">
                        {item.description}
                      </p>
                      <div className="text-[#00f2fe] text-[9px] font-extrabold flex gap-1 flex-wrap select-none mt-0.5 pointer-events-auto">
                        <span>#axisexclusives</span>
                        <span>#{item.genres[0]?.toLowerCase() || "cinema"}</span>
                        <span>#weeklypremier</span>
                        <span>#axistrails</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[8px] font-bold text-white/50 pt-0.5 font-mono">
                      <span>{item.releaseYear}</span>
                      {item.duration && (
                        <>
                          <span>•</span>
                          <span>{formatDurationToHours(item.duration)}</span>
                        </>
                      )}
                    </div>

                    <div className="pt-1 flex flex-wrap items-center gap-2 pointer-events-auto">
                      <Link
                        to={`/watch/${slugify(item.title)}`}
                        className="inline-flex items-center justify-center gap-2 py-2 px-4.5 rounded-full bg-gradient-to-r from-[#25f4ee] to-[#00f2fe] text-black font-black text-[9px] tracking-widest uppercase transition-all shadow-[0_4px_12px_rgba(37,244,238,0.25)] hover:scale-105 active:scale-95 translate-y-0.5 shrink-0"
                      >
                        <span>Stream Full Release</span>
                        <Play className="w-2.5 h-2.5 fill-current text-black stroke-none" />
                      </Link>

                      <button
                        onClick={() => toggleSave(item.id)}
                        className="inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-black text-[9px] tracking-widest uppercase transition-all border border-white/10 hover:scale-105 active:scale-95 translate-y-0.5 shrink-0"
                      >
                        <span>{isInWatchlist(item.id) ? 'Saved to List' : 'Add to List'}</span>
                        <Bookmark className={`w-2.5 h-2.5 ${isInWatchlist(item.id) ? "fill-current text-white" : "text-white"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ========================================================
                    DESKTOP VIEW (hidden lg:flex) - Mature Cinema dual-panel theatre board
                   ======================================================== */}
                <div className="hidden lg:flex w-full h-full flex-row bg-[#05080f]">
                  
                  {/* Left Side: Cinematic Portrait Player Panel */}
                  <div className="w-[44%] h-full relative bg-black flex flex-col justify-center items-center border-r border-white/5 overflow-hidden">
                    <div className="absolute inset-0 w-full h-full select-none pointer-events-none overflow-hidden scale-110 opacity-30 blur-3xl z-0">
                      <MovieImage
                        src={item.background || item.poster}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {shouldRenderDesktopVideo ? (
                      <div className="w-full h-full relative flex items-center justify-center">
                        {!item.trailerUrl ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070a13]/80 z-20">
                            <div className="relative z-10 px-8 py-6 rounded-2xl bg-black/60 border border-white/10 backdrop-blur-md flex flex-col items-center gap-3 max-w-xs text-center shadow-2xl">
                              <span className="text-2xl">🎬</span>
                              <span className="text-sm font-black uppercase tracking-wider text-white">No Trailer</span>
                              <span className="text-xs text-white/50 leading-relaxed">This exclusive release does not have a public trailer. Check out the movie details on the right!</span>
                            </div>
                          </div>
                        ) : (
                          <div className={`w-full h-full relative flex items-center justify-center transition-opacity duration-300 ${isCurrentlyActive ? 'opacity-100' : 'opacity-0'}`}>
                            {isYoutube ? (
                              <iframe
                                src={embedSrcDesktop}
                                title={item.title}
                                onLoad={() => {
                                  if (isCurrentlyActive) {
                                    setIframeLoading(false);
                                  }
                                }}
                                className="w-full aspect-video border-0 select-none brightness-[0.93] pointer-events-none z-10 shadow-2xl relative"
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
                                onWaiting={() => { if (isCurrentlyActive) setIframeLoading(true); }}
                                onPlaying={() => { if (isCurrentlyActive) setIframeLoading(false); }}
                                onCanPlay={() => { if (isCurrentlyActive) setIframeLoading(false); }}
                                className="w-full aspect-video object-contain brightness-[0.93] pointer-events-none z-10"
                              />
                            )}
                            
                            {iframeLoading && isCurrentlyActive && (
                              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30 pointer-events-none">
                                <div className="w-10 h-10 border-4 border-[#25f4ee] border-t-transparent rounded-full animate-spin" />
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#25f4ee] animate-pulse">Synchronizing feed...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {(!isCurrentlyActive || (isYoutube && iframeLoading)) && (
                          <MovieImage
                            src={item.background || item.poster}
                            alt={item.title}
                            className="absolute inset-0 w-full h-full object-cover z-10 brightness-[0.6] transition-opacity duration-300 pointer-events-none"
                          />
                        )}

                        {isCurrentlyActive && (
                          <div 
                            onDoubleClick={(e) => handleDoubleClick(e, item)}
                            onClick={() => setIsMuted(!isMuted)}
                            className="absolute inset-0 z-20 cursor-pointer pointer-events-auto" 
                          />
                        )}
                      </div>
                    ) : (
                      <MovieImage
                        src={item.background}
                        alt={item.title}
                        className="w-full h-full object-cover brightness-[0.4]"
                      />
                    )}

                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 via-black/30 to-transparent z-15 pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-15 pointer-events-none" />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(!isMuted);
                      }}
                      className="absolute top-6 right-6 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white transition-all backdrop-blur-md active:scale-95"
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest font-mono text-rose-400">MUTED</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-[#25f4ee]" />
                          <span className="text-[9px] font-black uppercase tracking-widest font-mono text-[#25f4ee]">UNMUTED</span>
                        </>
                      )}
                    </button>

                    {isCurrentlyActive && floatingHearts.map(heart => (
                      <motion.div
                        key={`heart-desk-${heart.id}`}
                        initial={{ scale: 0, opacity: 1, rotate: Math.random() * 40 - 20 }}
                        animate={{ 
                          scale: [1, 2.2, 1.8], 
                          opacity: [1, 1, 0],
                          y: heart.y - 120 
                        }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="absolute pointer-events-none z-40 text-[#ff0050] drop-shadow-[0_0_20px_rgba(255,0,80,0.9)]"
                        style={{ left: heart.x - 24, top: heart.y - 24 }}
                      >
                        <Heart className="w-12 h-12 fill-current" />
                      </motion.div>
                    ))}

                    <div className="absolute left-6 bottom-6 z-35 flex items-center gap-3 bg-black/50 border border-white/5 backdrop-blur-md p-2.5 rounded-2xl max-w-[260px] select-none pointer-events-auto">
                      <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
                        <div 
                          className="animate-spin" 
                          style={{ animationDuration: isMuted ? '0s' : '7s' }}
                        >
                          <svg className="w-5.5 h-5.5 text-[#25f4ee] drop-shadow-[0_0_6px_rgba(37,244,238,0.4)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3.5" />
                            <circle cx="12" cy="6.5" r="1.2" fill="currentColor" />
                            <circle cx="12" cy="17.5" r="1.2" fill="currentColor" />
                            <circle cx="6.5" cy="12" r="1.2" fill="currentColor" />
                            <circle cx="17.5" cy="12" r="1.2" fill="currentColor" />
                          </svg>
                        </div>
                      </div>

                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 font-mono leading-none mb-1">SCORE COMPOSER</span>
                        <div className="w-36 overflow-hidden relative whitespace-nowrap [mask-image:linear-gradient(to_right,transparent_0%,black_10%,black_90%,transparent_100%)]">
                          <div className="inline-block animate-marquee-slow text-[10px] font-black text-[#25f4ee] uppercase tracking-wider">
                            Hans Zimmer — {item.title} Soundtrack (Original Score) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Hans Zimmer — {item.title} Soundtrack &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-6 bottom-6 z-35 flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                          item.isLikedByMe 
                            ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050]" 
                            : "bg-black/40 border-white/10 text-white/70 hover:text-white"
                        }`}
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleSave(item.id); }}
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
                          isInWatchlist(item.id)
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-500" 
                            : "bg-black/40 border-white/10 text-white/70 hover:text-white"
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Right Side: Professional Theatre Dashboard Info Panel */}
                  <div className="w-[56%] h-full flex flex-col bg-[#070b13] p-8 overflow-y-auto hide-scrollbar text-left justify-start space-y-6">
                    
                    {/* Verified Creator & Header Row */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none shrink-0">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => setShowCreatorPanel(true)}
                          className="w-10 h-10 rounded-full border-2 border-[#809bfb]/30 p-0.5 bg-black hover:border-[#809bfb] transition-all cursor-pointer relative shrink-0"
                        >
                          <div className="w-full h-full rounded-full bg-[#0a0d16] flex items-center justify-center font-black text-[9px] text-white tracking-widest leading-none">
                            AXIS
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black animate-pulse" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span 
                              onClick={() => setShowCreatorPanel(true)}
                              className="text-white text-sm font-extrabold lowercase hover:underline cursor-pointer flex items-center gap-1 select-text"
                            >
                              @axistrails
                            </span>
                            <MetaVerifiedBadge className="w-3.5 h-3.5" />
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Official Cinema Previews</p>
                        </div>
                      </div>

                      <button
                        onClick={followCreator}
                        className={`px-4.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                          isFollowing 
                            ? "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10" 
                            : "bg-gradient-to-r from-[#4d6bfe] to-[#809bfb] text-slate-950 shadow-[0_4px_12px_rgba(77,107,254,0.15)] hover:opacity-90 active:scale-95"
                        }`}
                      >
                        {isFollowing ? "✓ Following" : "+ Follow"}
                      </button>
                    </div>

                    {/* Movie Info Titles & Specs */}
                    <div className="space-y-3 select-text">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-md text-[9px] font-black uppercase tracking-widest border border-amber-500/20 shadow-sm">
                        <Flame className="w-3 h-3 text-amber-400 fill-current animate-pulse" />
                        <span>AXIS EXCLUSIVE PREVIEW</span>
                      </span>

                      <h2 className="text-3xl font-black uppercase tracking-wider text-white leading-tight font-sans drop-shadow-md">
                        {item.title}
                      </h2>

                      <div className="flex items-center gap-3.5 text-xs text-slate-400 font-mono">
                        <span>{item.releaseYear}</span>
                        <span className="text-slate-700">|</span>
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[10px] font-extrabold text-white">{item.contentRating || "16+"}</span>
                        {item.duration && (
                          <>
                            <span className="text-slate-700">|</span>
                            <span>{formatDurationToHours(item.duration)}</span>
                          </>
                        )}
                      </div>

                      {/* Genres list */}
                      <div className="flex gap-2 flex-wrap select-none">
                        {item.genres.map(genre => (
                          <span 
                            key={`desk-genre-${genre}`}
                            className="px-3 py-1 rounded-full bg-slate-900 border border-white/5 text-[9px] font-extrabold uppercase tracking-widest text-slate-300 hover:border-slate-700 transition-colors"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* High-Contrast Bento Grid Rating stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[#090d16]/85 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors select-none shadow-sm">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[9px] font-black uppercase tracking-widest font-mono">IMDb Score</span>
                          <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{item.rating || "8.5"}</span>
                          <span className="text-xs text-slate-500">/10</span>
                        </div>
                      </div>

                      <div className="bg-[#090d16]/85 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors select-none shadow-sm">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[9px] font-black uppercase tracking-widest font-mono">Hype Loves</span>
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
                        </div>
                        <div className="mt-2.5 flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white">{formatShortNumber(item.likes)}</span>
                        </div>
                      </div>

                      <div className="bg-[#090d16]/85 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors select-none shadow-sm">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="text-[9px] font-black uppercase tracking-widest font-mono">Resolution</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#25f4ee]/10 text-[#25f4ee] text-[8px] font-extrabold tracking-widest border border-[#25f4ee]/20">UHD</span>
                        </div>
                        <div className="mt-2.5 flex flex-col">
                          <span className="text-sm font-black text-white uppercase tracking-wider">Dolby Vision</span>
                          <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">High-Res Stream</span>
                        </div>
                      </div>
                    </div>

                    {/* Synopsis & Taglines */}
                    <div className="space-y-2 select-text">
                      <p className="text-slate-400 italic text-xs leading-relaxed border-l-2 border-slate-700 pl-3">
                        "Axis Premium exclusive previews showcase breathtaking cinematic scales and masterfully crafted visual timelines."
                      </p>
                      <p className="text-white/80 text-xs leading-relaxed font-sans pr-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Interactive Stream & Watchlist Buttons */}
                    <div className="flex flex-wrap items-center gap-3 select-none shrink-0 pt-2">
                      <Link
                        to={`/watch/${slugify(item.title)}`}
                        className="flex-1 min-w-[150px] inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-full bg-gradient-to-r from-[#25f4ee] to-[#00f2fe] text-black font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_6px_20px_rgba(37,244,238,0.3)] hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(37,244,238,0.45)] active:scale-95 text-center"
                      >
                        <span>Stream Full Release</span>
                        <Play className="w-3.5 h-3.5 fill-current text-black stroke-none" />
                      </Link>

                      <button
                        onClick={() => toggleSave(item.id)}
                        className={`px-6 py-3.5 rounded-full inline-flex items-center justify-center gap-2 font-black text-[10px] tracking-widest uppercase transition-all border shrink-0 ${
                          isInWatchlist(item.id)
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-inner"
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95"
                        }`}
                      >
                        <span>{isInWatchlist(item.id) ? "Saved to List" : "Add to Watchlist"}</span>
                        <Bookmark className={`w-3.5 h-3.5 ${isInWatchlist(item.id) ? "fill-current text-amber-400" : ""}`} />
                      </button>

                      <button
                        onClick={() => handleShare(item)}
                        className="w-12 h-12 rounded-full inline-flex items-center justify-center bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all shrink-0"
                        title="Share Trailer"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Playlists Selection Grid */}
                    <div className="bg-[#090d16]/50 border border-white/5 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between select-none">
                        <span className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-400">Save to Curator Folders</span>
                        <button 
                          onClick={() => setShowPlaylistSheet(true)}
                          className="text-[10px] font-extrabold text-[#809bfb] hover:underline hover:text-white transition-all uppercase tracking-wider"
                        >
                          Manage playlists
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 select-none">
                        {localPlaylists.slice(0, 4).map((play) => {
                          return (
                            <div
                              key={`inline-play-desk-${play.id}`}
                              onClick={() => {
                                togglePlaylistCheck(play.id);
                                showToast(
                                  play.checked 
                                    ? `Removed "${item.title}" from ${play.name}` 
                                    : `Saved "${item.title}" to ${play.name}!`,
                                  "success"
                                );
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer border transition-all ${
                                play.checked 
                                  ? "bg-[#809bfb]/10 border-[#809bfb]/30 text-white font-extrabold" 
                                  : "bg-white/[0.01] border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Folder className={`w-3.5 h-3.5 shrink-0 ${play.checked ? "text-[#809bfb]" : "text-slate-500"}`} />
                                <span className="text-[10px] truncate">{play.name}</span>
                              </div>
                              <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                                play.checked ? "bg-[#809bfb] border-[#809bfb] text-black" : "border-slate-600 bg-transparent"
                              }`}>
                                {play.checked && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Live Discussion & Comment section */}
                    {preferences?.kidsMode ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center space-y-3 bg-white/5 rounded-2xl p-4 border border-white/5 select-none animate-fade-in">
                        <span className="text-2xl select-none">🛡️</span>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">Safe Streaming Active</h3>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-[240px] mx-auto">Comments and community chats are turned off in Kids Mode to keep things completely friendly and safe!</p>
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between select-none border-b border-white/5 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest font-mono text-slate-400">Live Discussion Timeline</span>
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/5 text-slate-400">{item.commentsCount}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Moderated Feed</span>
                        </div>

                        {/* Scrollable comments lists */}
                        <div className="space-y-3.5 max-h-[190px] overflow-y-auto pr-1 hide-scrollbar">
                          {((commentsMap[item.id]) || []).map((comm) => {
                            const isCommenterDev = (comm as any).isDev || comm.name.toLowerCase() === "greatmayuku2" || comm.name.toLowerCase() === "greatmayuku2@gmail.com" || comm.name === "×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永" || comm.name.includes("Busy") || (user && user.email === "greatmayuku2@gmail.com" && comm.name === user.username);
                            const commenterName = (isCommenterDev && user && user.email === "greatmayuku2@gmail.com" && user.username) ? user.username : comm.name;
                            return (
                              <div key={`inline-comm-desk-${comm.id}`} className="flex gap-2.5 items-start text-xs text-left">
                                <div className={`w-6.5 h-6.5 rounded-full flex items-center justify-center text-[9px] font-black select-none shrink-0 ${
                                  comm.isOfficial 
                                    ? "bg-brand text-black shadow-[0_0_8px_rgba(244,196,48,0.25)]" 
                                    : isCommenterDev 
                                      ? "bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.3)]" 
                                      : "bg-white/10 text-white"
                                }`}>
                                  {comm.isOfficial ? "AT" : isCommenterDev ? "DEV" : commenterName.substring(0, 2).toUpperCase()}
                                </div>
                                
                                <div className="flex-1 min-w-0 space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-white/95 text-[10px] font-black flex items-center gap-1">
                                      @{commenterName.toLowerCase()}
                                      {(isCommenterDev || comm.isOfficial || commenterName.toLowerCase() === "axis trails") && (
                                        <MetaVerifiedBadge className="w-3 h-3" />
                                      )}
                                    </span>
                                    {comm.isOfficial && (
                                      <span className="bg-brand text-black text-[6px] font-black uppercase px-1 rounded scale-90 origin-left">Creator</span>
                                    )}
                                    <span className="text-slate-500 text-[8px] font-medium">{comm.time}</span>
                                  </div>
                                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans pr-2">
                                    {comm.text}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Comment form */}
                        <form onSubmit={postComment} className="flex gap-2 pt-2 border-t border-white/5 pointer-events-auto">
                          <input
                            type="text"
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder={user ? `Add comment on ${item.title}...` : "Sign in under profile to comment..."}
                            disabled={!user}
                            className="flex-1 bg-white/5 border border-white/5 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:bg-white/10 focus:border-brand/30 transition-all font-sans"
                          />
                          <button
                            type="submit"
                            disabled={!user || !newCommentText.trim()}
                            className="px-4.5 rounded-xl bg-brand disabled:bg-white/5 text-black disabled:text-white/30 font-black text-xs uppercase tracking-widest flex items-center justify-center transition-all shadow-[0_3px_10px_rgba(244,196,48,0.15)] active:scale-95 shrink-0"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </form>
                      </div>
                    )}

                  </div>

                </div>

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
              {((commentsMap[activeItem.id]) || []).map((comm) => {
                const isCommenterDev = (comm as any).isDev || comm.name.toLowerCase() === "greatmayuku2" || comm.name.toLowerCase() === "greatmayuku2@gmail.com" || comm.name === "×͜× 𝙿𝚛𝚘𝚋𝚊𝚋𝚕𝚢 𝙱𝚞𝚜𝚢 永" || comm.name.includes("Busy") || (user && user.email === "greatmayuku2@gmail.com" && comm.name === user.username);
                const commenterName = (isCommenterDev && user && user.email === "greatmayuku2@gmail.com" && user.username) ? user.username : comm.name;
                return (
                  <div key={comm.id} className="flex gap-3 items-start p-1 relative">
                    
                    {/* Initials profile avatar scene */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black select-none shrink-0 ${
                      comm.isOfficial 
                        ? "bg-brand text-black shadow-[0_0_10px_rgba(244,196,48,0.3)]" 
                        : isCommenterDev 
                          ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
                          : "bg-white/10 text-white"
                    }`}>
                      {comm.isOfficial ? "AT" : isCommenterDev ? "DEV" : commenterName.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Comment context body block */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-white/90 text-xs font-extrabold flex items-center gap-1 select-text">
                          @{commenterName.toLowerCase()}
                          {(isCommenterDev || comm.isOfficial || commenterName.toLowerCase() === "axis trails") && (
                            <MetaVerifiedBadge className="w-3.5 h-3.5" />
                          )}
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
                );
              })}
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
          9. CREATOR ACCOUNT PROFILE SLIDEOUT PANEL
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
                  <button 
                    onClick={() => setShowFollowingModal(true)}
                    className="text-center hover:opacity-80 active:scale-95 transition-all focus:outline-none"
                    title="View Following List"
                  >
                    <p className="text-[#809bfb] text-md font-black underline decoration-dashed">1</p>
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mt-0.5">Following</p>
                  </button>
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
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <a 
                      href="https://whatsapp.com/channel/0029VaF7r7n1iUxcwZZs8F03" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center justify-center gap-3 p-3.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/20 hover:bg-[#25D366]/20 text-[#25D366] transition-all"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.299-.018-.461.13-.611.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                      </svg>
                      <span className="font-extrabold text-sm tracking-wide">Axis TV WhatsApp Channel</span>
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

      {/* ==========================================
          10. AXIS TRAILS FOLLOWING ACCOUNT DRAWER / POPUP
         ========================================== */}
      <AnimatePresence>
        {showFollowingModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 z-0" onClick={() => setShowFollowingModal(false)} />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a0d16] border border-white/10 p-6 rounded-3xl z-10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-left"
            >
              <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4.5 h-4.5 text-[#809bfb]" />
                  <h3 className="text-white text-sm font-black uppercase tracking-wider">
                    Axis Trails Following
                  </h3>
                </div>
                <button 
                  onClick={() => setShowFollowingModal(false)}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">
                Exclusive Following (1 User)
              </p>

              {/* Developer Profile card */}
              <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-[#809bfb]/35 rounded-2xl hover:border-blue-500/20 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-500/10">
                    DEV
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-white text-xs font-black">
                        {user && user.email === "greatmayuku2@gmail.com" ? user.username : "greatmayuku2"}
                      </p>
                      <MetaVerifiedBadge className="w-4 h-4" />
                    </div>
                    <p className="text-white/40 text-[9px] font-semibold mt-0.5">greatmayuku2@gmail.com</p>
                    <p className="text-[#809bfb] text-[8px] font-black tracking-wider uppercase mt-1">Lead Creator & Platform Dev</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[9px] font-black tracking-wider text-green-400 bg-green-400/10 px-2 py-1 rounded-full uppercase border border-green-400/20">
                  <span>✓ Creator Mutual</span>
                </div>
              </div>

              <p className="text-white/40 text-[10px] leading-relaxed mt-4 text-center px-1">
                Axis Trails is a developer-moderated system. Axis Trails exclusively follows and monitors our verified lead platform developer <span className="text-white font-bold">{user && user.email === "greatmayuku2@gmail.com" ? user.username : "greatmayuku2"}</span>.
              </p>

              <button
                onClick={() => setShowFollowingModal(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all mt-5"
              >
                Close List
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
