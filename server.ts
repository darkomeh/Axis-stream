import express from "express";
import compression from "compression";
import path from "path";
import { externalMovieService, setApiSource } from "./src/services/externalMovieService";
import axios from "axios";
import fs from "fs";
import os from "os";

const app = express();
app.use(compression());
app.use(express.json());

// Diagnostic endpoint early
app.get("/api/server-health", (req, res) => {
  try {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version
    });
  } catch (err) {
    res.status(500).json({ status: "error", error: String(err) });
  }
});

// User Persistence (Simple JSON storage)
const USERS_FILE = path.join(process.cwd(), "users.json");
const ADMIN_STATE_FILE = path.join(process.cwd(), "admin_state.json");

interface AdminState {
  maintenanceMode: boolean;
  broadcastMessage: string | null;
  broadcastLevel: 'info' | 'warning' | 'critical';
  bannedEmails: string[];
  auditLogs: { id: string, timestamp: string, type: string, detail: string }[];
  searchLogs: { query: string, timestamp: string, userId?: string }[];
  featuredMedia: string[]; // List of subjectIds to feature
  siteConfig: {
    siteName: string;
    brandColor: string;
    tagline: string;
    logoUrl?: string;
    allowGuestBrowsing: boolean;
    apiSource?: 'main' | 'backup';
  };
  reports: { id: string, userId: string, category: string, detail: string, timestamp: string, status: 'open' | 'closed' }[];
}

let adminState: AdminState = {
  maintenanceMode: false,
  broadcastMessage: null,
  broadcastLevel: 'info',
  bannedEmails: [],
  auditLogs: [],
  searchLogs: [],
  featuredMedia: [],
  siteConfig: {
    siteName: "Axis TV",
    brandColor: "#E50914",
    tagline: "The Ultimate Streaming Experience",
    logoUrl: "https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg",
    allowGuestBrowsing: true,
    apiSource: 'main',
  },
  reports: []
};

function loadAdminState() {
  try {
    if (fs.existsSync(ADMIN_STATE_FILE)) {
      const stored = JSON.parse(fs.readFileSync(ADMIN_STATE_FILE, "utf-8"));
      adminState = { 
        ...adminState, 
        ...stored,
        // Ensure nested objects default correctly if partially missing from old saves
        siteConfig: { ...adminState.siteConfig, ...(stored.siteConfig || {}) }
      };
    }
  } catch (e) {
    console.error("Error loading admin state:", e);
  }
}

function saveAdminState() {
  fs.writeFileSync(ADMIN_STATE_FILE, JSON.stringify(adminState, null, 2));
}

function logAction(type: string, detail: string) {
  adminState.auditLogs.unshift({
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    type,
    detail
  });
  adminState.auditLogs = adminState.auditLogs.slice(0, 100);
  saveAdminState();
}

loadAdminState();
setApiSource(adminState.siteConfig?.apiSource || 'main');

// Global process error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

function getUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading users file:", e);
  }
  return [];
}

