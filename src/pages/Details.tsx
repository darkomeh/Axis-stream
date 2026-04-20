import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaData, MediaItem } from "../types";
import VideoPlayer from "../components/VideoPlayer";
import PosterGrid from "../components/PosterGrid";
import EpisodeSelector from "../components/EpisodeSelector";
import PopcornLoader from "../components/PopcornLoader";
import { ErrorMessage } from "../components/ErrorMessage";
import { ArrowLeft, Star, Download, Film, Users, Bookmark, Check, Share2, ListVideo } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Tray from "../components/Tray";
import { useAuth } from "../contexts/AuthContext";
import { localDownloadService } from "../services/localDownloadService";
import { MovieImage } from "../components/MovieImage";

export default function Details() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playerRef = useRef<HTMLDivElement>(null);
  const { user, addToHistory, addToWatchlist, removeFromWatchlist, isInWatchlist, customPlaylists, createPlaylist, addToPlaylist, continueWatching } = useAuth();
  
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

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [userClosedMiniPlayer, setUserClosedMiniPlayer] = useState(false);

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

  const handleDownloadSeason = async () => {
    if (!details || !details.seasons) return;
    
    const seasonData = details.seasons.find(s => s.se === selectedSeason);
    if (!seasonData) return;

    setIsDownloadingSeason(true);
    // In a real app, this would show a toast or notification
    console.log(`Starting bulk download for Season ${selectedSeason} (${seasonData.maxEp} episodes).`);
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
      
      // In a real app, this would show a toast or notification
      console.log('Download complete!');
    } catch (err: any) {
      const isAborted = err.name === 'AbortError' || 
                        (typeof err === 'string' && err.includes('aborted')) || 
                        (err.message && err.message.includes('aborted'));
      if (isAborted) {
        console.log('Download cancelled by user');
      } else {
        console.error("Download failed:", err);
        // In a real app, this would show a toast or notification
        console.error('Download failed.');
      }
    } finally {
      setDownloadingUrl(null);
      setDownloadProgress(0);
    }
  };

  const toggleWatchlist = () => {
    if (!details || !user) {
      // In a real app, this would show a toast or notification
      console.log("Please sign in to use the watchlist.");
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
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">{details.title}</h1>
          <button 
            onClick={toggleWatchlist}
            className={`p-3 rounded-full transition-all flex-shrink-0 ${isInWatchlist(details.id) ? 'bg-brand text-white shadow-[0_0_15px_rgba(229,9,20,0.5)]' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/30'}`}
          >
            {isInWatchlist(details.id) ? <Check className="w-6 h-6" /> : <Bookmark className="w-6 h-6" />}
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-8 font-medium">
          <span className="flex items-center gap-1 text-white bg-white/10 px-2 py-1 rounded-sm border border-white/10">
            <Star className="w-4 h-4 text-brand fill-brand" />
            <span>{details.rating || "N/A"}</span>
          </span>
          <span>{details.year || "N/A"}</span>
          <span className="w-1 h-1 rounded-full bg-gray-600"></span>
          <span>{details.genres?.[0] || details.type || "Action"}</span>
          {details.type && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="uppercase tracking-wider text-brand border border-brand/30 bg-brand/10 px-2 py-0.5 rounded-sm text-xs">{details.type}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 mb-10 flex-wrap">
          <button 
            onClick={() => setShowDetails(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold uppercase tracking-wider border border-white/10 hover:border-white/30"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-white/20">
              <MovieImage src={details.poster} alt="" className="w-full h-full object-cover" />
            </div>
            Details
          </button>
          
          <button 
            onClick={() => setIsDownloadTrayOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold uppercase tracking-wider border border-white/10 hover:border-white/30"
          >
            <Download className="w-4 h-4" />
            Download
          </button>

          <button 
            onClick={() => {
              if (!user) {
                // In a real app, this would show a toast or notification
                console.log("Please sign in to use playlists.");
                navigate('/profile');
                return;
              }
              const playlistName = prompt('Enter playlist name (existing or new):');
              if (playlistName) {
                let playlist = customPlaylists?.find(p => p.name.toLowerCase() === playlistName.toLowerCase());
                if (!playlist) {
                  const newId = createPlaylist(playlistName);
                  if (newId) {
                    playlist = { id: newId, name: playlistName, items: [] };
                  }
                }
                if (playlist) {
                  addToPlaylist(playlist.id, {
                    id: details.id,
                    title: details.title,
                    poster: details.poster,
                    type: details.type,
                    year: details.year,
                    rating: details.rating
                  });
                  // In a real app, this would show a toast or notification
                  console.log(`Added to playlist: ${playlistName}`);
                }
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold uppercase tracking-wider border border-white/10 hover:border-white/30"
          >
            <ListVideo className="w-4 h-4" />
            Add to Playlist
          </button>

          <button 
            onClick={() => {
              if (!user) {
                // In a real app, this would show a toast or notification
                console.log("Please sign in to watch with friends.");
                navigate('/profile');
                return;
              }
              const roomLink = `${window.location.origin}/details/${details.id}?room=${Math.random().toString(36).substring(2, 9)}`;
              navigator.clipboard.writeText(roomLink);
              // In a real app, this would show a toast or notification
              console.log(`Room link copied to clipboard: ${roomLink}`);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold uppercase tracking-wider border border-white/10 hover:border-white/30"
          >
            <Users className="w-4 h-4" />
            Watch Party
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
                // In a real app, this would show a toast or notification
                console.log("Link copied to clipboard!");
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-sm font-bold uppercase tracking-wider border border-white/10 hover:border-white/30"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </div>

      {/* Episodes (if series) */}
      {details.type === "Series" && details.seasons && (
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-2 mb-10">
          <EpisodeSelector 
            seasons={details.seasons} 
            selectedSeason={selectedSeason} 
            selectedEpisode={selectedEpisode} 
            onEpisodeChange={handleEpisodeChange} 
          />
        </div>
      )}

      {/* Recommendations */}
      <div className="max-w-[1400px] mx-auto">
        <PosterGrid title="More film suggestions" items={recommendations.slice(0, 12)} />
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
                {details.cast.slice(0, 6).map((actor, idx) => (
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
          {details.type === "Series" && details.seasons && (
            <button
              onClick={handleDownloadSeason}
              disabled={isDownloadingSeason}
              className="flex items-center justify-center gap-2 p-5 bg-brand hover:bg-brand-hover text-white rounded-xl font-bold transition-colors mb-4 uppercase tracking-wider shadow-[0_0_20px_rgba(229,9,20,0.3)]"
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

            const downloadTargetUrl = source.downloadUrl || source.url;
            const isDownloading = downloadingUrl === downloadTargetUrl;
            const isHls = (source.downloadType || source.type) === 'hls';

            return (
              <button
                key={`${source.url}-${idx}`}
                onClick={() => handleDownload(downloadTargetUrl, source.quality)}
                disabled={downloadingUrl !== null || isHls}
                className={`flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand/50 rounded-xl transition-all group ${(downloadingUrl !== null && !isDownloading) || isHls ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-brand/20 group-hover:border-brand/50 group-hover:text-brand transition-all">
                    {isDownloading ? (
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
                      {isDownloading ? <span className="text-brand">Downloading... {downloadProgress}%</span> : `${estimatedSize} • ${(source.downloadType || source.type || 'mp4').toUpperCase()}`}
                    </p>
                  </div>
                </div>
                {isDownloading ? (
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
    </div>
  );
}
