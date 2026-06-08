import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { movieService } from "../services/movieService";
import { ItemDetails, MediaData, MediaItem, formatDurationToHours, slugify } from "../types";
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

const uniqueCast = useMemo(() => {
if (!details || !Array.isArray(details.cast)) return [];
const acc: any[] = [];
details.cast.forEach((actor: any) => {
const existing = acc.find(a => 
(a.id && actor.id && String(a.id) === String(actor.id)) || 
(a.name && actor.name && a.name.toLowerCase() === actor.name.toLowerCase())
);
if (existing) {
if (actor.character && existing.character) {
const currentChars = existing.character.split('/').map((c: string) => c.trim());
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

 let resolvedId = id;
 if (id && (isNaN(Number(id)) || id.includes("-"))) {
  try {
   const searchTitle = id.replace(/-/g, " ");
   const searchResults = await movieService.search(searchTitle);
   if (searchResults && searchResults.length > 0) {
    const bestMatch = searchResults.find(m => 
     slugify(m.title) === id.toLowerCase()
    ) || searchResults[0];
    resolvedId = bestMatch.id;
   }
  } catch (e) {
   console.warn("Slug lookup failed, trying direct ID fetch", e);
  }
 }

 // Save to recently viewed
 try {
  localStorage.setItem('axis_last_viewed_id', resolvedId);
 } catch (e) {}

 const [itemDetails, itemRecs, itemRichDetails] = await Promise.all([
 movieService.getDetails(resolvedId),
 movieService.getRecommendations(resolvedId).catch(() => []),
 movieService.getRichDetails(resolvedId).catch(() => null)
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
 const savedProgress = continueWatching.find(i => i.id === resolvedId);
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
 const itemMedia = await movieService.getPlay(id, s, e, itemDetails.detailPath, itemDetails.title, itemDetails.year, itemDetails.type ? String(itemDetails.type) : undefined);
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
 }, [id, user?.id]); // FIX: Prevent full reload on heartbeat user change

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
 const itemMedia = await movieService.getPlay(id, s, e, details?.detailPath, details?.title, details?.year, details?.type ? String(details?.type) : undefined);
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
 <div className="min-h-screen flex flex-col items-center justify-center bg-transparent text-white">
 <button 
 onClick={handleBack}
 className="absolute top-8 left-6 p-3 glass-button rounded-full transition-colors flex items-center gap-2 text-white/50 hover:text-white z-50 shadow-lg"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <PopcornLoader />
 </div>
 );
 }

 if (error || !details) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-transparent text-white">
 <div className="text-center max-w-md px-4">
 <ErrorMessage 
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
 <div className="min-h-screen bg-transparent text-white pb-20 relative overflow-hidden" style={{ '--theme-color': details.avgHueDark || 'rgba(255,255,255,0.1)' } as React.CSSProperties}>
 {/* Immersive Background Glow */}
 <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen">
 <div className="absolute top-0 right-0 w-[80vw] h-[80vw] bg-[var(--theme-color)] rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-30 transition-all duration-1000" />
 <div className="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-[var(--theme-color)] rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3 opacity-20 transition-all duration-1000" />
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
 <div className="w-full aspect-video bg-black/40 backdrop-blur-3xl relative z-40 shadow-2xl backdrop-blur-xl" ref={playerRef}>
 {!user ? (
 <div className="w-full h-full flex flex-col items-center justify-center relative bg-black/40 backdrop-blur-3xl px-6 text-center border-b border-white/5 backdrop-blur-[20px]">
 <button 
 onClick={handleBack}
 className="absolute top-4 left-4 p-3 glass-button rounded-full transition-all flex items-center gap-2 text-white/50 hover:text-white z-50"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
 <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-current ml-1" />
 </div>
 <h2 className="text-fluid-2xl font-bold tracking-tight text-white mb-3">Stream {details.title}</h2>
 <p className="text-white/60 text-fluid-sm font-medium max-w-[400px] mb-8 leading-relaxed">Access high-quality streams, trailers and save your progress by signing in.</p>
 <button 
 onClick={() => navigate('/profile')}
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
 const itemMedia = await movieService.getPlay(subjectId, selectedSeason, selectedEpisode, details?.detailPath, details?.title, details?.year, details?.type ? String(details?.type) : undefined);
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
 className="absolute top-4 left-4 p-3 glass-button rounded-full transition-all flex items-center gap-2 text-white/50 hover:text-white z-50"
 >
 <ArrowLeft className="w-5 h-5" />
 </button>
 <PopcornLoader />
 </div>
 )}
 </div>

 {/* Content Info Section - Exact match to screenshot */}
 <div className="max-w-[1400px] mx-auto px-5 py-8 space-y-8">
 <div className="space-y-4">
 <div className="flex items-start justify-between gap-4">
 <h1 className="text-fluid-3xl font-bold tracking-tight text-white leading-[1.1] drop-shadow-md flex-1">
 {details.title}
 </h1>
 <button 
 onClick={toggleWatchlist}
 className={`p-3.5 rounded-full transition-all flex-none border shadow-[0_4px_16px_rgba(0,0,0,0.4)] h-fit ${isInWatchlist(details.id) ? 'bg-white text-black border-transparent' : 'glass-button text-white border-white/20 hover:bg-white/10'}`}
 >
 <div className="transform scale-100">
 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={isInWatchlist(details.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
 </div>
 </button>
 </div>
 
 <div className="flex flex-col gap-4">
 <div className="flex flex-wrap items-center gap-3 text-fluid-sm font-semibold text-white/70">
 <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-3xl px-2 py-0.5 rounded-[6px] text-white text-fluid-sm font-bold border border-white/10 shadow-lg">
 <Star className="w-3.5 h-3.5 text-white/90 fill-current" />
 <span>{details.imdbRatingValue || details.rating || '5.0'}</span>
 </div>
 
 {details.year && <span className="">{details.year}</span>}
 <span className="text-white/20 font-semibold">•</span>
 {details.duration && <span className="">{formatDurationToHours(details.duration)}</span>}
 <span className="text-white/20 font-semibold">•</span>
 <span className=" tracking-wide font-bold text-fluid-sm">{details.type || 'Movie'}</span>
 </div>
 </div>
 </div>

 {/* Action Buttons Row - Scrollable on mobile to prevent stacking */}
 <div className="flex overflow-x-auto hide-scrollbar gap-3 md:gap-4 py-2 -mx-5 px-5">
 <button 
 onClick={() => setShowDetails(true)}
 className="flex items-center gap-2 px-5 py-2.5 glass-button rounded-full transition-all flex-shrink-0 active:scale-95 group"
 >
 <Info className="w-4 h-4 text-white/70 group-hover:text-white" />
 <span className="text-fluid-base font-semibold tracking-wide">Details</span>
 </button>
 <button 
 onClick={() => setIsDownloadTrayOpen(true)}
 className="flex items-center gap-2 px-5 py-2.5 glass-button rounded-full transition-all flex-shrink-0 active:scale-95 group"
 >
 <Download className="w-4 h-4 text-white/70 group-hover:text-white" />
 <span className="text-fluid-base font-semibold tracking-wide">Download</span>
 </button>
 <button 
 onClick={toggleWatchlist}
 className="flex items-center gap-2 px-5 py-2.5 glass-button rounded-full transition-all flex-shrink-0 active:scale-95 group"
 >
 <Plus className="w-4 h-4 text-white/70 group-hover:text-white" />
 <span className="text-fluid-base font-semibold tracking-wide">Playlist</span>
 </button>
 <button 
 onClick={() => handleShare()}
 className="flex items-center gap-2 px-5 py-2.5 glass-button rounded-full transition-all flex-shrink-0 active:scale-95 group"
 >
 <Share2 className="w-4 h-4 text-white/70 group-hover:text-white" />
 <span className="text-fluid-base font-semibold tracking-wide">Share</span>
 </button>
 </div>

 {/* Episodes Section - vertical orientation */}
 {details.type === "Series" && (
 <div className="pt-10 border-t border-white/10">
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
 <div className="pt-12 space-y-6 border-t border-white/10">
 <div className="flex items-center justify-between">
 <h2 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-md">More Like This</h2>
 </div>
 
 <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 hide-scrollbar snap-x snap-mandatory">
 {recommendations.slice(0, 10).map((item, index) => (
 <div 
 key={`${item.id}-${index}`} 
 onClick={() => {
 navigate(`/details/${item.id}`);
 window.scrollTo(0, 0);
 }}
 className="flex-none w-[130px] md:w-[180px] snap-start group space-y-3 cursor-pointer"
 >
 <div className="aspect-[2/3] rounded-[16px] overflow-hidden bg-white/5 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 transition-all duration-500 group-hover:scale-105 group-hover:border-white/30 group-hover:shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
 <MovieImage 
 src={item.poster} 
 alt={item.title} 
 className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
 
 {/* Glass Rating Badge on Poster bottom left as per screenshot */}
 {item.rating && (
 <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-3xl px-1.5 py-0.5 rounded-[6px] text-white shadow-lg border border-white/10">
 <Star className="w-2.5 h-2.5 text-white fill-current" />
 <span className="font-bold drop-shadow-sm text-fluid-sm">{item.rating || '5.0'}</span>
 </div>
 )}
 </div>
 <div className="px-1">
 <h4 className="font-semibold text-white tracking-tight truncate group-hover:text-white transition-colors mb-0.5 text-fluid-base">{item.title}</h4>
 <div className="flex items-center gap-1.5 font-medium text-white/50 tracking-wide text-fluid-sm">
 <span>{item.year || '2024'}</span>
 {item.type === 'Series' && <span className="text-white/40">• Series</span>}
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Stills & Trailer Section - Simplified gallery */}
 <div className="pt-10 mb-8 space-y-6 border-t border-white/10">
 <h2 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-md">Stills & Trailer</h2>
 <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6">
 {details.images && details.images.length > 0 && (
 <div 
 className="relative flex-none w-[280px] aspect-video rounded-[16px] overflow-hidden bg-white/5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] group cursor-pointer transition-all hover:scale-[1.02] hover:border-white/30"
 onClick={() => {
 openPreview(details.id);
 }}
 >
 <MovieImage src={details.images[0]} alt="Trailer thumbnail" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700 group-hover:scale-105" />
 <div className="absolute inset-0 flex items-center justify-center">
 <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-[20px] border border-white/30 flex items-center justify-center transform transition-transform group-hover:scale-110 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
 <Play className="w-5 h-5 text-white fill-current ml-1" />
 </div>
 </div>
 <div className="absolute bottom-3 left-3 flex flex-col">
 <span className="text-fluid-sm font-bold tracking-wide text-white/80 drop-shadow-md">Trailer</span>
 </div>
 </div>
 )}

 {details.images?.slice(1, 8).map((img, i) => (
 <div 
 key={i} 
 onClick={() => openPreview(details.id)}
 className="flex-none w-[280px] aspect-video rounded-[16px] overflow-hidden bg-white/5 border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative group cursor-pointer transition-all hover:scale-[1.02] hover:border-white/30"
 >
 <MovieImage src={img} alt={`Still ${i}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
 <div className="absolute bottom-3 left-3 flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-500">
 <span className="text-fluid-sm font-bold tracking-wide text-white/80 drop-shadow-md">Still {i + 1}</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>


 {/* Trays */}
 <Tray isOpen={showDetails} onClose={() => setShowDetails(false)} title="Details">
 <div className="space-y-6">
 <p className="text-white/80 leading-relaxed text-fluid-lg font-normal">{details.description}</p>
 
 {/* Series Info in Details Tray */}
 {details.type === "Series" && details.seasons && (
 <div className="pt-6 border-t border-white/10 space-y-4">
 <h3 className="text-fluid-lg font-semibold tracking-wide">Series Information</h3>
 <div className="grid grid-cols-2 gap-3">
 <div className="bg-white/5 p-4 rounded-[16px] border border-white/10 shadow-sm">
 <p className="text-fluid-sm text-white/50 font-semibold mb-1 tracking-wide">Total Seasons</p>
 <p className="text-fluid-2xl font-semibold text-white">{details.seasons.length}</p>
 </div>
 <div className="bg-white/5 p-4 rounded-[16px] border border-white/10 shadow-sm">
 <p className="text-fluid-sm text-white/50 font-semibold mb-1 tracking-wide">Total Episodes</p>
 <p className="text-fluid-2xl font-semibold text-white">
 {details.seasons.reduce((acc, s) => acc + s.maxEp, 0)}
 </p>
 </div>
 </div>
 <div className="space-y-3">
 <p className="text-fluid-sm text-white/50 font-semibold tracking-wide">Seasons Breakdown</p>
 <div className="flex flex-wrap gap-2">
 {details.seasons.map((s) => (
 <div key={s.se} className="px-3 py-1.5 glass-button border border-white/10 rounded-full text-fluid-base font-medium text-white/80 shadow-sm">
 Season {s.se}: <span className="text-white/50 ml-1">{s.maxEp} Episodes</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}
 
 {/* Cast Section in Details Tray */}
 {Array.isArray(uniqueCast) && uniqueCast.length > 0 && (
 <div className="pt-6 border-t border-white/10">
 <h3 className="text-fluid-lg font-semibold mb-4 tracking-wide">Top Cast</h3>
 <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
 {Array.isArray(uniqueCast) && uniqueCast.slice(0, 8).map((actor, idx) => (
 <div key={`${actor.id}-${idx}`} className="flex-shrink-0 w-20 text-center group">
 <div className="w-20 h-20 rounded-full overflow-hidden mb-2 bg-white/5 border border-white/10 group-hover:border-white/30 transition-all shadow-md">
 <SmartActorImage 
 staffId={actor.id?.toString()}
 initialAvatar={actor.avatarUrl || actor.avatar || ""} 
 alt={actor.name} 
 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
 />
 </div>
 <p className="text-fluid-sm text-white font-medium line-clamp-1 group-hover:text-white transition-colors leading-tight">{actor.name}</p>
{actor.character && (
<p className="text-gray-500 font-bold mt-0.5 tracking-tight leading-tight whitespace-normal break-words line-clamp-1 text-fluid-xs">
as {actor.character}
</p>
)}
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
 title="Share with friends"
 >
 <div className="flex flex-col items-center gap-6 p-2 text-center">
 <div className="flex gap-4 w-full justify-center">
 {[
 { name: 'Twitter', icon: '🐦', platform: 'twitter', color: 'bg-white/10 border-white/20' },
 { name: 'Facebook', icon: 'f', platform: 'facebook', color: 'bg-white/10 border-white/20' },
 { name: 'WhatsApp', icon: '💬', platform: 'whatsapp', color: 'bg-white/10 border-white/20 text-[#25D366]' },
 ].map(social => (
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
 <MovieImage src={details.poster} alt={details.title} className="w-full h-full object-cover" />
 </div>
 
 <div className="space-y-1">
 <h3 className="text-fluid-xl font-bold tracking-tight text-white drop-shadow-md">Shared Successfully!</h3>
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

 <Tray isOpen={isDownloadTrayOpen} onClose={() => setIsDownloadTrayOpen(false)} title="Download Options">
 <div className="grid grid-cols-1 gap-3">
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
 className={`flex items-center justify-between p-4 glass-button border border-white/10 rounded-[16px] transition-all group shadow-sm ${isHls ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/10 hover:border-white/30 active:scale-[0.98]'}`}
 >
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-[14px] bg-white/10 border border-white/10 flex items-center justify-center text-white/70 group-hover:scale-105 group-hover:bg-white/20 group-hover:border-white/30 group-hover:text-white transition-all shadow-md">
 <Film className="w-5 h-5" />
 </div>
 <div className="text-left">
 <p className="font-semibold text-white text-fluid-lg">{source.quality}</p>
 <p className="text-fluid-sm text-white/50 tracking-wide mt-0.5 font-medium">
 <span className="flex items-center gap-1.5">
 {dlSize || "Checking Size..."}
 <span className="text-white/20">•</span>
 {(source.downloadType || source.type || 'mp4').toUpperCase()}
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
