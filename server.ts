import express from "express";
import path from "path";
import { externalMovieService } from "./src/services/externalMovieService";
import axios from "axios";
import fs from "fs";
import os from "os";

const app = express();
app.use(express.json());

// User Persistence (Simple JSON storage)
const USERS_FILE = path.join(process.cwd(), "users.json");
const ADMIN_STATE_FILE = path.join(process.cwd(), "admin_state.json");

interface AdminState {
  maintenanceMode: boolean;
  broadcastMessage: string | null;
  broadcastLevel: 'info' | 'warning' | 'critical';
  bannedEmails: string[];
  adminPin: string; 
  auditLogs: { id: string, timestamp: string, type: string, detail: string }[];
  searchLogs: { query: string, timestamp: string, userId?: string }[];
  featuredMedia: string[]; // List of subjectIds to feature
  siteConfig: {
    siteName: string;
    brandColor: string;
    tagline: string;
    logoUrl?: string;
    allowGuestBrowsing: boolean;
  };
  reports: { id: string, userId: string, category: string, detail: string, timestamp: string, status: 'open' | 'closed' }[];
}

let adminState: AdminState = {
  maintenanceMode: false,
  broadcastMessage: null,
  broadcastLevel: 'info',
  bannedEmails: [],
  adminPin: "1234",
  auditLogs: [],
  searchLogs: [],
  featuredMedia: [],
  siteConfig: {
    siteName: "AxisTV",
    brandColor: "#E50914",
    tagline: "Home of Endless Movies and Series",
    logoUrl: "https://i.ibb.co/Zz9CLQw3/431d475fa275.jpg",
    allowGuestBrowsing: true,
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
      if (!adminState.adminPin) adminState.adminPin = "1234";
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
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

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
    console.log("[API] Fetching aggregated popular data...");
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

app.get("/api/play", async (req, res) => {
  try {
    const { subjectId, detailPath, se, ep } = req.query;
    const data = await externalMovieService.getPlay(
      String(subjectId || ""),
      detailPath ? String(detailPath) : undefined,
      se ? Number(se) : undefined,
      ep ? Number(ep) : undefined
    );
    res.json(data);
  } catch (error: any) {
    console.error("[API] Play error:", error.message);
    res.status(500).json({ success: false, error: error.message });
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
    const data = await externalMovieService.getActorDetails(String(staffId || ""));
    res.json(data);
  } catch (error: any) {
    console.error("[API] Actor detail error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/staff/works", async (req, res) => {
  try {
    const { staffId, page, perPage } = req.query;
    const data = await externalMovieService.getActorWorks(
      String(staffId || ""),
      Number(page) || 1,
      Number(perPage) || 10
    );
    res.json(data);
  } catch (error: any) {
    console.error("[API] Actor works error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/staff/related", async (req, res) => {
  try {
    const { staffId } = req.query;
    const data = await externalMovieService.getRelatedActors(String(staffId || ""));
    res.json(data);
  } catch (error: any) {
    console.error("[API] Related actors error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/live", async (req, res) => {
  try {
    const data = await externalMovieService.getLive();
    res.json(data);
  } catch (error: any) {
    console.error("[API] Live error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Image Proxy Route
app.get("/api/image-proxy", async (req, res) => {
  let imageUrl = req.query.url as string;
  if (!imageUrl) {
    return res.status(400).send("URL is required");
  }

  // Prevent recursive proxying
  while (imageUrl.includes("/api/image-proxy?url=")) {
    const parts = imageUrl.split("/api/image-proxy?url=");
    imageUrl = decodeURIComponent(parts[parts.length - 1]);
  }

  try {
    // Validate URL
    let url: URL;
    try {
      url = new URL(imageUrl);
    } catch (e) {
      console.error(`[Image Proxy] Invalid URL: ${imageUrl}`);
      return res.status(400).send("Invalid URL");
    }

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': url.origin,
        'Cache-Control': 'no-cache',
        'sec-ch-ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'image',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-site': 'cross-site'
      }
    });

    const contentType = response.headers['content-type'];
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }
    
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(response.data);
  } catch (error: any) {
    console.error(`[Image Proxy] Error fetching ${imageUrl}:`, error.message);
    
    // Try one more time without Referer if it failed
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
      res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
      res.send(response.data);
    } catch (retryError: any) {
      res.status(500).send("Failed to fetch image");
    }
  }
});

// Video Proxy Route
app.get("/api/proxy", async (req, res) => {
  const videoUrl = req.query.url as string;
  console.log("[Proxy] Requesting:", videoUrl);
  if (!videoUrl) {
    return res.status(400).send("URL is required");
  }

  try {
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://movieapi.xcasper.space/",
        ...(req.headers.range && { "Range": req.headers.range }),
      },
    });

    if (!response.ok) throw new Error(`External API returned ${response.status}`);

    // Forward headers
    response.headers.forEach((value, name) => res.setHeader(name, value));
    
    if (response.status === 206) res.status(206);

    if (!response.body) throw new Error("No response body");

    // Pipe the Web ReadableStream to the Express response
    // @ts-ignore - Node 18+ fetch body is a Web ReadableStream which can be piped in newer Node versions, or we can use Readable.fromWeb
    const { Readable } = await import("stream");
    Readable.fromWeb(response.body as any).pipe(res);

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

app.post("/api/admin/verify-pin", (req, res) => {
  const { pin } = req.body;
  if (pin === adminState.adminPin) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: "Incorrect Security PIN" });
  }
});

app.post("/api/admin/update-pin", (req, res) => {
  const { oldPin, newPin } = req.body;
  if (oldPin === adminState.adminPin) {
    if (!newPin || newPin.length < 4) return res.status(400).json({ error: "Invalid PIN" });
    adminState.adminPin = newPin;
    logAction("SECURITY", "Admin Security PIN updated");
    saveAdminState();
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Incorrect current PIN" });
  }
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
