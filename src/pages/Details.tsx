import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { movieService } from "../services/movieService";
import {
  ItemDetails,
  MediaData,
  MediaItem,
  formatDurationToHours,
  slugify,
} from "../types";
import VideoPlayer from "../components/VideoPlayer";
import { motion } from "motion/react";
import PosterGrid from "../components/PosterGrid";
import EpisodeSelector from "../components/EpisodeSelector";
import { Skeleton, DetailsSkeleton } from "../components/Skeleton";
import { NoticeMessage } from "../components/NoticeMessage";
import { SEO } from "../components/SEO";
import {
  ArrowLeft,
  Star,
  Download,
  Film,
  Bookmark,
  Check,
  Share2,
  ListVideo,
  Play,
  X,
  UserPlus,
  Users,
  Copy,
  CheckCircle2,
  CornerUpLeft,
  Plus,
  Info,
  MoreHorizontal,
  Volume2,
  VolumeX,
} from "lucide-react";
import Tray from "../components/Tray";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { MovieImage } from "../components/MovieImage";
import { SmartActorImage } from "../components/SmartActorImage";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { createWatchParty } from "../services/watchPartyService";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } },
};

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openPreview } = useMediaPreview();
  const playerRef = useRef<HTMLDivElement>(null);
  const {
    user,
    addToHistory,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    continueWatching,
    trackWatchActivity,
    preferences,
  } = useAuth();
  const { showToast } = useToast();

  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [richDetails, setRichDetails] = useState<any | null>(null);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isDownloadTrayOpen, setIsDownloadTrayOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);

  // New trailer auto-playback states matching MediaPreviewTray
  const [isMuted, setIsMuted] = useState(false);
  const [trailerEnded, setTrailerEnded] = useState(false);
  const [videoBuffering, setVideoBuffering] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [showAllCast, setShowAllCast] = useState(false);
  const [showAllRecs, setShowAllRecs] = useState(false);

  const location = useLocation();
  const isWatchPage = location.pathname.startsWith("/watch");
  const [isPlaying, setIsPlaying] = useState(false);

  const trailerUrl =
    details?.trailerUrl ||
    (typeof details?.trailer === "object"
      ? details.trailer?.videoAddress?.url || (details.trailer as any)?.url
      : details?.trailer) ||
    (details as any)?.trailer_url;

  const isTrailerEmbed =
    trailerUrl?.includes("youtube.com") ||
    trailerUrl?.includes("youtu.be") ||
    trailerUrl?.includes("vimeo.com") ||
    trailerUrl?.includes("/embed/");

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const showTrailers = preferences?.showTrailers ?? true;
  const isTrailerSuppressed = !showTrailers || (isMobile && !user);

  const getYouTubeId = (url: string): string => {
    if (!url) return "";
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : "";
  };

  const getEmbedUrl = (url: string): string => {
    if (!url) return "";
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const ytId = getYouTubeId(url);
      return `https://www.youtube.com/embed/${ytId}?autoplay=${isTrailerSuppressed ? 0 : 1}&mute=1&enablejsapi=1`;
    }
    return url;
  };

  const handleCanPlay = () => {
    setVideoBuffering(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        console.log("Autoplay was prevented");
      });
    }
  };

  useEffect(() => {
    setTrailerEnded(false);
    setVideoBuffering(true);
  }, [id]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const isMobileDevice = typeof window !== "undefined" && window.innerWidth < 768;

    if (isMobileDevice) return;

    const renderFrame = () => {
      if (
        videoRef.current &&
        canvasRef.current &&
        !videoRef.current.paused &&
        !videoRef.current.ended
      ) {
        const ctx = canvasRef.current.getContext("2d", { alpha: false });
        if (ctx) {
          canvasRef.current.width = 120;
          canvasRef.current.height = 68;
          ctx.drawImage(
            videoRef.current,
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height,
          );
        }
      }
      timeoutId = setTimeout(renderFrame, 100);
    };
    if (trailerUrl && !isTrailerSuppressed && !isWatchPage) {
      renderFrame();
    }
    return () => clearTimeout(timeoutId);
  }, [trailerUrl, isTrailerSuppressed, isWatchPage]);

  const uniqueCast = useMemo(() => {
    if (!details || !Array.isArray(details.cast)) return [];
    const acc: any[] = [];
    details.cast.forEach((actor: any) => {
      const existing = acc.find(
        (a) =>
          (a.id && actor.id && String(a.id) === String(actor.id)) ||
          (a.name &&
            actor.name &&
            a.name.toLowerCase() === actor.name.toLowerCase()),
      );
      if (existing) {
        if (actor.character && existing.character) {
          const currentChars = existing.character
            .split("/")
            .map((c: string) => c.trim());
          const newChar = actor.character.trim();
          if (newChar && !currentChars.includes(newChar)) {
            existing.character = `${existing.character} / ${newChar}`;
          }
        } else if (actor.character) {
          existing.character = actor.character;
        }
      } else {
        acc.push({ ...actor });
      }
    });
    return acc;
  }, [details?.cast]);

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [userClosedMiniPlayer, setUserClosedMiniPlayer] = useState(false);
  const [sourceSizes, setSourceSizes] = useState<Record<string, string>>({});

  const fetchSourceSize = async (url: string) => {
    if (sourceSizes[url]) return;
    try {
      const response = await fetch(url, { method: "HEAD" });
      const size = response.headers.get("content-length");
      if (size) {
        const bytes = parseInt(size, 10);
        const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
        const mb = (bytes / (1024 * 1024)).toFixed(0);
        const formattedSize =
          bytes > 1024 * 1024 * 1024 ? `${gb} GB` : `${mb} MB`;
        setSourceSizes((prev) => ({ ...prev, [url]: formattedSize }));
      }
    } catch (e) {
      console.warn("Could not fetch size for source", url);
    }
  };

  useEffect(() => {
    if (mediaData?.sources && isDownloadTrayOpen) {
      mediaData.sources.forEach((source) => {
        const url = source.downloadUrl || source.url;
        fetchSourceSize(url);
      });
    }
  }, [mediaData, isDownloadTrayOpen]);

  useEffect(() => {
    if (details) {
      document.title = `${details.title} - Axis TV`;
      trackWatchActivity({
        id: details.id,
        title: details.title,
        poster: details.poster,
        type: details.type,
        year: details.year,
        rating: details.rating,
        genres: details.genres,
      });
    }
    return () => {
      document.title = "Axis TV";
    };
  }, [details]);

  useEffect(() => {
    if (!playerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsMiniPlayer(false);
          setUserClosedMiniPlayer(false);
        } else {
          setIsMiniPlayer(true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(playerRef.current);
    return () => observer.disconnect();
  }, [mediaData]);

  const handleBack = () => {
    if (isWatchPage) {
      navigate(`/details/${id}`);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  useEffect(() => {
    if (!id) return;

    // Save to recently viewed
    try {
      localStorage.setItem("axis_last_viewed_id", id);
    } catch (e) {}

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Scroll to top on new item
        window.scrollTo(0, 0);

        let resolvedId = id;
        if (id && (isNaN(Number(id)) || id.includes("-"))) {
          try {
            const searchTitle = id.replace(/-/g, " ");
            const searchResults = await movieService.search(searchTitle);
            if (searchResults && searchResults.length > 0) {
              const bestMatch =
                searchResults.find(
                  (m) => slugify(m.title) === id.toLowerCase(),
                ) || searchResults[0];
              resolvedId = bestMatch.id;
            }
          } catch (e) {
            console.warn("Slug lookup failed, trying direct ID fetch", e);
          }
        }

        // Save to recently viewed
        try {
          localStorage.setItem("axis_last_viewed_id", resolvedId);
        } catch (e) {}

        const itemDetails = await movieService.getDetails(resolvedId);
        setDetails(itemDetails);

        // Add to history if user is logged in
        if (user) {
          addToHistory({
            id: itemDetails.id,
            title: itemDetails.title,
            poster: itemDetails.poster,
            type: itemDetails.type,
            year: itemDetails.year,
            rating: itemDetails.rating,
          });
        }

        // Fetch recommendations and rich details in parallel
        const [itemRecsRaw, itemRichDetails] = await Promise.all([
          movieService.getRecommendations(resolvedId).catch(() => []),
          movieService.getRichDetails(resolvedId).catch(() => null),
        ]);

        let itemRecs = itemRecsRaw || [];

        // If the recommendation API returns empty, let's build a highly specific fallback!
        if (!itemRecs || itemRecs.length === 0) {
          try {
            // Fallback 1: Try browsing the primary genre of the current movie
            const primaryGenre = itemDetails.genres && itemDetails.genres.length > 0
              ? itemDetails.genres[0]
              : null;
              
            if (primaryGenre) {
              const genreItems = await movieService.browse(primaryGenre, undefined, 1, 15, itemDetails.type === "Series" ? 2 : 0);
              if (genreItems && genreItems.length > 0) {
                // Filter out the current item itself
                itemRecs = genreItems.filter((item) => String(item.id) !== String(resolvedId));
              }
            }
          } catch (e) {
            console.warn("Recommendation fallback by genre failed", e);
          }
        }
        
        // Fallback 2: If still empty, use general hot/trending items
        if (!itemRecs || itemRecs.length === 0) {
          try {
            const hotData = await movieService.getHot();
            const combined = [...(hotData?.movies || []), ...(hotData?.series || [])];
            if (combined.length > 0) {
              itemRecs = combined.filter((item) => String(item.id) !== String(resolvedId)).sort(() => 0.5 - Math.random());
            }
          } catch (e) {
            console.warn("Recommendation fallback by hot failed", e);
          }
        }

        setRecommendations(itemRecs);
        setRichDetails(itemRichDetails);

        const isSeries = itemDetails.type === "Series";
        let s = isSeries
          ? itemDetails.seasons && itemDetails.seasons.length > 0
            ? itemDetails.seasons[0].se
            : 1
          : 0;
        let e = isSeries ? 1 : 0;
        let initialTime = 0;

        // Check for saved progress
        const savedProgress = continueWatching.find((i) => i.id === resolvedId);
        if (savedProgress) {
          if (isSeries) {
            s = savedProgress.season || 1;
            e = savedProgress.episode || 1;
          }
          initialTime = savedProgress.progress;
        }

        setSelectedSeason(s);
        setSelectedEpisode(e);

        if (user) {
          const itemMedia = await movieService.getPlay(
            resolvedId,
            s,
            e,
            itemDetails.detailPath,
            itemDetails.title,
            itemDetails.year,
            itemDetails.type ? String(itemDetails.type) : undefined,
          ).catch((e) => {
            console.warn("Could not prefetch play sources", e);
            return null;
          });
          if (itemMedia) setMediaData({ ...itemMedia, initialTime });
        }
      } catch (err) {
        console.error("Error loading details:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load details. Please try again later.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user?.id]); // FIX: Prevent full reload on heartbeat user change

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = async (platform?: string) => {
    if (!details) return;

    const url = `${window.location.origin}/details/${slugify(details.title)}`;
    const title = details.title;
    const text = `Watching ${title} on Axis TV! Check it out:`;

    if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
        "_blank",
      );
      return;
    }

    if (platform === "facebook") {
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        "_blank",
      );
      return;
    }

    if (platform === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
        "_blank",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard!", "success");
      setIsShareModalOpen(true);
    } catch (err: any) {
      console.error("Clipboard copy failed:", err);
      // Fallback to navigator.share if clipboard fails
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        }).catch(() => {});
      }
    }
  };

  const handleWatchParty = async () => {
    if (!user) {
      showToast("You must be signed in to host a Watch Party", "info");
      navigate("/profile");
      return;
    }
    if (!details || !id) return;

    try {
      const partyId = await createWatchParty(
        details.id,
        details.type === "Series" ? "series" : "movie",
        details.title,
        details.poster || details.background || "",
      );
      navigate(`/watch-party/${partyId}`);
    } catch (error) {
      console.error("Failed to create watch party:", error);
      showToast("Failed to create Watch Party. Please try again.", "error");
    }
  };

  const downloadPoster = async () => {
    if (!details?.poster) return;
    try {
      const response = await fetch(details.poster);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${details.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_poster.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Poster download failed", err);
      // Fallback to direct link
      const a = document.createElement("a");
      a.href = details.poster;
      a.target = "_blank";
      a.download = `${details.title}_poster.jpg`;
      a.click();
    }
    setIsShareModalOpen(false);
  };

  const handleEpisodeChange = async (s: number, e: number) => {
    if (!id) return;
    try {
      setSelectedSeason(s);
      setSelectedEpisode(e);
      setMediaData(null); // Clear while loading
      const itemMedia = await movieService.getPlay(
        details.id,
        s,
        e,
        details?.detailPath,
        details?.title,
        details?.year,
        details?.type ? String(details?.type) : undefined,
      );
      setMediaData(itemMedia);
    } catch (err) {
      console.error("Error loading episode:", err);
    }
  };

  const handleDownload = (url: string) => {
    if (!details) return;

    const dlTitle =
      details.type === "Series"
        ? `${details.title} S${selectedSeason} E${selectedEpisode}`
        : details.title;
    const cleanTitle = dlTitle.replace(/[^a-zA-Z0-9 -]/g, "");
    const finalUrl = url.includes("download=1")
      ? url
      : url.includes("?")
        ? `${url}&download=1`
        : `${url}?download=1`;

    // Trigger browser native download without exposing URL in address bar or new tab
    // We use a hidden iframe to ensure the current page state remains intact and keeps the API private
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = finalUrl;
    document.body.appendChild(iframe);

    showToast(`Starting download: ${cleanTitle}`, "success");

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);

    setIsDownloadTrayOpen(false);
  };

  const toggleWatchlist = () => {
    if (!details || !user) {
      showToast("Please sign in to use the watchlist.", "error");
      navigate("/profile");
      return;
    }

    if (isInWatchlist(details.id)) {
      removeFromWatchlist(details.id);
      showToast("Removed from My List", "info");
    } else {
      addToWatchlist({
        id: details.id,
        title: details.title,
        poster: details.poster,
        type: details.type,
        year: details.year,
        rating: details.rating,
      });
      showToast("Added to My List", "success");
    }
  };

  if (loading) {
    return <DetailsSkeleton />;
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
        <div className="text-center max-w-md px-4">
          <NoticeMessage
            message={error || "Item not found."}
            onRetry={() => window.location.reload()}
          />
          <button
            onClick={handleBack}
            className="mt-6 px-6 py-3 glass-button rounded-full transition-colors flex items-center gap-2 mx-auto font-semibold tracking-wide text-fluid-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }



  return (
    <div
      className="min-h-screen bg-transparent text-white pb-20 relative overflow-hidden"
      style={
        {
          "--theme-color": details.avgHueDark || "rgba(255,255,255,0.1)",
        } as React.CSSProperties
      }
    >
      {/* Immersive Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen">
        <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-[var(--theme-color)] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30 transition-all duration-1000" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-[var(--theme-color)] rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 opacity-20 transition-all duration-1000" />
      </div>

      <div className="relative z-10">
        <SEO
          title={details.title}
          description={details.description.slice(0, 160)}
          keywords={`${details.title}, watch ${details.title} online, ${details.genres?.join(", ")}, Axis TV`}
          image={details.poster}
          type={details.type === "Series" ? "video.tv_show" : "video.movie"}
          schema={{
            "@context": "https://schema.org",
            "@type": details.type === "Series" ? "TVSeries" : "Movie",
            name: details.title,
            description: details.description,
            image: details.poster,
            datePublished: details.year,
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: details.imdbRatingValue || details.rating || "8.5",
              bestRating: "10",
              ratingCount: "1000",
            },
          }}
        />
        {/* Video Player Section */}
        <div
          className="w-full relative z-40 shadow-2xl overflow-hidden aspect-video max-w-[1200px] mx-auto md:rounded-2xl md:mt-4 bg-black"
          ref={playerRef}
        >
          {!isWatchPage ? (
            /* Trailer/Hero Section */
            <div className="relative w-full h-full overflow-hidden group">
              {/* Floating Glass Buttons */}
              <div className="absolute top-safe pt-4 px-4 w-full flex justify-between items-center z-50">
                <button
                  onClick={handleBack}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/40 transition-all cursor-pointer"
                  title="Go Back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={toggleWatchlist}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/40 transition-all cursor-pointer"
                    title="Watchlist"
                  >
                    {isInWatchlist(details.id) ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleShare()}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/40 transition-all cursor-pointer"
                    title="Share"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/80 backdrop-blur-xl">
                  <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                </div>
              ) : trailerUrl ? (
                <>
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-x-0 bottom-0 top-1/2 w-full h-[150%] object-cover blur-[80px] opacity-50 scale-125 z-0 saturate-200 pointer-events-none origin-bottom mix-blend-screen"
                    aria-hidden="true"
                  />
                  {videoBuffering &&
                    !isTrailerEmbed &&
                    !isTrailerSuppressed &&
                    !trailerEnded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#080808]/75 z-20 pointer-events-none transition-all duration-300">
                        <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  {isTrailerEmbed ? (
                    <iframe
                      src={getEmbedUrl(trailerUrl)}
                      className="w-full h-full border-none relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-transparent object-contain"
                      allow="autoplay; fullscreen"
                      title={`${details.title} Trailer`}
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={
                        trailerUrl?.includes("youtube.com") ||
                        trailerUrl?.includes("youtu.be")
                          ? undefined
                          : trailerUrl
                      }
                      autoPlay={Boolean(trailerUrl) && !isTrailerSuppressed}
                      muted={isMuted}
                      loop={false}
                      playsInline
                      preload="metadata"
                      onCanPlay={handleCanPlay}
                      onWaiting={() => setVideoBuffering(true)}
                      onPlaying={() => setVideoBuffering(false)}
                      className="w-full h-full object-contain relative z-10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-transparent"
                      onEnded={() => setTrailerEnded(true)}
                      onError={(e) => {
                        console.error("Trailer playback error");
                        setTrailerEnded(true);
                      }}
                    />
                  )}
                  {isTrailerSuppressed &&
                    !trailerEnded &&
                    !isTrailerEmbed &&
                    user && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#080808]/40 backdrop-blur-3xl pointer-events-none">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (videoRef.current) {
                              videoRef.current.muted = false;
                              setIsMuted(false);
                              videoRef.current.play().catch(() => {});
                            }
                          }}
                          className="w-16 h-16 rounded-full bg-brand flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all pointer-events-auto cursor-pointer"
                        >
                          <Play className="w-8 h-8 fill-current ml-1" />
                        </button>
                      </div>
                    )}
                  {!isTrailerEmbed && !trailerEnded && (
                    <button
                      onClick={() => setIsMuted((prev) => !prev)}
                      className="absolute bottom-12 right-4 z-40 w-10 h-10 rounded-full bg-[#080808]/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all hover:scale-110 cursor-pointer"
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  {!isTrailerEmbed && trailerEnded && (
                    <div className="absolute inset-0 bg-[#080808]/60 backdrop-blur-3xl flex flex-col items-center justify-center gap-4 z-30">
                      <button
                        onClick={() => {
                          setTrailerEnded(false);
                          if (videoRef.current) {
                            videoRef.current.play().catch(() => {});
                          }
                        }}
                        className="flex items-center gap-2 text-white font-semibold tracking-wide text-lg hover:text-brand transition-colors cursor-pointer"
                      >
                        <Play className="w-5 h-5" /> Replay
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="relative w-full h-full">
                  <MovieImage
                    src={details?.background || details?.poster || ""}
                    alt={details?.title || ""}
                    avgHueDark={details?.avgHueDark}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Dark Gradient Overlay seamlessly blending to #080808 */}
              <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent pointer-events-none z-20" />
            </div>
          ) : (
            /* Real Watch Page Player view */
            <>
              {!isPlaying ? (
                /* Beautiful Hero Cover Banner (Watch Preview Screen) */
                <div className="relative w-full h-full overflow-hidden group">
                  {/* Floating Back Button */}
                  <div className="absolute top-safe pt-4 px-4 w-full flex justify-between items-center z-50">
                    <button
                      onClick={handleBack}
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/60 transition-all cursor-pointer shadow-lg"
                      title="Go Back"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Centered Play Button Overlay */}
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40">
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white flex items-center justify-center text-black shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-110 active:scale-95 transition-all cursor-pointer mb-4"
                    >
                      <Play className="w-8 h-8 md:w-10 md:h-10 fill-black text-black ml-1" />
                    </button>
                    <h2 className="text-white font-extrabold text-sm md:text-base tracking-[0.15em] uppercase text-center drop-shadow-md px-4">
                      {details.title}
                    </h2>
                    {details.type === "Series" ? (
                      <p className="text-white/60 font-medium text-xs md:text-sm mt-1 text-center">
                        {details.year} • S{selectedSeason} E{selectedEpisode}
                      </p>
                    ) : (
                      <p className="text-white/60 font-medium text-xs md:text-sm mt-1 text-center">
                        {details.year} {details.duration && `• ${formatDurationToHours(details.duration)}`}
                      </p>
                    )}
                  </div>

                  {/* Hero Background Poster Image */}
                  <div className="relative w-full h-full">
                    <MovieImage
                      src={details?.background || details?.poster || ""}
                      alt={details?.title || ""}
                      avgHueDark={details?.avgHueDark}
                      className="w-full h-full object-cover brightness-[0.6]"
                    />
                  </div>

                  {/* Dark Gradient Overlay seamlessly blending to #080808 */}
                  <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#080808] via-[#080808]/60 to-transparent pointer-events-none z-20" />
                </div>
              ) : (
                /* Actual Playing State */
                <>
                  {!user ? (
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/40 backdrop-blur-3xl px-6 text-center border-b border-white/5 backdrop-blur-[20px]">
                      <button
                        onClick={() => setIsPlaying(false)}
                        className="absolute top-4 left-4 p-3 glass-button rounded-full transition-all flex items-center gap-2 text-white/50 hover:text-white z-50"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                        <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-current ml-1" />
                      </div>
                      <h2 className="text-fluid-2xl font-bold tracking-tight text-white mb-3">
                        Stream {details.title}
                      </h2>
                      <p className="text-white/60 text-fluid-sm font-medium max-w-[400px] mb-8 leading-relaxed">
                        Access high-quality streams, trailers and save your progress
                        by signing in.
                      </p>
                      <button
                        onClick={() => navigate("/profile")}
                        className="px-8 py-3.5 bg-white text-black rounded-full font-semibold hover:bg-white/90 transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] text-fluid-lg"
                      >
                        Sign In to Watch
                      </button>
                    </div>
                  ) : mediaData ? (
                    <VideoPlayer
                      mediaData={mediaData}
                      poster={details.background || details.poster}
                      title={details.title}
                      description={details.description}
                      id={id || ""}
                      seasons={details.seasons}
                      selectedSeason={selectedSeason}
                      selectedEpisode={selectedEpisode}
                      onEpisodeChange={handleEpisodeChange}
                      onAudioTrackChange={async (subjectId) => {
                        try {
                          setMediaData(null);
                          const itemMedia = await movieService.getPlay(
                            subjectId,
                            selectedSeason,
                            selectedEpisode,
                            details?.detailPath,
                            details?.title,
                            details?.year,
                            details?.type ? String(details?.type) : undefined,
                          );
                          setMediaData(itemMedia);
                        } catch (err) {
                          console.error("Error switching audio track:", err);
                        }
                      }}
                      onClose={() => {
                        if (isWatchPage) {
                          navigate(`/details/${id}`);
                        } else {
                          setIsPlaying(false);
                        }
                      }}
                      isMiniPlayer={isMiniPlayer && !userClosedMiniPlayer}
                      onCloseMiniPlayer={() => setUserClosedMiniPlayer(true)}
                      initialTime={(mediaData as any).initialTime}
                    />
                  ) : (
                    <div className="w-full h-full relative overflow-hidden bg-[#0a0a0a]">
                      <button
                        onClick={() => {
                          if (isWatchPage) {
                            navigate(`/details/${id}`);
                          } else {
                            setIsPlaying(false);
                          }
                        }}
                        className="absolute top-4 left-4 p-3 glass-button rounded-full transition-all flex items-center gap-2 text-white/50 hover:text-white z-50"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <Skeleton className="absolute inset-0 w-full h-full" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 pointer-events-none">
                        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs font-semibold text-white/50 tracking-wider uppercase animate-pulse">Loading Video Player...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Content Info Section */}
        <div className="max-w-[1000px] mx-auto px-5 py-4 space-y-8 relative z-50">
          {isWatchPage ? (
            /* Layout for watch page: */
            <div className="space-y-8">
              {/* Watch Info Header */}
              <div className="space-y-6">
                {/* Back Button */}
                <div>
                  <button
                    onClick={handleBack}
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </button>
                </div>

                {/* Title Section */}
                <div className="flex items-center justify-between gap-4">
                  <h1 className="text-2xl md:text-5xl font-extrabold text-white tracking-tight leading-tight uppercase">
                    {details.title}
                  </h1>
                </div>

                {/* Rating and Metadata Section */}
                <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-semibold text-white/60">
                  {/* Rating Badge */}
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1 md:px-3 md:py-1.5 rounded-xl backdrop-blur-sm shadow-sm">
                    <Star className="w-3.5 h-3.5 text-white fill-white" />
                    <span className="text-white font-black text-[10px] md:text-xs">{details.imdbRatingValue || details.rating || "7.1"}</span>
                  </div>
                  
                  <span className="text-white/60 font-bold">{details.year}</span>
                  <span className="text-white/30">•</span>
                  <span className="text-white/60 font-bold">{details.type}</span>
                </div>

                {/* Action Chips */}
                <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5 md:mx-0 md:px-0">
                  {/* Download Pill */}
                  <button
                    onClick={() => setIsDownloadTrayOpen(true)}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-full font-bold text-xs md:text-sm tracking-wide transition-all active:scale-95 backdrop-blur-md shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    Download
                  </button>

                  {/* Watch Party Pill */}
                  <button
                    onClick={handleWatchParty}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-full font-bold text-xs md:text-sm tracking-wide transition-all active:scale-95 backdrop-blur-md shrink-0 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-white" />
                    Watch Party
                  </button>

                  {/* Playlist Pill */}
                  <button
                    onClick={toggleWatchlist}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-full font-bold text-xs md:text-sm tracking-wide transition-all active:scale-95 backdrop-blur-md shrink-0 cursor-pointer flex inline-flex items-center"
                  >
                    {isInWatchlist(details.id) ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white mr-1" />
                        In Playlist
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 text-white mr-1" />
                        Playlist
                      </>
                    )}
                  </button>

                  {/* Share Pill */}
                  <button
                    onClick={() => handleShare()}
                    className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-full font-bold text-xs md:text-sm tracking-wide transition-all active:scale-95 backdrop-blur-md shrink-0 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-white" />
                    Share
                  </button>
                </div>
              </div>

              {/* Carry the season and episode selector up underneath the details, download buttons */}
              {details.type === "Series" && (
                <div className="pt-4 border-t border-white/5">
                  <EpisodeSelector
                    seasons={details.seasons}
                    selectedSeason={selectedSeason}
                    selectedEpisode={selectedEpisode}
                    onEpisodeChange={handleEpisodeChange}
                    onPlay={() => setIsPlaying(true)}
                    poster={details.poster}
                    itemId={details.id}
                    progressList={continueWatching}
                    episodeDetails={richDetails}
                  />
                </div>
              )}

              {/* Then the cast */}
              {Array.isArray(uniqueCast) && uniqueCast.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">Cast</h3>
                    {uniqueCast.length > 10 && (
                      <button onClick={() => setShowAllCast(!showAllCast)} className="text-white/50 text-sm font-medium flex items-center hover:text-white transition-colors">
                        {showAllCast ? 'Show Less' : 'View All'} <svg className={`w-4 h-4 ml-1 transition-transform ${showAllCast ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    )}
                  </div>
                  <div className={`flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x ${showAllCast ? 'flex-wrap' : ''}`}>
                    {(showAllCast ? uniqueCast : uniqueCast.slice(0, 10)).map((actor: any, index: number) => (
                      <div
                        key={`${actor.id}-${index}`}
                        className="flex flex-col items-center gap-2 min-w-[80px] snap-start cursor-pointer group"
                        onClick={() => navigate(`/actor/${actor.id}`)}
                      >
                        <SmartActorImage
                          staffId={actor.id}
                          initialAvatar={actor.avatar}
                          alt={actor.name}
                          className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border border-white/10 bg-[#121212] group-hover:border-white/30 transition-all shadow-md"
                        />
                        <div className="text-center w-full">
                          <p className="text-white text-xs font-semibold group-hover:text-white transition-colors line-clamp-1">
                            {actor.name}
                          </p>
                          <p className="text-white/40 text-[10px] mt-0.5 tracking-tight line-clamp-1">
                            as {actor.character ? actor.character : "Supporting"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Then the movie details like release year and all that */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-3.5 flex items-center gap-2.5 md:gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-white/40 font-medium">Released</p>
                    <p className="text-xs md:text-sm text-white font-semibold">{details.year || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-3.5 flex items-center gap-2.5 md:gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-white/40 font-medium">Country</p>
                    <p className="text-xs md:text-sm text-white font-semibold">{details.country || 'US'}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-3.5 flex items-center gap-2.5 md:gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-white/40 font-medium">Genre</p>
                    <p className="text-xs md:text-sm text-white font-semibold line-clamp-1">{Array.isArray(details.genres) ? details.genres.slice(0,2).join(", ") : details.genres}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3 md:p-3.5 flex items-center gap-2.5 md:gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50 shrink-0">
                    <Star className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                  </div>
                  <div>
                    <p className="text-[9px] md:text-[10px] text-white/40 font-medium">IMDb Rating</p>
                    <p className="text-xs md:text-sm text-white font-semibold">{details.imdbRatingValue || '5.9'} <span className="text-white/40 text-[9px] md:text-[10px] font-normal">/10</span></p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Layout for details page: */
            <div className="space-y-8">
              {/* Premium Staggered Animations for Details view */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-5 -mt-16 md:-mt-[15vh]">
                  {/* Poster Overlapping */}
                  <div className="w-[120px] md:w-[180px] shrink-0 mx-auto md:mx-0 relative z-20">
                    <div className="aspect-[2/3] rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] border border-white/5 bg-[#121212] glow-effect">
                      <MovieImage
                        src={details.poster}
                        alt={details.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Title & Meta */}
                  <div className="flex-1 flex flex-col justify-end pt-4 md:pt-20 text-center md:text-left z-20">
                    <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight drop-shadow-lg mb-2">
                      {details.title}
                    </h1>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-fluid-sm font-medium text-white/60 mb-3">
                      {details.year && <span>{details.year}</span>}
                      <span className="w-1 h-1 rounded-full bg-white/30" />
                      {details.duration && <span>{formatDurationToHours(details.duration)}</span>}
                      {details.genres && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/30" />
                          <span>
                            {(Array.isArray(details.genres) ? details.genres : String(details.genres).split(",")).slice(0, 3).join(", ")}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                      {(details.imdbRatingValue || details.rating) && (
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-md backdrop-blur-sm shadow-sm">
                          <Star className="w-3.5 h-3.5 text-[#f5c518] fill-[#f5c518]" />
                          <span className="text-white font-bold text-xs">{details.imdbRatingValue || details.rating}</span>
                        </div>
                      )}
                      {details.imdbRatingValue && (
                        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-md backdrop-blur-sm shadow-sm">
                          <span className="text-[#f5c518] font-bold text-[10px] uppercase">IMDb</span>
                          <span className="text-white/80 font-medium text-xs">{details.imdbRatingVotes || '106K votes'}</span>
                        </div>
                      )}
                      {details.rating && (
                        <div className="flex items-center bg-white/5 border border-red-500/30 px-2 py-1 rounded-md backdrop-blur-sm shadow-sm">
                          <span className="text-red-500 font-bold text-[10px]">{details.rating}</span>
                        </div>
                      )}
                    </div>

                    <p className={`text-white/70 text-fluid-sm leading-relaxed max-w-2xl ${showDetails ? "" : "line-clamp-3"}`}>
                      {details.description}
                      {!showDetails && (
                        <button onClick={() => setShowDetails(true)} className="text-white font-medium ml-1 cursor-pointer">more</button>
                      )}
                      {showDetails && (
                        <button onClick={() => setShowDetails(false)} className="text-white font-medium ml-1 cursor-pointer">less</button>
                      )}
                    </p>
                  </div>
                </motion.div>

                {/* Primary Action Buttons */}
                <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!user) {
                        showToast("Please sign in to watch.", "info");
                        navigate("/profile");
                        return;
                      }
                      navigate(`/watch/${slugify(details.title)}`);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#ff0f39] hover:bg-[#ff0f39]/90 text-white py-3.5 rounded-xl font-semibold shadow-[0_0_20px_rgba(255,15,57,0.3)] active:scale-95 transition-all text-fluid-base animate-pulse-subtle animate-none hover:animate-none"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Watch Now
                  </button>
                  <button
                    onClick={() => setIsDownloadTrayOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3.5 rounded-xl font-semibold backdrop-blur-md active:scale-95 transition-all text-fluid-base shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button
                    onClick={handleWatchParty}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3.5 rounded-xl font-semibold backdrop-blur-md active:scale-95 transition-all text-fluid-base shadow-sm"
                  >
                    <Users className="w-5 h-5" />
                    Watch Party
                  </button>
                </motion.div>

                {/* Action Chips */}
                <motion.div variants={itemVariants} className="flex items-center justify-center gap-3">
                  <button
                    onClick={toggleWatchlist}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
                  >
                    {isInWatchlist(details.id) ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">My List</span>
                  </button>
                  <button 
                    onClick={() => setIsLiked(!isLiked)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "#ff0f39" : "none"} stroke={isLiked ? "#ff0f39" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                    <span className="text-sm font-medium">Like</span>
                  </button>
                  <button
                    onClick={() => handleShare()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share</span>
                  </button>
                </motion.div>
              </motion.div>

              {/* Cast Section */}
              {Array.isArray(uniqueCast) && uniqueCast.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg">Cast</h3>
                    {uniqueCast.length > 10 && (
                      <button onClick={() => setShowAllCast(!showAllCast)} className="text-white/50 text-sm font-medium flex items-center hover:text-white transition-colors">
                        {showAllCast ? 'Show Less' : 'View All'} <svg className={`w-4 h-4 ml-1 transition-transform ${showAllCast ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                      </button>
                    )}
                  </div>
                  <div className={`flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 snap-x ${showAllCast ? 'flex-wrap' : ''}`}>
                    {(showAllCast ? uniqueCast : uniqueCast.slice(0, 10)).map((actor: any, index: number) => (
                      <div
                        key={`${actor.id}-${index}`}
                        className="flex flex-col items-center gap-2 min-w-[80px] snap-start cursor-pointer group"
                        onClick={() => navigate(`/actor/${actor.id}`)}
                      >
                        <SmartActorImage
                          staffId={actor.id}
                          initialAvatar={actor.avatar}
                          alt={actor.name}
                          className="w-16 h-16 rounded-full object-cover border border-white/10 bg-[#121212] group-hover:border-white/30 transition-all shadow-md"
                        />
                        <div className="text-center w-full">
                          <p className="text-white text-xs font-semibold group-hover:text-white transition-colors line-clamp-1">
                            {actor.name}
                          </p>
                          <p className="text-white/40 text-[10px] mt-0.5 tracking-tight line-clamp-1">
                            as {actor.character ? actor.character : "Supporting"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Movie details info cards */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-medium">Released</p>
                    <p className="text-sm text-white font-semibold">{details.year || 'N/A'}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-medium">Country</p>
                    <p className="text-sm text-white font-semibold">{details.country || 'US'}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-medium">Genre</p>
                    <p className="text-sm text-white font-semibold line-clamp-1">{Array.isArray(details.genres) ? details.genres.slice(0,2).join(", ") : details.genres}</p>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 backdrop-blur-sm">
                  <div className="w-8 h-8 flex items-center justify-center text-white/50">
                    <Star className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-white/40 font-medium">IMDb Rating</p>
                    <p className="text-sm text-white font-semibold">{details.imdbRatingValue || '5.9'} <span className="text-white/40 text-[10px] font-normal">/10</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations (You May Also Like) */}
          <div className="pt-8 space-y-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                You May Also Like
              </h2>
              {recommendations.length > 10 && (
                <button onClick={() => setShowAllRecs(!showAllRecs)} className="text-white/50 text-sm font-medium flex items-center hover:text-white transition-colors">
                  {showAllRecs ? 'Show Less' : 'View All'} <svg className={`w-4 h-4 ml-1 transition-transform ${showAllRecs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
              )}
            </div>

            <div className={`flex overflow-x-auto gap-3 pb-6 hide-scrollbar snap-x snap-mandatory -mx-5 px-5 ${showAllRecs ? 'flex-wrap' : ''}`}>
              {(showAllRecs ? recommendations : recommendations.slice(0, 10)).map((item, index) => (
                <div
                  key={`${item.id}-${index}`}
                  onClick={() => {
                    navigate(`/details/${slugify(item.title)}`);
                    window.scrollTo(0, 0);
                  }}
                  className="flex-none w-[110px] md:w-[140px] snap-start group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#121212] relative border border-white/5 transition-all duration-300 group-hover:scale-105 group-hover:border-white/20 shadow-md">
                    <MovieImage
                      src={item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    {item.rating && (
                      <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-white border border-white/10">
                        <Star className="w-2.5 h-2.5 text-[#ff0f39] fill-[#ff0f39]" />
                        <span className="font-semibold text-[10px]">
                          {item.rating || "5.0"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Share/Poster Download Modal */}
        <Tray
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title="Share with friends"
        >
          <div className="flex flex-col items-center gap-6 p-2 text-center">
            <div className="flex gap-4 w-full justify-center">
              {[
                {
                  name: "Twitter",
                  icon: "🐦",
                  platform: "twitter",
                  color: "bg-white/10 border-white/20",
                },
                {
                  name: "Facebook",
                  icon: "f",
                  platform: "facebook",
                  color: "bg-white/10 border-white/20",
                },
                {
                  name: "WhatsApp",
                  icon: "💬",
                  platform: "whatsapp",
                  color: "bg-white/10 border-white/20 text-[#25D366]",
                },
              ].map((social) => (
                <button
                  key={social.platform}
                  onClick={() => handleShare(social.platform)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-fluid-xl shadow-lg hover:scale-110 border backdrop-blur-md transition-all active:scale-95 ${social.color}`}
                >
                  {social.icon}
                </button>
              ))}
            </div>

            <div className="w-40 aspect-[2/3] rounded-[16px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 mt-2">
              <MovieImage
                src={details.poster}
                alt={details.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-md">
                Shared Successfully!
              </h3>
              <p className="text-white/60 text-fluid-base font-normal leading-relaxed max-w-[250px] mx-auto opacity-80">
                Would you like to download the movie poster?
              </p>
            </div>

            <div className="flex flex-col gap-2.5 w-full mt-2">
              <button
                onClick={downloadPoster}
                className="w-full py-3.5 bg-white text-black font-semibold text-fluid-base rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all"
              >
                Yes, Download Poster
              </button>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-3.5 glass-button border border-white/10 text-white font-semibold text-fluid-base rounded-full hover:bg-white/10 active:scale-95 transition-all shadow-sm"
              >
                No, Keep Shared
              </button>
            </div>
          </div>
        </Tray>

        <Tray
          isOpen={isDownloadTrayOpen}
          onClose={() => setIsDownloadTrayOpen(false)}
          title="Download Options"
        >
          <div className="grid grid-cols-1 gap-3">
            {Array.isArray(mediaData?.sources) &&
              mediaData.sources.map((source, idx) => {
                // Estimate size based on quality
                let estimatedSize = "Unknown Size";
                if (source.quality.includes("1080")) estimatedSize = "1.2 GB";
                else if (source.quality.includes("720"))
                  estimatedSize = "800 MB";
                else if (source.quality.includes("480"))
                  estimatedSize = "400 MB";
                else if (source.quality.includes("360"))
                  estimatedSize = "250 MB";
                else if (source.quality.includes("auto"))
                  estimatedSize = "Variable";

                const downloadTargetUrl = source.downloadUrl || source.url;
                const isHls = (source.downloadType || source.type) === "hls";
                const dlSize = sourceSizes[downloadTargetUrl];

                return (
                  <button
                    key={`${source.url}-${idx}`}
                    onClick={() => handleDownload(downloadTargetUrl)}
                    disabled={isHls}
                    className={`flex items-center justify-between p-4 glass-button border border-white/10 rounded-[16px] transition-all group shadow-sm ${isHls ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10 hover:border-white/30 active:scale-[0.98]"}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[14px] bg-white/10 border border-white/10 flex items-center justify-center text-white/70 group-hover:scale-105 group-hover:bg-white/20 group-hover:border-white/30 group-hover:text-white transition-all shadow-md">
                        <Film className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-white text-fluid-lg">
                          {source.quality}
                        </p>
                        <p className="text-fluid-sm text-white/50 tracking-wide mt-0.5 font-medium">
                          <span className="flex items-center gap-1.5">
                            {dlSize || "Checking Size..."}
                            <span className="text-white/20">•</span>
                            {(
                              source.downloadType ||
                              source.type ||
                              "mp4"
                            ).toUpperCase()}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                        <Download className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </Tray>
      </div>
    </div>
  );
}
