import React, { useState, useEffect } from 'react';
import { MovieImage } from './MovieImage';
import { movieService } from '../services/movieService';

interface SmartActorImageProps {
  staffId: string;
  initialAvatar?: string;
  alt: string;
  className?: string;
}

// Simple in-memory cache to prevent multiple fetches for the same actor
const actorCache = new Map<string, string>();
// Circuit breaker: if the detail API fails, stop trying for a while
let isServiceShaky = false;
let lastErrorTime = 0;
const SHAKY_TTL = 30000; // 30 seconds

export const SmartActorImage: React.FC<SmartActorImageProps> = ({ 
  staffId, 
  initialAvatar, 
  alt, 
  className 
}) => {
  const [src, setSrc] = useState<string>(initialAvatar || '');
  const [loading, setLoading] = useState<boolean>(!initialAvatar);

  useEffect(() => {
    const fetchBetterImage = async () => {
      // If we already have a functional URL, don't hunt for a "better" one if API is unstable
      if (src && src.startsWith('http')) {
        setLoading(false);
        return;
      }

      // Circuit breaker check
      if (isServiceShaky && Date.now() - lastErrorTime < SHAKY_TTL) {
        setLoading(false);
        return;
      }

      if (actorCache.has(staffId)) {
        setSrc(actorCache.get(staffId)!);
        setLoading(false);
        return;
      }

      try {
        const details = await movieService.getActorDetails(staffId);
        if (details && details.avatar) {
          const betterSrc = details.avatar;
          actorCache.set(staffId, betterSrc);
          setSrc(betterSrc);
        }
      } catch (err) {
        console.warn("Detail API is unstable, activating circuit breaker.");
        isServiceShaky = true;
        lastErrorTime = Date.now();
      } finally {
        setLoading(false);
      }
    };

    fetchBetterImage();
  }, [staffId, src]);

  if (loading) {
     return <div className={`animate-pulse bg-white/10 ${className}`} />;
  }

  return (
    <MovieImage 
      src={src} 
      alt={alt} 
      className={className} 
      fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(alt)}&background=1a1a1a&color=fff`}
    />
  );
};
