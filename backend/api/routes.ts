import { Router, Request, Response } from "express";
import { DiscoveryService } from "../services/discoveryService";
import { MatchScraper } from "../services/matchScraper";
import { StreamValidator } from "../services/streamValidator";
import { rewritePlaylistForProxy, fetchSegmentStreaming } from "../proxy/engine";
import axios from "axios";
import { config } from "../config/settings";

export const backendRouter = Router();

// Phase 3 - REST API

// Health Check
backendRouter.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
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
    if (!domainInfo) {
      res.status(503).json({ error: "No working domains available" });
      return;
    }
    const sport = (req.query.sport as string) || "football";
    const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain, sport);
    const liveMatches = matches.filter(m => m.status === "LIVE");
    res.json({ total: liveMatches.length, matches: liveMatches });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /matches/upcoming
backendRouter.get("/matches/upcoming", async (req, res) => {
  try {
    const domainInfo = await DiscoveryService.getBestDomain();
    if (!domainInfo) {
      res.status(503).json({ error: "No working domains available" });
      return;
    }
    const sport = (req.query.sport as string) || "football";
    const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain, sport);
    const upcomingMatches = matches.filter(m => m.status === "UPCOMING");
    res.json({ total: upcomingMatches.length, matches: upcomingMatches });
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
