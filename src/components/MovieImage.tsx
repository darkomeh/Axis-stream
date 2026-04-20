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

  React.useEffect(() => {
    setError(false);
    setRetryCount(0);
    setUseProxy(false);
  }, [src]);

  const handleError = () => {
    if (error) return; // Prevent infinite loops
    
    if (!useProxy && src && !src.startsWith('/api/')) {
      // Switch to proxy immediately on first error
      setUseProxy(true);
    } else if (retryCount < 3) {
      // If proxy also fails, try a few more times with a cache buster
      setRetryCount(prev => prev + 1);
    } else {
      setError(true);
    }
  };

  let finalSrc = src;
  if (error || !src) {
    if (fallback) {
      finalSrc = fallback;
    } else {
      return (
        <div className={`bg-white/5 flex flex-col items-center justify-center text-gray-500 text-center p-4 ${className || ''}`}>
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
    const cacheBuster = retryCount > 0 ? `${src.includes('?') ? '&' : '?'}retry=${retryCount}` : '';
    if (useProxy) {
      finalSrc = `/api/image-proxy?url=${encodeURIComponent(src + cacheBuster)}`;
    } else if (retryCount > 0) {
      finalSrc = src + cacheBuster;
    }
  }

  return (
    <div className={`relative overflow-hidden bg-white/5 ${className || ''}`}>
      <img
        src={finalSrc}
        alt={alt}
        onError={handleError}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        loading="lazy"
        {...props}
      />
    </div>
  );
};
