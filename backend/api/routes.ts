import { Router, Request, Response } from "express";
import { DiscoveryService } from "../services/discoveryService.js";
import { MatchScraper } from "../services/matchScraper.js";
import { StreamValidator } from "../services/streamValidator.js";
import { MatchMonitor } from "../services/matchMonitor.js";
import { rewritePlaylistForProxy, fetchSegmentStreaming } from "../proxy/engine.js";
import axios from "axios";
import { config } from "../config/settings.js";
import { logger } from "../utils/logger.js";

export const backendRouter = Router();

// Phase 3 - REST API

// Health Check
backendRouter.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Warmup/Trigger Discovery Cache
backendRouter.get("/sports/warmup", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    res.json({ status: "success", bestDomain: domainInfo });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /sports
backendRouter.get("/sports", (req, res) => {
  // Can be expanded via future provider architecture
  res.json({
    sports: [
      { id: "football", name: "Football" },
      { id: "basketball", name: "Basketball" },
      // etc
    ]
  });
});

// GET /matches/live
backendRouter.get("/matches/live", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    const bestDomain = domainInfo?.domain || "https://sportslivetoday.com";
    const sport = (req.query.sport as string) || "all";
    const matches = await MatchScraper.scrapeLiveMatches(bestDomain, sport);
    const liveMatches = matches.filter(m => m.status === "LIVE" || m.status === "HALF_TIME");
    res.json({ total: liveMatches.length, matches: liveMatches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /matches/upcoming
backendRouter.get("/matches/upcoming", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    const bestDomain = domainInfo?.domain || "https://sportslivetoday.com";
    const sport = (req.query.sport as string) || "all";
    const matches = await MatchScraper.scrapeLiveMatches(bestDomain, sport);
    const upcomingMatches = matches.filter(m => m.status === "UPCOMING");
    res.json({ total: upcomingMatches.length, matches: upcomingMatches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /matches (Handles standard filters: ?status=live|upcoming|finished|all & ?sport=all|football|basketball)
backendRouter.get("/matches", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    const bestDomain = domainInfo?.domain || "https://sportslivetoday.com";
    
    const sport = (req.query.sport as string) || "all";
    const status = (req.query.status as string) || "all";
    
    const matches = await MatchScraper.scrapeLiveMatches(bestDomain, sport);
    
    let filtered = matches;
    if (status && status !== "all") {
      const targetStatus = status.toUpperCase();
      filtered = matches.filter(m => {
        if (targetStatus === "LIVE") return m.status === "LIVE" || m.status === "HALF_TIME";
        if (targetStatus === "UPCOMING") return m.status === "UPCOMING";
        if (targetStatus === "FINISHED") return m.status === "FINISHED";
        return m.status === targetStatus;
      });
    }
    
    res.json({ total: filtered.length, matches: filtered });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /leagues (Returns available leagues with local fallback)
backendRouter.get("/leagues", async (req, res) => {
  // Return premium, clean local leagues data directly
  res.json({
    count: 6,
    leagues: [
      { leagueId: "4186762757372631736", leagueName: "FIFA World Cup", localLeagueName: "FIFA World Cup", sport: "football", area: "" },
      { leagueId: "2628213355089131872", leagueName: "Bundesliga", localLeagueName: "Bundesliga", sport: "football", area: "" },
      { leagueId: "8879209637879380320", leagueName: "LaLiga", localLeagueName: "LaLiga", sport: "football", area: "" },
      { leagueId: "2249910986390010208", leagueName: "Ligue 1", localLeagueName: "Ligue 1", sport: "football", area: "" },
      { leagueId: "4663840386660596064", leagueName: "Premier League", localLeagueName: "Premier League", sport: "football", area: "" },
      { leagueId: "4807955574736451936", leagueName: "Serie A", localLeagueName: "Serie A", sport: "football", area: "" }
    ]
  });
});

// GET /basketball
backendRouter.get("/basketball", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    const bestDomain = domainInfo?.domain || "https://sportslivetoday.com";
    const matches = await MatchScraper.scrapeLiveMatches(bestDomain, "basketball");
    res.json({ total: matches.length, matches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /stream/rank
backendRouter.post("/stream/rank", async (req, res) => {
  const { streams } = req.body;
  if (!streams || !Array.isArray(streams)) {
    res.status(400).json({ error: "Missing or invalid streams array" });
    return;
  }
  try {
    const ranked = await StreamValidator.rankStreams(streams);
    res.json({ streams: ranked });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /stream/validate
backendRouter.post("/stream/validate", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "Missing stream URL" });
    return;
  }
  try {
    const result = await StreamValidator.validateStream(url);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/proxy/playlist.m3u8
backendRouter.get("/proxy/playlist.m3u8", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).send("Missing URL parameter");
    return;
  }

  try {
    const response = await axios.get(url, {
      headers: config.STREAM_HEADERS,
      timeout: 10000
    });

    if (response.status < 200 || response.status >= 300) {
      res.status(response.status).send(`Upstream returned ${response.status}`);
      return;
    }

    const reqBaseUrl = `${req.protocol}://${req.get("host")}`;
    const rewritten = rewritePlaylistForProxy(response.data, url, reqBaseUrl);

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.send(rewritten);
  } catch (err: any) {
    res.status(502).send("Bad Gateway");
  }
});

// GET /api/proxy/segment
backendRouter.get("/proxy/segment", async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    res.status(400).send("Missing URL parameter");
    return;
  }
  
  await fetchSegmentStreaming(url, res);
});

// GET /api/notifications/vapid-public-key
backendRouter.get("/notifications/vapid-public-key", (req, res) => {
  const publicKey = MatchMonitor.getPublicKey();
  if (publicKey) {
    res.json({ publicKey });
  } else {
    res.status(500).json({ error: "VAPID public key not generated yet" });
  }
});

// GET /api/sports/stream-sync/:matchId
backendRouter.get("/sports/stream-sync/:matchId", (req, res) => {
  const { matchId } = req.params;
  const syncData = MatchMonitor.getStreamSession(matchId);
  res.json(syncData);
});