function saveUser(user: any) {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  if (existingIndex > -1) {
    users[existingIndex] = { ...users[existingIndex], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push({ ...user, createdAt: new Date().toISOString() });
  }
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Simple in-memory cache
const cache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes for static-ish lists

function getCached(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCached(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// API Routes using externalMovieService
app.get("/api/homepage", async (req, res) => {
  const cacheKey = "homepage";
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.getHomepage();
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Homepage error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/trending", async (req, res) => {
  const { page, perPage } = req.query;
  const cacheKey = `trending_${page}_${perPage}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.getTrending(Number(page) || 1, Number(perPage) || 18);
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Trending error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Aggregated endpoint to reduce client-side requests
app.get("/api/aggregated-popular", async (req, res) => {
  const cacheKey = "aggregated_popular";
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const [trending, hot, ranking, homepage] = await Promise.all([
      externalMovieService.getTrending(1, 50).catch(() => []),
      externalMovieService.getHot().catch(() => ({ movies: [], series: [] })),
      externalMovieService.getRanking().catch(() => []),
      externalMovieService.getHomepage().catch(() => ({}))
    ]);

    const data = { trending, hot, ranking, homepage };
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Aggregated data error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  const { keyword, page, perPage, subjectType } = req.query;
  const cacheKey = `search_${keyword}_${page}_${perPage}_${subjectType}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.search(
      String(keyword || ""),
      Number(page) || 1,
      Number(perPage) || 10,
      req.query.subjectType !== undefined ? Number(req.query.subjectType) : 0
    );
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Search error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/popular-search", async (req, res) => {
  try {
    const data = await externalMovieService.getPopularSearch();
    res.json(data);
  } catch (error: any) {
    console.error("[API] Popular search error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/hot", async (req, res) => {
  const cacheKey = "hot";
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.getHot();
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Hot error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/search/suggest", async (req, res) => {
  const { keyword } = req.query;
  const cacheKey = `suggest_${keyword}`;
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.getSuggestions(String(keyword || ""));
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Suggestions error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/detail", async (req, res) => {
  try {
    const { subjectId } = req.query;
    const data = await externalMovieService.getDetails(String(subjectId || ""));
    res.json(data);
  } catch (error: any) {
    console.error("[API] Detail error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/rich-detail", async (req, res) => {
  try {
    const { subjectId } = req.query;
    const data = await externalMovieService.getRichDetails(String(subjectId || ""));
    res.json(data);
  } catch (error: any) {
    console.error("[API] Rich detail error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/recommend", async (req, res) => {
  try {
    const { subjectId, page, perPage } = req.query;
    const data = await externalMovieService.getRecommendations(
      String(subjectId || ""),
      Number(page) || 1,
      Number(perPage) || 10
    );
    res.json(data);
  } catch (error: any) {
    console.error("[API] Recommend error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/browse", async (req, res) => {
  try {
    const { genre, countryName, page, perPage, subjectType } = req.query;
    const data = await externalMovieService.browse(
      genre ? String(genre) : undefined,
      countryName ? String(countryName) : undefined,
      Number(page) || 1,
      Number(perPage) || 12,
      Number(subjectType) || 2
    );
    res.json(data);
  } catch (error: any) {
    console.error("[API] Browse error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/ranking", async (req, res) => {
  const cacheKey = "ranking";
  const cachedData = getCached(cacheKey);
  if (cachedData) return res.json(cachedData);

  try {
    const data = await externalMovieService.getRanking();
    setCached(cacheKey, data);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Ranking error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const tmdbCache = new Map<string, string>();

async function resolveTmdbId(title: string, year: string, type: string): Promise<string | null> {
  const normTitle = title.replace(/\[netflix\]/gi, '').trim();
  const searchTitle = normTitle.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const cacheKey = `${searchTitle}-${year || ''}-${type}`.toLowerCase().trim();
  
  if (tmdbCache.has(cacheKey)) {
    return tmdbCache.get(cacheKey)!;
  }
  
  try {
    const isSeries = type.toLowerCase() === 'series' || type.toLowerCase() === 'tv';
    const tmdbType = isSeries ? 'tv' : 'movie';
    const TMDB_API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb'; // Fallback free tier key
    
    // TMDB Search API
    const params: any = {
      api_key: TMDB_API_KEY,
      query: searchTitle,
      page: 1,
      include_adult: false
    };
    
    if (year) {
      if (isSeries) {
        params.first_air_date_year = year;
      } else {
        params.primary_release_year = year;
        params.year = year;
      }
    }

    const searchUrl = `https://api.themoviedb.org/3/search/${tmdbType}`;
    const res = await axios.get(searchUrl, { params, timeout: 5000 });
    
    if (res.data && res.data.results && res.data.results.length > 0) {
      const resolvedId = String(res.data.results[0].id);
      tmdbCache.set(cacheKey, resolvedId);
      console.log(`[TMDB Resolver API] Successfully resolved ${searchTitle} to TMDb ID: ${resolvedId}`);
      return resolvedId;
    }
    
    // Fallback if year was too strict
    if (year) {
      const fallbackParams = { ...params };
      delete fallbackParams.first_air_date_year;
      delete fallbackParams.primary_release_year;
      delete fallbackParams.year;
      
      const fallbackRes = await axios.get(searchUrl, { params: fallbackParams, timeout: 5000 });
      if (fallbackRes.data && fallbackRes.data.results && fallbackRes.data.results.length > 0) {
        const resolvedId = String(fallbackRes.data.results[0].id);
        tmdbCache.set(cacheKey, resolvedId);
        console.log(`[TMDB Resolver API] Successfully resolved ${searchTitle} (w/o year) to TMDb ID: ${resolvedId}`);
        return resolvedId;
      }
    }

    
  } catch (err: any) {
    console.error(`[TMDB Resolver] Failed for ${searchTitle}:`, err.message);
  }
  return null;
}

app.get("/api/play", async (req, res) => {
  try {
    const { subjectId, detailPath, se, ep, title, year, type } = req.query;
    const data = await externalMovieService.getPlay(
      String(subjectId || ""),
      detailPath ? String(detailPath) : undefined,
      se ? Number(se) : undefined,
      ep ? Number(ep) : undefined
    );
    
    // Dynamically resolve TMDb ID and construct the clean, ad-free sandboxed embedUrl
    try {
      const sId = String(subjectId || "");
      let resolvedTmdbId = "";
      let mediaType = type ? String(type).toLowerCase() : "movie";
      const seasonNum = se ? Number(se) : 1;
      const episodeNum = ep ? Number(ep) : 1;
      
      if (sId) {
        // Option 1: Try TMDB Resolver with provided title/year
        if (title) {
           const tmdbId = await resolveTmdbId(String(title), year ? String(year) : "", mediaType === "series" ? "Series" : "Movie");
           if (tmdbId) resolvedTmdbId = tmdbId;
        }

        // Option 2: Fallback to getDetails
        if (!resolvedTmdbId) {
          const details = await externalMovieService.getDetails(sId);
          if (details && details.title && details.title !== "Content Unavailable") {
            mediaType = details.type === "Series" ? "series" : "movie";
            const tmdbId = await resolveTmdbId(details.title, details.year || "", details.type === "Series" ? "Series" : "Movie");
            if (tmdbId) resolvedTmdbId = tmdbId;
          }
        }
        
        // Option 3: Extract from upstream embedUrl
        if (!resolvedTmdbId && data.embedUrl && data.embedUrl.includes('vidsrc')) {
           const match = data.embedUrl.match(/\/embed\/(movie|tv)\/([a-zA-Z0-9_-]+)/);
           if (match) {
             mediaType = match[1];
             resolvedTmdbId = match[2];
           }
        }
        
        // Option 4: Fallback assuming subjectId is tmdbId
        if (!resolvedTmdbId) {
          resolvedTmdbId = sId;
        }
        
        if (resolvedTmdbId) {
            data.tmdbId = resolvedTmdbId;
            data.type = mediaType;
            
            // Try extracting servers from vidsrc.wiki
            let vidsrcServers = [];
            try {
              const url = `https://vidsrc.wiki/embed/${data.type}/${resolvedTmdbId}`;
              const pRes = await axios.get(url, {timeout: 5000});
              const match = pRes.data.match(/var CFG\s*=\s*(.*?);function/);
              if (match) {
                const cfg = new Function('return ' + match[1])();
                if (cfg && cfg.servers) {
                  vidsrcServers = cfg.servers.map((s: any) => ({
                    id: s.id || s.name,
                    name: s.name,
                    url: data.type === 'series' 
                      ? s.tv_url.replace('{tmdb_id}', resolvedTmdbId).replace('{season}', seasonNum).replace('{episode}', episodeNum)
                      : s.movie_url.replace('{tmdb_id}', resolvedTmdbId)
                  }));
                }
              }
            } catch (err) {
              console.warn('[TMDB Resolver] Could not fetch vidsrc servers');
            }
            
            if (vidsrcServers.length > 0) {
              data.vidsrcServers = vidsrcServers;
              data.embedUrl = vidsrcServers[0].url;
            } else {
              data.embedUrl = (mediaType === "series"
                ? `https://vidzen.fun/tv/${resolvedTmdbId}/${seasonNum}/${episodeNum}`
                : `https://vidzen.fun/movie/${resolvedTmdbId}`);
            }
            
            // Use the first server as the fallback embedCode
            data.embedCode = `<iframe src="${data.embedUrl}" width="100%" height="100%" frameborder="0" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"></iframe>`;
            
            console.log(`[TMDB Resolver] Overwrote embedUrl: ${data.embedUrl}, type: ${data.type}, tmdbId: ${data.tmdbId}`);
        }
      }
    } catch (e: any) {
      console.warn("[TMDB Resolver] Warning: Failed to fetch item details for TMDB resolution:", e.message);
    }
    
    res.json(data);
  } catch (error: any) {
    console.error("[API] Play error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/verify-embed", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.json({ valid: false });
  try {
    const response = await axios.get(String(url), { 
      timeout: 3000, 
      validateStatus: () => true 
    });
    const html = (typeof response.data === 'string' ? response.data.toLowerCase() : '');
    const isBad = response.status >= 400 || 
                  html.includes('<title>404</title>') || 
                  html.includes('<title>not found</title>') || 
                  html.includes('page not found') ||
                  html.includes('this page could not be found') ||
                  html.includes('error 404');
    
    // Some embedders like vidzen explicitly write "404 - Not Found" or similar in the document
    if (html.includes('404 - not found') || html.includes('not found') && html.length < 5000) {
       return res.json({ valid: false });
    }
    
    res.json({ valid: !isBad });
  } catch (err: any) {
    res.json({ valid: false, error: err.message });
  }
});

app.get("/api/captions", async (req, res) => {
  try {
    const { subjectId, streamId } = req.query;
    const data = await externalMovieService.getCaptions(String(subjectId || ""), String(streamId || ""));
    res.json(data);
  } catch (error: any) {
    console.error("[API] Captions error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/staff/detail", async (req, res) => {
  try {
    const { staffId } = req.query;
    if (!staffId) return res.status(400).json({ success: false, error: "staffId is required" });
    
    const data = await externalMovieService.getActorDetails(String(staffId));
    res.json(data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    console.log(`[API Proxy] Staff detail handled downstream status ${status} gracefully. staffId: ${req.query.staffId}`);
    
    // Return a skeleton actor instead of failing to allow UI to continue
    return res.json({
      id: String(req.query.staffId || ""),
      name: "Biography Unavailable",
      avatar: "",
      description: "The biography details are currently unavailable from our data provider. Please try again later.",
      biography: "The biography details are currently unavailable from our data provider. Please try again later.",
      popularity: 0
    });
  }
});

app.get("/api/staff/works", async (req, res) => {
  try {
    const { staffId, page, perPage } = req.query;
    const data = await externalMovieService.getActorWorks(
      String(staffId || ""),
      Number(page) || 1,
      Number(perPage) || 24
    );
    res.json(data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    console.log(`[API Proxy] Actor works handled downstream status ${status} gracefully. staffId: ${req.query.staffId}`);
    return res.json([]); // Return empty list instead of error
  }
});

app.get("/api/staff/related", async (req, res) => {
  try {
    const { staffId } = req.query;
    const data = await externalMovieService.getRelatedActors(String(staffId || ""));
    res.json(data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    console.log(`[API Proxy] Related actors handled downstream status ${status} gracefully. staffId: ${req.query.staffId}`);
    return res.json([]); // Return empty list instead of error
  }
});



// Image Cache Directory
const IMG_CACHE_DIR = path.join(os.tmpdir(), "axis-img-cache");
if (!fs.existsSync(IMG_CACHE_DIR)) {
  fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });
}

// Helper to get cached image
function getCachedImage(url: string): { buffer: Buffer, contentType: string } | null {
  try {
    const hash = Buffer.from(url).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 100);
    const cachePath = path.join(IMG_CACHE_DIR, hash);
    const metaPath = cachePath + ".json";
    
    if (fs.existsSync(cachePath) && fs.existsSync(metaPath)) {
      const stats = fs.statSync(cachePath);
      // Cache images for 7 days
      if (Date.now() - stats.mtimeMs < 7 * 24 * 60 * 60 * 1000) {
        const buffer = fs.readFileSync(cachePath);
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        return { buffer, contentType: meta.contentType };
      }
    }
  } catch (e) {
    console.warn("[Image Proxy] Cache read error:", e);
  }
  return null;
}

function setCachedImage(url: string, buffer: Buffer, contentType: string) {
  try {
    const hash = Buffer.from(url).toString('base64').replace(/\//g, '_').replace(/\+/g, '-').substring(0, 100);
    fs.writeFileSync(path.join(IMG_CACHE_DIR, hash), buffer);
    fs.writeFileSync(path.join(IMG_CACHE_DIR, hash + ".json"), JSON.stringify({ contentType }));
  } catch (e) {
    console.warn("[Image Proxy] Cache write error:", e);
  }
}

// Image Proxy Route
app.get("/api/image-proxy", async (req, res) => {
  let imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send("URL is required");
  }

  // Prevent recursive or nested proxying (e.g. from weserv.nl, wsrv.nl, or other proxy headers)
  let attempts = 0;
  while (attempts < 5 && (imageUrl.includes("weserv.nl") || imageUrl.includes("wsrv.nl") || imageUrl.includes("/api/image-proxy"))) {
    attempts++;
    const urlParamIndex = imageUrl.indexOf("url=");
    if (urlParamIndex !== -1) {
      let rawUrl = imageUrl.substring(urlParamIndex + 4);
      const ampersandIndex = rawUrl.indexOf("&");
      if (ampersandIndex !== -1) {
        rawUrl = rawUrl.substring(0, ampersandIndex);
      }
      imageUrl = decodeURIComponent(rawUrl);
    } else if (imageUrl.includes("/api/image-proxy?url=")) {
      const parts = imageUrl.split("/api/image-proxy?url=");
      imageUrl = decodeURIComponent(parts[parts.length - 1]);
    } else {
      break;
    }
  }

  // Check cache first
  const cached = getCachedImage(imageUrl);
  if (cached) {
    res.setHeader('Content-Type', cached.contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Cache', 'HIT');
    return res.send(cached.buffer);
  }

  try {
    // Validate URL
    try {
      new URL(imageUrl);
    } catch (e) {
      return res.status(400).send("Invalid URL");
    }

    let response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://movieapi.xcasper.space/',
        'Cache-Control': 'no-cache',
      }
    });

    if (!response.ok) {
        let fallbackUrl: string | null = null;
        if (imageUrl.endsWith('.jpeg')) {
            fallbackUrl = imageUrl.replace('.jpeg', '.jpg');
        } else if (imageUrl.endsWith('.jpg')) {
            fallbackUrl = imageUrl.replace('.jpg', '.jpeg');
        }

        if (fallbackUrl) {
            console.log(`[Image Proxy] ${imageUrl} failed (${response.status}), trying fallback: ${fallbackUrl}`);
            const fallbackResponse = await fetch(fallbackUrl, {
                method: 'GET',
                headers: { 
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                  'Referer': 'https://movieapi.xcasper.space/',
                }
            });
            if (fallbackResponse.ok) {
                response = fallbackResponse;
            } else {
                throw new Error(`Failed to fetch image: ${response.statusText} (fallback also failed: ${fallbackResponse.statusText})`);
            }
        } else {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Auto-detect content type if upstream fails
    let contentType = response.headers.get('content-type');
    if (!contentType || contentType === 'application/octet-stream') {
       if (imageUrl.endsWith('.webp')) contentType = 'image/webp';
       else if (imageUrl.endsWith('.png')) contentType = 'image/png';
       else if (imageUrl.endsWith('.svg')) contentType = 'image/svg+xml';
       else contentType = 'image/jpeg';
    }
    
    // Set cache for future requests
    setCachedImage(imageUrl, buffer, contentType || 'image/jpeg');

    res.setHeader('Content-Type', contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Cache', 'MISS');
    res.send(buffer);
  } catch (error: any) {
    console.error(`[Image Proxy] Error fetching ${imageUrl}:`, error.message);
    res.status(500).send("Failed to fetch image");
  }
});

// Video Proxy Route
app.get("/api/proxy", async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).send("URL is required");
  }

  try {
    const range = req.headers.range;
    
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://movieapi.xcasper.space/",
        "Accept": "*/*",
        "Connection": "keep-alive",
        ...(range && { "Range": range }),
      },
    });

    if (!response.ok && response.status !== 206) {
        // Log error but try to return what we have
        console.warn(`[Proxy] Upstream returned status ${response.status} for ${videoUrl}`);
    }

    // Forward crucial headers
    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag'
    ];

    headersToForward.forEach(h => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status);

    if (!response.body) throw new Error("No response body");

    // Optimized streaming
    const { Readable } = await import("stream");
    const reader = Readable.fromWeb(response.body as any);
    
    reader.on('error', (err) => {
       console.error("[Proxy Stream Error]:", err);
       if (!res.headersSent) res.status(500).end();
    });

    reader.pipe(res);

  } catch (error: any) {
    console.error("[Proxy] Error:", error.message);
    res.status(500).send(error.message);
  }
});

app.get("/api/system/status", (req, res) => {
  try {
    res.json({
      maintenanceMode: adminState.maintenanceMode || false,
      broadcastMessage: adminState.broadcastMessage || null,
      broadcastLevel: adminState.broadcastLevel || 'info',
      siteConfig: adminState.siteConfig
    });
  } catch (error: any) {
    console.error("System status endpoint error:", error);
    res.status(500).json({ error: "Internal server error reading system status" });
  }
});

app.post("/api/auth/sync", (req, res) => {
  const user = req.body;
  if (!user || !user.email) return res.status(400).json({ error: "Invalid user data" });
  
  if (adminState.bannedEmails.includes(user.email.toLowerCase())) {
    return res.status(403).json({ error: "Your account has been suspended." });
  }

  saveUser(user);
  
  // Advanced Activity Logging
  if (user.lastActionType) {
    logAction("USER_ACTIVITY", `${user.username} (${user.email}): ${user.lastActionType}`);
    
    // Log search queries specifically
    if (user.lastActionType.startsWith("SEARCH: ")) {
      const query = user.lastActionType.replace("SEARCH: ", "");
      adminState.searchLogs.unshift({
        query,
        timestamp: new Date().toISOString(),
        userId: user.id
      });
      adminState.searchLogs = adminState.searchLogs.slice(0, 500);
      saveAdminState();
    }
  }
  res.json({ success: true, maintenance: adminState.maintenanceMode, siteConfig: adminState.siteConfig });
});

app.get("/api/admin/users", (req, res) => {
  res.json(getUsers());
});

app.get("/api/admin/system", (req, res) => {
  res.json({
    maintenanceMode: adminState.maintenanceMode,
    broadcastMessage: adminState.broadcastMessage,
    broadcastLevel: adminState.broadcastLevel,
    bannedEmails: adminState.bannedEmails,
    auditLogs: adminState.auditLogs,
    searchLogs: adminState.searchLogs,
    featuredMedia: adminState.featuredMedia,
    siteConfig: adminState.siteConfig,
    reports: adminState.reports,
    serverMetrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpuLoad: os.loadavg(),
      platform: os.platform(),
      arch: os.arch()
    }
  });
});

app.post("/api/admin/broadcast", (req, res) => {
  const { message, level } = req.body;
  adminState.broadcastMessage = message || null;
  adminState.broadcastLevel = level || 'info';
  logAction("BROADCAST", message ? `[${adminState.broadcastLevel}] New broadcast: ${message}` : "Broadcast cleared");
  saveAdminState();
  res.json({ success: true });
});

app.post("/api/admin/config", (req, res) => {
  const { siteConfig } = req.body;
  if (siteConfig) {
    adminState.siteConfig = { ...adminState.siteConfig, ...siteConfig };
    if (siteConfig.apiSource) {
      setApiSource(siteConfig.apiSource);
    }
    logAction("CONFIG_UPDATE", `Site identity updated: ${adminState.siteConfig.siteName}`);
    saveAdminState();
    res.json({ success: true });
  } else {
    res.status(400).send("Config required");
  }
});

app.post("/api/admin/featured", (req, res) => {
  const { featuredMedia } = req.body;
  if (Array.isArray(featuredMedia)) {
    adminState.featuredMedia = featuredMedia;
    logAction("CONTENT_UPDATE", `Featured media list updated (${featuredMedia.length} items)`);
    saveAdminState();
    res.json({ success: true });
  } else {
    res.status(400).send("Invalid featured media data");
  }
});

app.post("/api/admin/logs/clear", (req, res) => {
  const { type } = req.body;
  if (type === 'audit') {
    adminState.auditLogs = [];
    logAction("SYSTEM", "Audit logs cleared manually");
  } else if (type === 'search') {
    adminState.searchLogs = [];
    logAction("SYSTEM", "Search logs cleared manually");
  }
  saveAdminState();
  res.json({ success: true });
});

app.post("/api/admin/maintenance", (req, res) => {
  const { enabled } = req.body;
  adminState.maintenanceMode = !!enabled;
  logAction("MAINTENANCE", `Maintenance mode ${enabled ? "enabled" : "disabled"}`);
  saveAdminState();
  res.json({ success: true });
});

app.post("/api/admin/ban", (req, res) => {
  const { email, unban } = req.body;
  if (!email) return res.status(400).send("Email required");
  
  if (unban) {
    adminState.bannedEmails = adminState.bannedEmails.filter(e => e !== email.toLowerCase());
    logAction("UNBAN", `User unbanned: ${email}`);
  } else {
    if (!adminState.bannedEmails.includes(email.toLowerCase())) {
      adminState.bannedEmails.push(email.toLowerCase());
      logAction("BAN", `User banned: ${email}`);
    }
  }
  saveAdminState();
  res.json({ success: true });
});

app.post("/api/report", (req, res) => {
  const { userId, category, detail } = req.body;
  const report = {
    id: Math.random().toString(36).substr(2, 9),
    userId,
    category,
    detail,
    timestamp: new Date().toISOString(),
    status: 'open' as const
  };
  adminState.reports.unshift(report);
  saveAdminState();
  res.json({ success: true, reportId: report.id });
});

app.post("/api/admin/reports/resolve", (req, res) => {
  const { reportId } = req.body;
  const report = adminState.reports.find(r => r.id === reportId);
  if (report) {
    report.status = 'closed';
    logAction("REPORT", `Report ${reportId} resolved`);
    saveAdminState();
    res.json({ success: true });
  } else {
    res.status(404).send("Report not found");
  }
});

app.get("/api/admin/stats", (req, res) => {
  const users = getUsers();
  res.json({
    totalUsers: users.length,
    newToday: users.filter(u => u.createdAt && new Date(u.createdAt).toDateString() === new Date().toDateString()).length,
    mostActive: users.sort((a, b) => (b.stats?.totalViews || 0) - (a.stats?.totalViews || 0)).slice(0, 5),
    searchVelocity: adminState.searchLogs.filter(s => new Date(s.timestamp).getTime() > Date.now() - 3600000).length,
    openReports: adminState.reports.filter(r => r.status === 'open').length
  });
});

app.get("/sitemap.xml", (req, res) => {
  const SITE_URL = "https://axislabs.dpdns.org";
  const pages = [
    "",
    "/movies",
    "/series",
    "/anime",
    "/toons",
    "/ranking",
    "/live",
    "/browse",
    "/search",
    "/playlist"
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(page => `
  <url>
    <loc>${SITE_URL}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === "" ? "1.0" : "0.8"}</priority>
  </url>`).join("")}
</urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(sitemap);
});

app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Sitemap: https://axislabs.dpdns.org/sitemap.xml`);
});

// Legacy fallback for any other /api/* routes
app.get("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

async function startServer() {
  const PORT = 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server if we're not running on Vercel
if (!process.env.VERCEL) {
  startServer();
}

export default app;
