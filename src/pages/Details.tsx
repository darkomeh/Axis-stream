import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaData, MediaItem } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import PosterGrid from "../components/PosterGrid";
import EpisodeSelector from "../components/EpisodeSelector";
import PopcornLoader from "../components/PopcornLoader";
import { ErrorMessage } from "../components/ErrorMessage";
import { SEO } from "../components/SEO";
import { 
  ArrowLeft, Star, Download, Film, Bookmark, Check, Share2, 
  ListVideo, Play, X, UserPlus, Users, 
  Copy, CheckCircle2, CornerUpLeft, Plus, Info, MoreHorizontal
} from "lucide-react";
import Tray from "../components/Tray";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { MovieImage } from "../components/MovieImage";
import { SmartActorImage } from "../components/SmartActorImage";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openPreview } = useMediaPreview();
  const playerRef = useRef<HTMLDivElement>(null);
  const { 
    user, addToHistory, addToWatchlist, removeFromWatchlist, 
    isInWatchlist, continueWatching, trackWatchActivity 
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
  
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [userClosedMiniPlayer, setUserClosedMiniPlayer] = useState(false);
  const [sourceSizes, setSourceSizes] = useState<Record<string, string>>({});

  const fetchSourceSize = async (url: string) => {
    if (sourceSizes[url]) return;
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const size = response.headers.get('content-length');
      if (size) {
        const bytes = parseInt(size, 10);
        const gb = (bytes / (1024 * 1024 * 1024)).toFixed(2);
        const mb = (bytes / (1024 * 1024)).toFixed(0);
        const formattedSize = bytes > 1024 * 1024 * 1024 ? `${gb} GB` : `${mb} MB`;
        setSourceSizes(prev => ({ ...prev, [url]: formattedSize }));
      }
    } catch (e) {
      console.warn("Could not fetch size for source", url);
    }
  };

  useEffect(() => {
    if (mediaData?.sources && isDownloadTrayOpen) {
      mediaData.sources.forEach(source => {
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
        genres: details.genres
      });
    }
    return () => { document.title = "Axis TV"; };
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
      { threshold: 0.1 }
    );

    observer.observe(playerRef.current);
    return () => observer.disconnect();
  }, [mediaData]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (!id) return;

    // Save to recently viewed
    try {
      localStorage.setItem('axis_last_viewed_id', id);
    } catch (e) {}

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Scroll to top on new item
        window.scrollTo(0, 0);

        const [itemDetails, itemRecs, itemRichDetails] = await Promise.all([
          movieService.getDetails(id),
          movieService.getRecommendations(id).catch(() => []),
          movieService.getRichDetails(id).catch(() => null)
        ]);

        setDetails(itemDetails);
        setRecommendations(itemRecs);
        setRichDetails(itemRichDetails);
        
        // Add to history if user is logged in
        if (user) {
          addToHistory({
            id: itemDetails.id,
            title: itemDetails.title,
            poster: itemDetails.poster,
            type: itemDetails.type,
            year: itemDetails.year,
            rating: itemDetails.rating
          });
        }

        const isSeries = itemDetails.type === "Series";
        let s = isSeries ? (itemDetails.seasons && itemDetails.seasons.length > 0 ? itemDetails.seasons[0].se : 1) : 0;
        let e = isSeries ? 1 : 0;
        let initialTime = 0;

        // Check for saved progress
        const savedProgress = continueWatching.find(i => i.id === id);
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
          const itemMedia = await movieService.getPlay(id, s, e);
          setMediaData({ ...itemMedia, initialTime });
        }
      } catch (err) {
        console.error("Error loading details:", err);
        setError(err instanceof Error ? err.message : "Failed to load details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShare = async (platform?: string) => {
    if (!details) return;
    
    const url = window.location.href;
    const title = details.title;
    const text = `Watching ${title} on Axis TV! Check it out:`;
    
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
      return;
    }
    
    if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
      return;
    }

    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: text,
          url: url,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        showToast("Link copied to clipboard!", "success");
      }
      setIsShareModalOpen(true);
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.message !== 'Share canceled') {
        console.error("Share failed:", err);
      }
    }
  };

  const downloadPoster = async () => {
    if (!details?.poster) return;
    try {
       const response = await fetch(details.poster);
       const blob = await response.blob();
       const url = window.URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `${details.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_poster.jpg`;
       document.body.appendChild(a);
       a.click();
       window.URL.revokeObjectURL(url);
       document.body.removeChild(a);
    } catch (err) {
       console.error("Poster download failed", err);
       // Fallback to direct link
       const a = document.createElement('a');
       a.href = details.poster;
       a.target = '_blank';
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
      const itemMedia = await movieService.getPlay(id, s, e);
      setMediaData(itemMedia);
    } catch (err) {
      console.error("Error loading episode:", err);
    }
  };

  const handleDownload = (url: string) => {
    if (!details) return;
    
    const dlTitle = details.type === 'Series' 
      ? `${details.title} S${selectedSeason} E${selectedEpisode}` 
      : details.title;
    const cleanTitle = dlTitle.replace(/[^a-zA-Z0-9 -]/g, '');
    const finalUrl = url.includes('download=1') ? url : (url.includes('?') ? `${url}&download=1` : `${url}?download=1`);
    
    // Trigger browser native download without exposing URL in address bar or new tab
    // We use a hidden iframe to ensure the current page state remains intact and keeps the API private 
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
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
      navigate('/profile');
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
        rating: details.rating
      });
      showToast("Added to My List", "success");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
        <button 
          onClick={handleBack}
          className="absolute top-8 left-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white z-50"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium uppercase tracking-wider">Back</span>
        </button>
        <PopcornLoader />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center max-w-md px-4">
          <ErrorMessage 
            message={error || "Item not found."} 
            onRetry={() => window.location.reload()} 
          />
          <button 
            onClick={handleBack}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2 mx-auto uppercase tracking-wider text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20 relative overflow-hidden" style={{ '--theme-color': details.avgHueDark || '#E50914' } as React.CSSProperties}>
      {/* Immersive Background Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-[var(--theme-color)] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-20 transition-all duration-1000" />
        <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-[var(--theme-color)] rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 opacity-10 transition-all duration-1000" />
      </div>

      <div className="relative z-10">
        <SEO 
          title={details.title}
        description={details.description.slice(0, 160)}
        keywords={`${details.title}, watch ${details.title} online, ${details.genres?.join(', ')}, Axis TV`}
        image={details.poster}
        type={details.type === 'Series' ? 'video.tv_show' : 'video.movie'}
        schema={{
          "@context": "https://schema.org",
          "@type": details.type === 'Series' ? 'TVSeries' : 'Movie',
          "name": details.title,
          "description": details.description,
          "image": details.poster,
          "datePublished": details.year,
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": details.imdbRatingValue || details.rating || "8.5",
            "bestRating": "10",
            "ratingCount": "1000"
          }
        }}
      />
      {/* Video Player Section */}
      <div className="w-full aspect-video bg-black relative z-40" ref={playerRef}>
        {!user ? (
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-[#0c0c0c] px-6 text-center border-b border-white/5 shadow-2xl">
            <button 
              onClick={handleBack}
              className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-white z-50"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-20 h-20 bg-brand/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(229,9,20,0.2)]">
              <Play className="w-10 h-10 text-brand fill-current" />
            </div>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-white mb-4 italic">Stream {details.title}</h2>
            <p className="text-gray-400 text-sm md:text-base font-bold uppercase tracking-widest max-w-[400px] mb-8">Access high-quality streams, trailers and save your progress by signing in.</p>
            <button 
              onClick={() => navigate('/profile')}
              className="px-12 py-4 bg-brand text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-hover transition-all active:scale-95 shadow-xl glow-brand"
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
                const itemMedia = await movieService.getPlay(subjectId, selectedSeason, selectedEpisode);
                setMediaData(itemMedia);
              } catch (err) {
                console.error("Error switching audio track:", err);
              }
            }}
            onClose={handleBack}
            isMiniPlayer={isMiniPlayer && !userClosedMiniPlayer}
            onCloseMiniPlayer={() => setUserClosedMiniPlayer(true)}
            initialTime={(mediaData as any).initialTime}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative">
            <button 
              onClick={handleBack}
              className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-white z-50"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <PopcornLoader />
          </div>
        )}
      </div>

      {/* Content Info Section - Exact match to screenshot */}
      <div className="max-w-[1400px] mx-auto px-5 py-8 space-y-8">
        <div className="space-y-4">
           <div className="flex items-center justify-between gap-4">
             <h1 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter text-white leading-none flex-1">
                {details.title}
             </h1>
             <button 
                onClick={toggleWatchlist}
                className={`p-4 rounded-xl transition-all flex-none h-fit ${isInWatchlist(details.id) ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
             >
                <div className="transform scale-110">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={isInWatchlist(details.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                </div>
             </button>
           </div>
           
           <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 text-sm font-bold text-gray-300">
                <div className="flex items-center gap-2 bg-[#E50914] px-2 py-0.5 rounded text-white text-[10px] md:text-xs font-black">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{details.imdbRatingValue || details.rating || '5.0'}</span>
                </div>
                
                {details.year && <span className="hover:text-white transition-colors">{details.year}</span>}
                <span className="text-gray-600 font-black">•</span>
                {details.duration && <span className="">{details.duration}</span>}
                <span className="text-gray-600 font-black">•</span>
                <span className="uppercase tracking-widest text-[11px] md:text-xs">{details.type || 'Movie'}</span>
              </div>
           </div>
        </div>

        {/* Action Buttons Row - Scrollable on mobile to prevent stacking */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 md:gap-3 py-2 -mx-5 px-5">
           <button 
              onClick={() => setShowDetails(true)}
              className="flex items-center gap-3 px-5 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 active:scale-95 group flex-shrink-0"
           >
              <Info className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">Details</span>
           </button>
           <button 
              onClick={() => setIsDownloadTrayOpen(true)}
              className="flex items-center gap-3 px-5 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 active:scale-95 group flex-shrink-0"
           >
              <Download className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">Download</span>
           </button>
           <button 
              onClick={toggleWatchlist}
              className="flex items-center gap-3 px-5 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 active:scale-95 group flex-shrink-0"
           >
              <Plus className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">Playlist</span>
           </button>
           <button 
              onClick={() => handleShare()}
              className="flex items-center gap-3 px-5 md:px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all border border-white/5 active:scale-95 group flex-shrink-0"
           >
              <Share2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400 group-hover:text-white transition-colors" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest whitespace-nowrap">Share</span>
           </button>
        </div>

        {/* Episodes Section - vertical orientation */}
        {details.type === "Series" && (
          <div className="pt-10 border-t border-white/5">
            <EpisodeSelector 
              seasons={details.seasons} 
              selectedSeason={selectedSeason} 
              selectedEpisode={selectedEpisode} 
              onEpisodeChange={handleEpisodeChange} 
              poster={details.poster}
              itemId={details.id}
              progressList={continueWatching}
              episodeDetails={richDetails}
            />
          </div>
        )}

        {/* More Like This - Match screenshot posters style */}
        <div className="pt-16 space-y-8 border-t border-white/5">
           <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white italic">More Like This</h2>
           </div>
           
           <div className="flex overflow-x-auto gap-4 md:gap-6 pb-6 no-scrollbar snap-x snap-mandatory">
              {recommendations.slice(0, 10).map((item, index) => (
                <div 
                  key={`${item.id}-${index}`} 
                  onClick={() => {
                    navigate(`/details/${item.id}`);
                    window.scrollTo(0, 0);
                  }}
                  className="flex-none w-[140px] md:w-[220px] snap-start group space-y-4 cursor-pointer"
                >
                   <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#121212] relative shadow-2xl border border-white/5 transition-all duration-500 group-hover:scale-[1.03] group-hover:border-white/20 group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.4)]">
                      <MovieImage 
                        src={item.poster} 
                        alt={item.title} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                      
                      {/* Red Rating Badge on Poster bottom left as per screenshot */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-[#E50914] px-2 py-0.5 rounded text-white shadow-lg">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="font-black text-[10px] md:text-xs">{item.rating || '5.0'}</span>
                      </div>
                   </div>
                   <div className="px-1">
                      <h4 className="text-[13px] md:text-[15px] font-black uppercase text-white tracking-tight truncate group-hover:text-white transition-colors mb-0.5">{item.title}</h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                         <span>{item.year || '2024'}</span>
                         {item.type === 'Series' && <span className="text-[#E50914]">Series</span>}
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>

        {/* Stills & Trailer Section - Simplified gallery */}
        <div className="pt-16 space-y-8 border-t border-white/5">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white italic">Stills & Trailer</h2>
          <div className="flex gap-5 overflow-x-auto no-scrollbar pb-10">
            {details.images && details.images.length > 0 && (
              <div 
                className="relative flex-none w-[320px] aspect-video rounded-xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl group cursor-pointer"
                onClick={() => {
                  openPreview(details.id);
                }}
              >
                <MovieImage src={details.images[0]} alt="Trailer thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transform transition-transform group-hover:scale-110">
                    <Play className="w-7 h-7 text-white fill-current ml-1" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Trailer</span>
                </div>
              </div>
            )}

            {details.images?.slice(1, 8).map((img, i) => (
              <div 
                key={i} 
                onClick={() => openPreview(details.id)}
                className="flex-none w-[320px] aspect-video rounded-xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl relative group cursor-pointer"
              >
                <MovieImage src={img} alt={`Still ${i}`} className="w-full h-full object-cover transition-transform duration-700" />
                <div className="absolute bottom-4 left-4 flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/50">Still {i + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


      {/* Trays */}
      <Tray isOpen={showDetails} onClose={() => setShowDetails(false)} title="Details">
        <div className="space-y-6">
          <p className="text-gray-300 leading-relaxed text-lg font-light">{details.description}</p>
          
          {/* Series Info in Details Tray */}
          {details.type === "Series" && details.seasons && (
            <div className="pt-6 border-t border-white/10 space-y-4">
              <h3 className="text-xl font-bold tracking-tight uppercase">Series Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Total Seasons</p>
                  <p className="text-3xl font-light">{details.seasons.length}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1 tracking-wider">Total Episodes</p>
                  <p className="text-3xl font-light">
                    {details.seasons.reduce((acc, s) => acc + s.maxEp, 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Seasons Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {details.seasons.map((s) => (
                    <div key={s.se} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-medium">
                      Season {s.se}: <span className="text-gray-400">{s.maxEp} Episodes</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Cast Section in Details Tray */}
          {Array.isArray(details.cast) && details.cast.length > 0 && (
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-xl font-bold mb-4 tracking-tight uppercase">Top Cast</h3>
              <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar">
                {Array.isArray(details.cast) && details.cast.slice(0, 6).map((actor, idx) => (
                  <div key={`${actor.id}-${idx}`} className="flex-shrink-0 w-24 text-center group">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-3 bg-white/5 border border-white/10 group-hover:border-brand transition-colors">
                      <SmartActorImage 
                        staffId={actor.id?.toString()}
                        initialAvatar={actor.avatarUrl || actor.avatar || ""} 
                        alt={actor.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <p className="text-sm text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors">{actor.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Tray>

      {/* Share/Poster Download Modal */}
      <Tray 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        title="Share this with friends"
      >
        <div className="flex flex-col items-center gap-8 p-4 text-center">
           <div className="flex gap-4 w-full justify-center">
              {[
                { name: 'Twitter', icon: '🐦', platform: 'twitter', color: 'bg-[#1DA1F2]' },
                { name: 'Facebook', icon: 'f', platform: 'facebook', color: 'bg-[#1877F2]' },
                { name: 'WhatsApp', icon: '💬', platform: 'whatsapp', color: 'bg-[#25D366]' },
              ].map(social => (
                <button 
                  key={social.platform}
                  onClick={() => handleShare(social.platform)}
                  className={`${social.color} w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg hover:scale-110 transition-transform active:scale-95`}
                >
                  {social.icon}
                </button>
              ))}
           </div>

           <div className="w-40 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 ring-1 ring-white/10">
              <MovieImage src={details.poster} alt={details.title} className="w-full h-full object-cover" />
           </div>
           
           <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white italic">Shared Successfully!</h3>
              <p className="text-gray-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
                Would you like to download the movie poster? 
                <span className="block mt-1 text-brand">It looks amazing on WhatsApp status!</span>
              </p>
           </div>
           
           <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={downloadPoster}
                className="w-full py-4 bg-brand text-white font-black uppercase text-[12px] tracking-[0.2em] rounded-xl shadow-[0_0_20px_rgba(255,45,45,0.3)] active:scale-95 transition-all"
              >
                 Yes, Download Poster
              </button>
              <button 
                onClick={() => setIsShareModalOpen(false)}
                className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 font-black uppercase text-[11px] tracking-widest rounded-xl hover:bg-white/10 active:scale-95 transition-all"
              >
                 No, Just Keep Shared
              </button>
           </div>
        </div>
      </Tray>

      <Tray isOpen={isDownloadTrayOpen} onClose={() => setIsDownloadTrayOpen(false)} title="Download Options">
        <div className="grid grid-cols-1 gap-4">
          {Array.isArray(mediaData?.sources) && mediaData.sources.map((source, idx) => {
            // Estimate size based on quality
            let estimatedSize = "Unknown Size";
            if (source.quality.includes("1080")) estimatedSize = "1.2 GB";
            else if (source.quality.includes("720")) estimatedSize = "800 MB";
            else if (source.quality.includes("480")) estimatedSize = "400 MB";
            else if (source.quality.includes("360")) estimatedSize = "250 MB";
            else if (source.quality.includes("auto")) estimatedSize = "Variable";

            const downloadTargetUrl = source.downloadUrl || source.url;
            const isHls = (source.downloadType || source.type) === 'hls';
            const dlSize = sourceSizes[downloadTargetUrl];

            return (
              <button
                key={`${source.url}-${idx}`}
                onClick={() => handleDownload(downloadTargetUrl)}
                disabled={isHls}
                className={`flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-xl transition-all group ${isHls ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10 hover:border-brand/50 active:scale-[0.98]'}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-brand/20 group-hover:border-brand/50 group-hover:text-brand transition-all">
                    <Film className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-lg">{source.quality}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-medium">
                      <span className="flex items-center gap-1.5">
                        {dlSize || "Checking Size..."}
                        <span className="text-white/10">•</span>
                        {(source.downloadType || source.type || 'mp4').toUpperCase()}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Download className="w-6 h-6 text-gray-500 group-hover:text-brand transition-colors" />
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
