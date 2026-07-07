import { config } from "../config/settings.js";
import { logger } from "../utils/logger.js";
import axios, { AxiosResponse } from "axios";
import { Request, Response } from "express";

class SegmentCache {
  private cache = new Map<string, { data: Buffer; timestamp: number }>();
  private readonly maxSize = config.CACHE_MAX_SEGMENTS;
  private readonly ttl = 120000; // 2 minutes

  get(url: string): Buffer | null {
    const item = this.cache.get(url);
    if (item) {
      if (Date.now() - item.timestamp < this.ttl) {
        // refresh position
        this.cache.delete(url);
        this.cache.set(url, item);
        return item.data;
      } else {
        this.cache.delete(url);
      }
    }
    return null;
  }

  put(url: string, data: Buffer) {
    if (this.cache.has(url)) {
      this.cache.delete(url);
    }
    this.cache.set(url, { data, timestamp: Date.now() });
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(url: string) {
    return this.get(url) !== null;
  }
}

export const segmentCache = new SegmentCache();

export function rewritePlaylistForProxy(playlistContent: string, targetM3u8Url: string, reqBaseUrl: string): string {
  const lines = playlistContent.split("\n");
  const rewritten = [];
  const baseParts = targetM3u8Url.split("/");
  baseParts.pop();
  const baseUrl = baseParts.join("/") + "/";
  
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped || stripped.startsWith("#")) {
      rewritten.push(line);
      continue;
    }
    
    let originalUrl = stripped;
    if (!originalUrl.startsWith("http")) {
      originalUrl = new URL(originalUrl, baseUrl).toString();
    }
    
    const isPlaylist = originalUrl.includes(".m3u8") || originalUrl.includes("/playlist");
    const proxyUrl = isPlaylist
      ? `/api/proxy/playlist.m3u8?url=${encodeURIComponent(originalUrl)}`
      : `/api/proxy/segment?url=${encodeURIComponent(originalUrl)}`;
    rewritten.push(proxyUrl);
  }
  
  return rewritten.join("\n");
}

export async function fetchSegmentStreaming(url: string, res: Response): Promise<void> {
  const cached = segmentCache.get(url);
  if (cached) {
    res.setHeader("Content-Type", "video/MP2T");
    res.send(cached);
    return;
  }

  for (let attempt = 1; attempt <= config.SEGMENT_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: config.STREAM_HEADERS,
        responseType: 'stream',
        timeout: 15000
      });

      if (response.status >= 200 && response.status < 300) {
        res.setHeader("Content-Type", "video/MP2T");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        
        const chunks: Buffer[] = [];
        response.data.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
          res.write(chunk);
        });

        response.data.on('end', () => {
          res.end();
          const fullData = Buffer.concat(chunks);
          segmentCache.put(url, fullData);
        });

        response.data.on('error', (err: any) => {
          logger.error(`Stream error on ${url}: ${err.message}`);
          if (!res.headersSent) res.status(500).end();
          else res.end();
        });
        return;
      }
    } catch (e: any) {
      if (attempt === config.SEGMENT_RETRY_ATTEMPTS) {
        logger.error(`Failed to fetch segment after ${attempt} attempts: ${url}`, e.message);
        if (!res.headersSent) res.status(502).send("Bad Gateway");
        return;
      }
      await new Promise(r => setTimeout(r, config.RETRY_BACKOFF_BASE * attempt));
    }
  }
}
