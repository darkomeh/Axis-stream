import axios from "axios";
import { config } from "../config/settings.js";
import { StreamValidationResult } from "../models/types.js";
import { logger } from "../utils/logger.js";

export class StreamValidator {
  static async validateStream(m3u8Url: string): Promise<StreamValidationResult> {
    if (!m3u8Url || m3u8Url === "UNKNOWN STREAM") {
      return { status: "UNKNOWN", reason: "No stream URL provided" };
    }

    try {
      const startTime = Date.now();
      
      const resp = await axios.head(m3u8Url, {
        headers: config.STREAM_HEADERS,
        timeout: 8000,
        maxRedirects: 5,
        validateStatus: () => true // resolve on any status
      });
      
      const latency = Date.now() - startTime;
      
      const result: StreamValidationResult = {
        status: "UNKNOWN",
        url: m3u8Url,
        latency: latency
      };

      if (resp.status === 200 || resp.status === 206) {
        const ct = (resp.headers['content-type'] || "").toLowerCase();
        const cl = parseInt(resp.headers['content-length'] || "0", 10);
        
        if (ct.includes("mpegurl") || ct.includes("m3u8")) {
            result.quality = "HLS";
            result.status = "ONLINE";
        } else if (ct.includes("video") || ct.includes("mp2t") || ct.includes("mpeg")) {
            result.quality = "HD";
            result.status = "ONLINE";
        } else if (cl > 1000) {
            result.quality = "SD";
            result.status = "ONLINE";
        } else {
            result.quality = "?";
            result.status = "ONLINE";
        }
        
        result.speed = Math.round((1.0 / Math.max(latency / 1000, 0.001)) * 10) / 10;
        
      } else if (resp.status === 403) {
        result.status = "BLOCKED";
        result.reason = "403 Forbidden - signature expired or blocked";
      } else {
        result.status = "OFFLINE";
        result.reason = `HTTP ${resp.status}`;
      }
      
      return result;

    } catch (e: any) {
      if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        return { status: "TIMEOUT", reason: "Timeout during validation" };
      }
      return { status: "ERROR", reason: `UNKNOWN ERROR: ${e.message?.substring(0, 100)}` };
    }
  }

  static async rankStreams(streams: any[]) {
      const results = await Promise.all(streams.map(async (stream) => {
          const res = await this.validateStream(stream.url);
          return {
              ...stream,
              status: res.status,
              latency: res.latency,
              speed: res.speed,
              quality: res.quality !== "?" ? res.quality : stream.quality
          };
      }));

      // Sort by status (ONLINE first) then by speed
      results.sort((a, b) => {
          const aOnline = a.status === "ONLINE" ? 1 : 0;
          const bOnline = b.status === "ONLINE" ? 1 : 0;
          if (aOnline !== bOnline) return bOnline - aOnline;
          return (b.speed || 0) - (a.speed || 0);
      });

      return results;
  }
}
