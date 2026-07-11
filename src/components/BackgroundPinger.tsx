import React, { useEffect, useRef } from 'react';

// This component silently pings stream sources in the background 
// immediately when the project starts, to warm up DNS, CDN caches, 
// and establish pre-connections, reducing initial buffering.
export const BackgroundPinger: React.FC = () => {
  const hasPinged = useRef(false);

  useEffect(() => {
    if (hasPinged.current) return;
    hasPinged.current = true;

    const pingStreams = async () => {
      try {
        // List of common CDNs or known stream endpoints to pre-warm
        // In a real scenario, this might fetch the live sports/TV schedule 
        // and ping the top 2-3 most active stream URLs.
        
        // For general warmup, we can ping our proxy endpoint lightly
        // This ensures the serverless function is "warm"
        fetch('/api/health', { method: 'GET', keepalive: true }).catch(() => {});
        
        // We can also create preconnect links for common stream providers
        const commonDomains = [
          'https://daddylive.stream',
          'https://1.1.1.1',
          'https://stream.muzi.net',
          'https://cloudflare-dns.com'
        ];

        commonDomains.forEach(domain => {
          const link = document.createElement('link');
          link.rel = 'preconnect';
          link.href = domain;
          link.crossOrigin = 'anonymous';
          document.head.appendChild(link);
          
          const dnsLink = document.createElement('link');
          dnsLink.rel = 'dns-prefetch';
          dnsLink.href = domain;
          document.head.appendChild(dnsLink);
        });

      } catch (err) {
        console.warn('Background pinging soft fail:', err);
      }
    };

    // Delay slightly to not block initial render
    setTimeout(pingStreams, 2000);
    
    // Set up a heartbeat to keep connection alive
    const interval = setInterval(() => {
        fetch('/api/health', { method: 'GET', keepalive: true }).catch(() => {});
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // Invisible component
};
