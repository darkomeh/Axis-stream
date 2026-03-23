import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaData, MediaItem } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import PosterGrid from "../components/PosterGrid";
import EpisodeSelector from "../components/EpisodeSelector";
import PopcornLoader from "../components/PopcornLoader";
import { ErrorMessage } from "../components/ErrorMessage";
import { ArrowLeft, Star, Download, Film, Users, Bookmark, Check, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Tray from "../components/Tray";
import { useAuth } from "../contexts/AuthContext";
import { localDownloadService } from "../services/localDownloadService";

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const { user, addToHistory, addToWatchlist, removeFromWatchlist, isInWatchlist } = useAuth();
  
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
  
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [isDownloadingSeason, setIsDownloadingSeason] = useState(false);

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
        const s = isSeries ? 1 : 0;
        const e = isSeries ? 1 : 0;
        setSelectedSeason(s);
        setSelectedEpisode(e);
        
        const itemMedia = await movieService.getPlay(id, s, e);
        setMediaData(itemMedia);
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

  const handleDownloadSeason = async () => {
    if (!details || !details.seasons) return;
    
    const seasonData = details.seasons.find(s => s.se === selectedSeason);
    if (!seasonData) return;

    setIsDownloadingSeason(true);
    alert(`Starting bulk download for Season ${selectedSeason} (${seasonData.maxEp} episodes). You can check progress in the Downloads tab.`);
    setIsDownloadTrayOpen(false);

    try {
      for (let ep = 1; ep <= seasonData.maxEp; ep++) {
        try {
          const media = await movieService.getPlay(details.id, selectedSeason, ep);
          if (media && media.sources.length > 0) {
            // Pick 720p or the first available
            const source = media.sources.find(s => s.quality.includes('720')) || media.sources[0];
            
            const downloadId = `${details.id}-${selectedSeason}-${ep}-${source.quality}`;
            const downloadTitle = `${details.title} S${selectedSeason} E${ep}`;
            
            // Fire and forget (it will show in Downloads tab)
            localDownloadService.downloadFromUrl(downloadId, downloadTitle, source.url).then(blob => {
              localDownloadService.saveVideo({
                id: downloadId,
                title: downloadTitle,
                poster: details.poster,
                quality: source.quality,
                blob,
                timestamp: Date.now()
              });
            }).catch((e: any) => {
              const isAborted = e.name === 'AbortError' || 
                                (typeof e === 'string' && e.includes('aborted')) || 
                                (e.message && e.message.includes('aborted'));
              if (isAborted) {
                console.log(`Download cancelled for ep ${ep}`);
              } else {
                console.error("Failed to download ep", ep, e);
              }
            });
          }
        } catch (e) {
          console.error("Failed to fetch media for ep", ep, e);
        }
      }
    } finally {
      setIsDownloadingSeason(false);
    }
  };

  const handleDownload = async (url: string, quality: string) => {
    if (!details) return;
    
    const downloadId = `${details.id}-${selectedSeason}-${selectedEpisode}-${quality}`;
    const downloadTitle = details.type === 'Series' ? `${details.title} S${selectedSeason} E${selectedEpisode}` : details.title;
    
    setDownloadingUrl(url);
    setDownloadProgress(0);
    
    try {
      const blob = await localDownloadService.downloadFromUrl(downloadId, downloadTitle, url, (progress) => {
        setDownloadProgress(progress);
      });
      
      await localDownloadService.saveVideo({
        id: downloadId,
        title: downloadTitle,
        poster: details.poster,
        quality,
        blob,
        timestamp: Date.now()
      });
      
      alert('Download complete! You can watch it offline in the Downloads section.');
    } catch (err: any) {
      const isAborted = err.name === 'AbortError' || 
                        (typeof err === 'string' && err.includes('aborted')) || 
                        (err.message && err.message.includes('aborted'));
      if (isAborted) {
        console.log('Download cancelled by user');
      } else {
        console.error("Download failed:", err);
        alert('Download failed. Please try again.');
      }
    } finally {
      setDownloadingUrl(null);
      setDownloadProgress(0);
    }
  };

  const toggleWatchlist = () => {
    if (!details || !user) {
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

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white">
        <button 
          onClick={handleBack}
          className="absolute top-8 left-6 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white z-50"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <PopcornLoader />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-center max-w-md px-4">
          <ErrorMessage 
            message={error || "Item not found."} 
            onRetry={() => window.location.reload()} 
          />
          <button 
            onClick={() => navigate(-1)}
            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
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
            onClose={handleBack}
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
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl font-bold">{details.title}</h1>
          <button 
            onClick={toggleWatchlist}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${isInWatchlist(details.id) ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'}`}
          >
            {isInWatchlist(details.id) ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400 mb-4">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-yellow-500 font-medium">{details.rating || "N/A"}</span>
          </span>
          <span>|</span>
          <span>{details.year || "N/A"}</span>
          <span>|</span>
          <span>United States</span>
          <span>|</span>
          <span>{details.genres?.[0] || details.type || "Action"}</span>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button 
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20">
              <img src={details.poster} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            Details
          </button>
          
          <button 
            onClick={() => setIsDownloadTrayOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download option
          </button>

          <button 
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: details.title,
                    text: details.description,
                    url: window.location.href,
                  });
                } catch (err) {
                  console.error("Share failed:", err);
                }
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert("Link copied to clipboard!");
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-sm font-medium"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>

          <button 
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/details/${details.id}?party=true`);
              alert("Party link copied to clipboard! Share it with your friends to watch together.");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-full transition-colors text-sm font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)]"
          >
            <Users className="w-4 h-4" />
            Watch with Friends
          </button>
        </div>
      </div>

      {/* Episodes (if series) */}
      {details.type === "Series" && details.seasons && (
        <div className="px-4 py-2 mb-6">
          <EpisodeSelector 
            seasons={details.seasons} 
            selectedSeason={selectedSeason} 
            selectedEpisode={selectedEpisode} 
            onEpisodeChange={handleEpisodeChange} 
          />
        </div>
      )}

      {/* Recommendations */}
      <div className="px-4">
        <PosterGrid title="More film suggestions" items={recommendations.slice(0, 12)} />
      </div>

      {/* Trays */}
      <Tray isOpen={showDetails} onClose={() => setShowDetails(false)} title="Details">
        <div className="space-y-4">
          <p className="text-gray-300 leading-relaxed">{details.description}</p>
          
          {/* Series Info in Details Tray */}
          {details.type === "Series" && details.seasons && (
            <div className="pt-4 border-t border-white/10 space-y-3">
              <h3 className="text-lg font-bold">Series Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Seasons</p>
                  <p className="text-xl font-bold">{details.seasons.length}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Episodes</p>
                  <p className="text-xl font-bold">
                    {details.seasons.reduce((acc, s) => acc + s.maxEp, 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase font-bold">Seasons Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {details.seasons.map((s) => (
                    <div key={s.se} className="px-3 py-1 bg-white/10 rounded-full text-xs">
                      Season {s.se}: {s.maxEp} Episodes
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Cast Section in Details Tray */}
          {Array.isArray(details.cast) && details.cast.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-bold mb-3">Top Cast</h3>
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {details.cast.slice(0, 6).map((actor, idx) => (
                  <div key={`${actor.id}-${idx}`} className="flex-shrink-0 w-20 text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-2 bg-white/5">
                      {actor.avatar ? (
                        <img 
                          src={actor.avatar} 
                          alt={actor.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <Users className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2">{actor.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Tray>

      <Tray isOpen={isDownloadTrayOpen} onClose={() => setIsDownloadTrayOpen(false)} title="Download Options">
        <div className="grid grid-cols-1 gap-4">
          {details.type === "Series" && details.seasons && (
            <button
              onClick={handleDownloadSeason}
              disabled={isDownloadingSeason}
              className="flex items-center justify-center gap-2 p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors mb-2"
            >
              {isDownloadingSeason ? (
                <>
                  <div className="w-5 h-5 flex items-center justify-center">
                    <PopcornLoader />
                  </div>
                  Starting Bulk Download...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download Entire Season {selectedSeason}
                </>
              )}
            </button>
          )}
          
          {mediaData?.sources.map((source, idx) => {
            // Estimate size based on quality
            let estimatedSize = "Unknown Size";
            if (source.quality.includes("1080")) estimatedSize = "1.2 GB";
            else if (source.quality.includes("720")) estimatedSize = "800 MB";
            else if (source.quality.includes("480")) estimatedSize = "400 MB";
            else if (source.quality.includes("360")) estimatedSize = "250 MB";
            else if (source.quality.includes("auto")) estimatedSize = "Variable";

            const isDownloading = downloadingUrl === source.url;

            return (
              <button
                key={`${source.url}-${idx}`}
                onClick={() => handleDownload(source.url, source.quality)}
                disabled={downloadingUrl !== null}
                className={`flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group ${downloadingUrl !== null && !isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                    {isDownloading ? (
                      <div className="w-5 h-5 flex items-center justify-center">
                        <PopcornLoader />
                      </div>
                    ) : (
                      <Film className="w-5 h-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">{source.quality}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">
                      {isDownloading ? `Downloading... ${downloadProgress}%` : `${estimatedSize} • MP4`}
                    </p>
                  </div>
                </div>
                {isDownloading ? (
                  <div className="w-12 h-12 relative flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-white/20"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="text-red-500 transition-all duration-300"
                        strokeDasharray={`${downloadProgress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                ) : (
                  <Download className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </Tray>
    </div>
  );
}
