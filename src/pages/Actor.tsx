import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { movieService } from "../services/movieService";
import { Actor, MediaItem } from "../types";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PosterGrid from "../components/PosterGrid";
import PopcornLoader from "../components/PopcornLoader";
import { ChevronRight, User, Film, Star, Share2, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

import { MovieImage } from "../components/MovieImage";

export default function ActorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [actor, setActor] = useState<Actor | null>(null);
  const [works, setWorks] = useState<MediaItem[]>([]);
  const [relatedActors, setRelatedActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const loadActor = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const [actorData, worksData, relatedData] = await Promise.all([
          movieService.getActorDetails(id),
          movieService.getActorWorks(id, 1),
          movieService.getRelatedActors(id)
        ]);
        setActor(actorData);
        setWorks(worksData);
        setRelatedActors(relatedData);
        setHasMore(worksData.length >= 24);
      } catch (e) {
        console.error("Failed to load actor data", e);
      } finally {
        setLoading(false);
      }
    };
    loadActor();
  }, [id]);

  useEffect(() => {
    if (page > 1 && id) {
      const loadMore = async () => {
        try {
          setLoadingMore(true);
          const data = await movieService.getActorWorks(id, page);
          if (data.length === 0) {
            setHasMore(false);
          } else {
            setWorks(prev => [...prev, ...data]);
          }
        } catch (err) {
          console.error("Error loading more actor works:", err);
        } finally {
          setLoadingMore(false);
        }
      };
      loadMore();
    }
  }, [page, id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
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

  if (!actor) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-bold mb-4">Actor not found</h2>
        <Link to="/" className="px-8 py-3 bg-white text-black font-bold rounded-full">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative pt-28 pb-12 px-6 lg:px-12 max-w-[1400px] mx-auto">
        <button 
          onClick={handleBack}
          className="mb-8 p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex flex-col md:flex-row gap-12 items-start">
          {/* Actor Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full md:w-80 flex-shrink-0"
          >
            <div className="aspect-[3/4] rounded-[2.5rem] overflow-hidden border-4 border-white/10 shadow-2xl relative group">
              {actor.avatarUrl || actor.avatar ? (
                <MovieImage 
                  src={actor.avatarUrl || actor.avatar || ""} 
                  alt={actor.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>

          {/* Actor Info */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                <User className="w-4 h-4" />
                <span>Actor Profile</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter">{actor.name}</h1>
              <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-400">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-brand fill-brand" />
                  <span>Popularity: {actor.popularity}</span>
                </div>
                <div className="w-1 h-1 bg-white/20 rounded-full" />
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  <span>{works.length} Works</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-bold uppercase tracking-widest text-xs text-gray-500">Biography</h3>
              <p className="text-lg text-gray-300 leading-relaxed line-clamp-6 md:line-clamp-none">
                {actor.biography || `${actor.name} is a talented actor known for their roles in various movies and series. Their contribution to the film industry has been significant, earning them a place among the most recognized names in entertainment.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filmography */}
      <div className="px-6 lg:px-12 max-w-[1400px] mx-auto py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Filmography</h2>
          <div className="flex items-center gap-2 text-gray-500 text-sm font-bold uppercase tracking-widest">
            <span>{works.length} Items</span>
          </div>
        </div>
        <PosterGrid items={works} variant="grid" />
        
        {hasMore && (
          <div ref={lastElementRef} className="flex justify-center pt-12 h-20">
            {loadingMore && (
              <div className="flex items-center gap-3 text-brand">
                <Film className="w-5 h-5 animate-spin" />
                <span className="text-sm font-black uppercase tracking-widest">Fetching more works...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related Actors */}
      {relatedActors.length > 0 && (
        <div className="px-6 lg:px-12 max-w-[1400px] mx-auto py-12">
          <h2 className="text-3xl font-bold mb-8 tracking-tight">Related Actors</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {relatedActors.map((rel, idx) => (
              <Link 
                key={`${rel.id}-${idx}`} 
                to={`/actor/${rel.id}`}
                className="group space-y-4"
              >
                <div className="aspect-square rounded-full overflow-hidden border-2 border-white/10 group-hover:border-brand group-hover:shadow-[0_0_15px_rgba(229,9,20,0.4)] group-hover:scale-105 transition-all duration-500">
                  {rel.avatar ? (
                    <MovieImage 
                      src={rel.avatar} 
                      alt={rel.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-gray-500">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-sm group-hover:text-white transition-colors">{rel.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
