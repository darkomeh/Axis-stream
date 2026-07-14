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
        // 1. Warm up the local backend and proxy functions
        fetch('/api/health', { method: 'GET', keepalive: true }).catch(() => {});
        
        // 2. Preconnect to critical stream providers and the backup API
        const commonDomains = [
          'https://sports-api.trackerwanga254.workers.dev',
          'https://live-pull.aisports.mobi',
          'https://daddylive.stream',
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

        // 3. Dynamically fetch currently live matches and pre-warm their playlists
        // This warms up the proxies and fetches upstream manifests so players load instantly
        const response = await fetch('/api/matches/live');
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.matches)) {
            data.matches.forEach((match: any) => {
              const streamUrl = match.m3u8_url || match.streams?.[0]?.url;
              if (streamUrl) {
                // Determine proxy stream url
                let proxyUrl = streamUrl;
                if (streamUrl.includes('.m3u8')) {
                  if (streamUrl.includes('trackerwanga254.workers.dev/api/proxy/playlist')) {
                    proxyUrl = streamUrl;
                  } else if (streamUrl.includes('moviebox') || streamUrl.includes('live-pull') || streamUrl.includes('aisports.mobi')) {
                    proxyUrl = `https://sports-api.trackerwanga254.workers.dev/api/proxy/playlist?url=${encodeURIComponent(streamUrl)}`;
                  } else {
                    proxyUrl = `/api/proxy/playlist.m3u8?url=${encodeURIComponent(streamUrl)}`;
                  }
                }
                
                // Silently ping/fetch the stream manifest in background to warm it up
                fetch(proxyUrl, { method: 'GET', cache: 'no-cache' })
                  .then(() => console.log(`Successfully pre-warmed stream: ${match.home_team} vs ${match.away_team}`))
                  .catch(() => {});
              }
            });
          }
        }

      } catch (err) {
        console.warn('Background pinging soft fail:', err);
      }
    };

    // Delay slightly to not block initial render
    setTimeout(pingStreams, 3000);
    
    // Set up a heartbeat to keep connection alive
    const interval = setInterval(() => {
        fetch('/api/health', { method: 'GET', keepalive: true }).catch(() => {});
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return null; // Invisible component
};
