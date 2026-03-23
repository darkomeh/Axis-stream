import express from "express";
import path from "path";
import { externalMovieService } from "./src/services/externalMovieService";
import axios from "axios";

const app = express();

// API Routes using externalMovieService
app.get("/api/homepage", async (req, res) => {
  console.log("[API] Request: /homepage");
  try {
    const data = await externalMovieService.getHomepage();
    res.json(data);
  } catch (error: any) {
    console.error("[API] Homepage error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/trending", async (req, res) => {
  console.log("[API] Request: /trending");
  try {
    const { page, perPage } = req.query;
    const data = await externalMovieService.getTrending(Number(page) || 0, Number(perPage) || 18);
    res.json(data);
  } catch (error: any) {
    console.error("[API] Trending error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/search", async (req, res) => {
  try {
    const { keyword, page, perPage, subjectType } = req.query;
    const data = await externalMovieService.search(
      String(keyword || ""),
      Number(page) || 1,
      Number(perPage) || 10,
      Number(subjectType) || 1
    );
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
  try {
    const data = await externalMovieService.getHot();
    res.json(data);
  } catch (error: any) {
    console.error("[API] Hot error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/search/suggest", async (req, res) => {
  try {
    const { keyword } = req.query;
    const data = await externalMovieService.getSuggestions(String(keyword || ""));
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
  try {
    const data = await externalMovieService.getRanking();
    res.json(data);
  } catch (error: any) {
    console.error("[API] Ranking error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/play", async (req, res) => {
  try {
    const { subjectId, season, episode } = req.query;
    const data = await externalMovieService.getPlay(
      String(subjectId || ""),
      season ? Number(season) : undefined,
      episode ? Number(episode) : undefined
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
