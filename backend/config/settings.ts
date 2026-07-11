export const config = {
  DOMAINS_TO_TEST: [
    "https://moviebox.pk",
    "https://moviebox.ph",
    "https://moviebox.co",
    "https://moviebox.pro",
  ],
  DEFAULT_SPORT: "football",
  DOMAIN_DISCOVERY_TIMEOUT: 3000,
  SCRAPE_TIMEOUT: 4000,
  REQUEST_TIMEOUT: 15000,
  MAX_RETRIES: 3,
  PREFETCH_AHEAD: 5,
  CACHE_MAX_SEGMENTS: 30,
  PLAYLIST_POLL_INTERVAL: 2000,
  SEGMENT_RETRY_ATTEMPTS: 3,
  RETRY_BACKOFF_BASE: 500, // ms
  STREAM_CHUNK_SIZE: 16384, // 16KB
  PROXY_SEGMENT_PREFIX: "/api/proxy/segment/",
  
  BROWSER_HEADERS: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
  },
  
  STREAM_HEADERS: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
    "Referer": "https://sportslivetoday.com/",
    "Origin": "https://sportslivetoday.com",
    "Connection": "keep-alive",
  }
};
