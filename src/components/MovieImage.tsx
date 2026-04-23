import React, { useState } from 'react';

interface MovieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
}

export const MovieImage: React.FC<MovieImageProps> = ({ src, alt, fallback, className, ...props }) => {
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useProxy, setUseProxy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  React.useEffect(() => {
    setError(false);
    setRetryCount(0);
    setUseProxy(src.includes('pbcdnw.aoneroom.com'));
    setIsLoaded(false);
  }, [src]);

  const handleError = () => {
    if (error) return; // Prevent infinite loops
    
    if (!useProxy && typeof src === 'string' && !src.startsWith('/api/')) {
      // Switch to proxy immediately on first error
      setUseProxy(true);
    } else if (retryCount < 3) {
      // If proxy also fails, try a few more times with a cache buster
      setRetryCount(prev => prev + 1);
    } else {
      setError(true);
    }
  };

  let finalSrc = typeof src === 'string' ? src : '';
  if (error || !finalSrc) {
    if (fallback) {
      finalSrc = fallback;
    } else {
      return (
        <div className={`bg-black/40 flex flex-col items-center justify-center text-gray-500 text-center p-4 ${className || ''}`}>
          <div className="w-8 h-8 mb-2 opacity-20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider opacity-40">No Image</span>
        </div>
      );
    }
  } else {
    const cacheBuster = retryCount > 0 ? `${finalSrc.includes('?') ? '&' : '?'}retry=${retryCount}` : '';
    if (useProxy) {
      // Use absolute URL to the API to ensure proxy works correctly when deployed.
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      finalSrc = `${baseUrl}/api/image-proxy?url=${encodeURIComponent(finalSrc + cacheBuster)}`;
    } else if (retryCount > 0) {
      finalSrc = finalSrc + cacheBuster;
    }
  }

  return (
    <div className={`relative overflow-hidden bg-black/40 ${className || ''}`}>
      {/* Shimmer Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 animate-pulse bg-white/5 flex items-center justify-center">
          <svg className="w-8 h-8 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      )}
      <img
        src={finalSrc}
        alt={alt}
        onError={handleError}
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        {...props}
      />
    </div>
  );
};
