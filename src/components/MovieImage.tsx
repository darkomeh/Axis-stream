import React from 'react';

interface MovieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  avgHueDark?: string;
  isHero?: boolean;
}

export const MovieImage: React.FC<MovieImageProps> = ({ 
  src, 
  alt, 
  fallback, 
  avgHueDark, 
  className,
  isHero = false,
  ...props 
}) => {
  // Try to use provided tint, fallback to a dark gray
  const bgTint = avgHueDark || '#1a1a1a';
  
  // Use raw direct URL
  const [currentSrc, setCurrentSrc] = React.useState(() => {
    const initial = src || fallback || '';
    // Force proxy for HTTP on HTTPS site to avoid mixed content blocks
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && initial.startsWith('http:')) {
      return `/api/image-proxy?url=${encodeURIComponent(initial)}`;
    }
    return initial;
  });

  React.useEffect(() => {
    const next = src || fallback || '';
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && next.startsWith('http:')) {
      setCurrentSrc(`/api/image-proxy?url=${encodeURIComponent(next)}`);
    } else {
      setCurrentSrc(next);
    }
  }, [src, fallback]);

  if (!currentSrc) {
    return (
      <div 
        className={`flex flex-col items-center justify-center text-gray-500 text-center p-4 ${className || ''}`}
        style={{ backgroundColor: bgTint }}
      >
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

  // Very lightweight pure HTML/CSS image component. 
  // Relies entirely on the browser's native lazy loading and decoding capabilities.
  // No React state delays for onLoad = fast scrolling!
  return (
    <div 
      className={`relative overflow-hidden ${className || ''}`} 
      style={{ backgroundColor: bgTint }}
    >
      <img
        src={currentSrc}
        alt={alt}
        className="w-full h-full object-cover transition-opacity duration-300"
        loading={isHero ? 'eager' : 'lazy'}
        decoding={isHero ? 'sync' : 'async'}
        fetchPriority={isHero ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.includes('/api/image-proxy')) {
            if (fallback && target.src !== fallback) {
              setCurrentSrc(fallback);
            }
          } else {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(target.src)}`;
            setCurrentSrc(proxyUrl);
          }
        }}
        {...props}
      />
    </div>
  );
};
