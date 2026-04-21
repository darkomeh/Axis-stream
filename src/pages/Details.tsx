import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaData, MediaItem } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import PosterGrid from "../components/PosterGrid";
import EpisodeSelector from "../components/EpisodeSelector";
import PopcornLoader from "../components/PopcornLoader";
import { ErrorMessage } from "../components/ErrorMessage";
import { 
  ArrowLeft, Star, Download, Film, Bookmark, Check, Share2, 
  ListVideo, Play, X, UserPlus, Users, 
  Copy, CheckCircle2, CornerUpLeft, Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Tray from "../components/Tray";
import { useAuth } from "../contexts/AuthContext";
import { localDownloadService } from "../services/localDownloadService";
import { MovieImage } from "../components/MovieImage";
import { PlaylistModal } from "../components/PlaylistModal";

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const { 
    user, addToHistory, addToWatchlist, removeFromWatchlist, 
    isInWatchlist, customPlaylists, createPlaylist, addToPlaylist, 
    continueWatching, trackWatchActivity 
  } = useAuth();
  
  const [details, setDetails] = useState<ItemDetails | null>(null);
  const [richDetails, setRichDetails] = useState<any | null>(null);
  const [mediaData, setMediaData] = useState<MediaData | null>(null);
  const [recommendations, setRecommendations] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [isDownloadTrayOpen, setIsDownloadTrayOpen] = useState(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloadingItem, setIsDownloadingItem] = useState(false);

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [userClosedMiniPlayer, setUserClosedMiniPlayer] = useState(false);

  useEffect(() => {
    if (details) {
      document.title = `${details.title} - Axis`;
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
    return () => { document.title = "Axis"; };
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
        let s = isSeries ? 1 : 0;
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
        
        const itemMedia = await movieService.getPlay(id, s, e);
        setMediaData({ ...itemMedia, initialTime });
      } catch (err) {
        console.error("Error loading details:", err);
        setError(err instanceof Error ? err.message : "Failed to load details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, user]);

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

  const handleDownload = async (url: string, quality: string) => {
    if (!details) return;
    if (isDownloadingItem) return;
    
    // Format: [ Movies name ] [Axis stream].mp4
    let cleanTitle = details.type === 'Series' 
      ? `${details.title} S${selectedSeason} E${selectedEpisode}` 
      : details.title;
    
    // Clean up filename to prevent weird characters
    cleanTitle = cleanTitle.replace(/[^a-zA-Z0-9 -]/g, '');
    
    const fileName = `[${cleanTitle}] [Axis Stream].mp4`;
    const finalUrl = url.includes('download=1') ? url : `${url}&download=1`;
    
    try {
      setIsDownloadingItem(true);
      setDownloadProgress(0);
      
      const response = await fetch(finalUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported");
      
      const chunks = [];
      let received = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total) {
            setDownloadProgress(Math.round((received / total) * 100));
          }
        }
      }
      
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      setIsDownloadTrayOpen(false);
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: just open the link and let the browser handle it, even if the filename is wrong
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setIsDownloadingItem(false);
      setDownloadProgress(0);
    }
  };

  const toggleWatchlist = () => {
    if (!details || !user) {
      // In a real app, this would show a toast or notification
      alert("Please sign in to use the watchlist.");
      navigate('/profile');
      return;
    }
    
    if (isInWatchlist(details.id)) {
      removeFromWatchlist(details.id);
    } else {
      addToWatchlist({
        id: details.id,
        title: details.title,
        poster: details.poster,
        type: details.type,
        year: details.year,
        rating: details.rating
      });
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
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Video Player Section */}
      <div className="w-full aspect-video bg-black relative z-40" ref={playerRef}>
        {mediaData ? (
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

      {/* Details Section */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-4">
             <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter uppercase drop-shadow-2xl leading-[0.85]" style={{ transform: 'scaleY(1.1)', transformOrigin: 'bottom left' }}>
               {details.title}
             </h1>
             
             <div className="flex flex-wrap items-center gap-4 text-sm md:text-base text-gray-400 font-bold tracking-widest uppercase">
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[#f5c518] text-black rounded-sm text-xs font-black">
                   IMDb {details.rating || "8.5"}
                </span>
                <span>{details.year || "2024"}</span>
                <span className="text-white/20">•</span>
                <span className="text-white underline underline-offset-4">{details.genres?.[0] || details.type || "Action"}</span>
                <span className="text-white/20">•</span>
                <span className="px-1.5 py-0.5 border border-white/20 rounded text-[11px] text-white">
                   {details.contentRating || '18+'}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
              onClick={toggleWatchlist}
              className={`flex items-center gap-2 px-6 py-4 rounded-xl transition-all font-black uppercase text-[13px] tracking-widest border ${isInWatchlist(details.id) ? 'bg-brand border-brand text-white shadow-xl glow-brand' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/40'}`}
            >
              {isInWatchlist(details.id) ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>In List</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>My List</span>
                </>
              )}
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: details.title, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }
              }}
              className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/40 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
           <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                 <h3 className="text-lg font-black uppercase tracking-[0.2em] text-brand">Synopsis</h3>
                 <p className="text-gray-400 leading-relaxed text-lg font-medium">
                    {details.description || 'Experience the ultimate cinematic journey. Dive into a world of endless entertainment with premium streaming quality natively designed for your enjoyment.'}
                 </p>
              </div>

              {/* Series Episodes Integration */}
              {details.type === "Series" && details.seasons && (
                <div className="pt-8 border-t border-white/5">
                  <EpisodeSelector 
                    seasons={details.seasons} 
                    selectedSeason={selectedSeason} 
                    selectedEpisode={selectedEpisode} 
                    onEpisodeChange={handleEpisodeChange} 
                    poster={details.poster}
                  />
                </div>
              )}
           </div>

           <div className="space-y-8 lg:border-l lg:border-white/5 lg:pl-12">
              <div className="space-y-4">
                 <h3 className="text-lg font-black uppercase tracking-[0.2em] text-brand">Cast</h3>
                 <div className="grid grid-cols-2 gap-4">
                    {details.cast?.slice(0, 4).map((actor: any, idx: number) => (
                       <div key={idx} className="flex flex-col gap-2">
                          <div className="aspect-square rounded-2xl overflow-hidden bg-[#1A1A1A]">
                             <MovieImage src={actor.avatar} alt={actor.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                          </div>
                          <span className="text-[13px] font-bold text-white uppercase tracking-tight">{actor.name}</span>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-4 pt-4">
                 <button 
                  onClick={() => setIsDownloadTrayOpen(true)}
                  className="w-full flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
                 >
                    <div className="flex items-center gap-4">
                       <Download className="w-5 h-5 text-brand" />
                       <span className="font-black uppercase text-[13px] tracking-widest">Download Offline</span>
                    </div>
                    <CornerUpLeft className="w-4 h-4 opacity-20 -rotate-90" />
                 </button>
              </div>
           </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="max-w-[1400px] mx-auto border-t border-white/5 mt-10">
        <PosterGrid title="More Like This" items={recommendations.slice(0, 12)} />
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
                      {actor.avatar ? (
                        <MovieImage 
                          src={actor.avatar} 
                          alt={actor.name} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Users className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-300 font-medium line-clamp-2 group-hover:text-white transition-colors">{actor.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

            return (
              <button
                key={`${source.url}-${idx}`}
                onClick={() => handleDownload(downloadTargetUrl, source.quality)}
                disabled={isHls}
                className={`flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand/50 rounded-xl transition-all group ${isHls ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-brand/20 group-hover:border-brand/50 group-hover:text-brand transition-all">
                    {isDownloadingItem ? (
                      <div className="w-6 h-6 flex items-center justify-center">
                        <PopcornLoader />
                      </div>
                    ) : (
                      <Film className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-white text-lg">{source.quality}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-medium">
                      {isDownloadingItem ? <span className="text-brand">Downloading... {downloadProgress}%</span> : `${estimatedSize} • ${(source.downloadType || source.type || 'mp4').toUpperCase()}`}
                    </p>
                  </div>
                </div>
                {isDownloadingItem ? (
                  <div className="w-14 h-14 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-white/10"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="text-brand transition-all duration-300"
                        strokeDasharray={`${downloadProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                ) : (
                  <Download className="w-6 h-6 text-gray-500 group-hover:text-brand transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </Tray>

      {isPlaylistModalOpen && details && (
        <PlaylistModal
          isOpen={isPlaylistModalOpen}
          onClose={() => setIsPlaylistModalOpen(false)}
          item={{
            id: details.id,
            title: details.title,
            poster: details.poster,
            type: details.type,
            year: details.year,
            rating: details.rating
          }}
        />
      )}
    </div>
  );
}
