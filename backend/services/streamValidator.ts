import axios from "axios";
import { config } from "../config/settings";
import { StreamValidationResult } from "../models/types";
import { logger } from "../utils/logger";

export class StreamValidator {
  static async validateStream(m3u8Url: string): Promise<StreamValidationResult> {
    if (!m3u8Url || m3u8Url === "UNKNOWN STREAM") {
      return { status: "UNKNOWN", reason: "No stream URL provided" };
    }

    try {
      // Step 1: Fetch m3u8
      const resp = await axios.get(m3u8Url, {
        headers: config.STREAM_HEADERS,
        timeout: 10000,
        maxRedirects: 5
      });

      if (resp.status === 403) {
        return { status: "UNKNOWN", reason: "403 Forbidden - signature expired" };
      }
      if (resp.status !== 200) {
        return { status: "OFFLINE", reason: `HTTP ${resp.status}` };
      }

      const contentType = (resp.headers['content-type'] || "").toLowerCase();
      if (!contentType.includes("mpegurl") && !contentType.includes("m3u8") && !contentType.includes("text")) {
        return { status: "UNKNOWN", reason: `Unexpected Content-Type: ${contentType}` };
      }

      const content: string = typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data);

      // Step 2: Parse segments
      const segments = content
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"));

      if (segments.length === 0) {
        return { status: "UNKNOWN", reason: "No segments found in playlist" };
      }

      // Step 3: Resolve segment URL
      const firstSegment = segments[0];
      let segmentUrl = firstSegment;
      if (!firstSegment.startsWith("http")) {
        const base = m3u8Url.substring(0, m3u8Url.lastIndexOf("/") + 1);
        segmentUrl = new URL(firstSegment, base).toString();
      }

      // Step 4: Send Range request
      const segResp = await axios.get(segmentUrl, {
        headers: { ...config.STREAM_HEADERS, "Range": "bytes=0-1024" },
        timeout: 10000,
        validateStatus: () => true, // resolve on any status
        responseType: 'arraybuffer'
      });

      const segContentType = (segResp.headers['content-type'] || "").toLowerCase();
      const validTypes = ["video", "mp2t", "mpeg", "octet"];
      const isValidType = validTypes.some(v => segContentType.includes(v));

      // Step 5: Determine status
      if (segResp.status === 206) {
        if (isValidType) {
          return {
            status: "LIVE",
            segment_url: segmentUrl,
            content_type: segContentType,
            segment_size: segResp.headers['content-length'],
          };
        }
        return { status: "LIVE", note: `206 but type=${segContentType}` };
      } else if (segResp.status === 200) {
        if (isValidType) {
          return { status: "LIVE", segment_url: segmentUrl, content_type: segContentType };
        }
        return { status: "UNKNOWN", reason: `200 OK but type=${segContentType}` };
      } else {
        return { status: "OFFLINE", reason: `Segment HTTP ${segResp.status}` };
      }
    } catch (e: any) {
      if (e.code === 'ECONNABORTED') {
        return { status: "UNKNOWN", reason: "Timeout during validation" };
      }
      return { status: "UNKNOWN", reason: `UNKNOWN ERROR: ${e.message?.substring(0, 100)}` };
    }
  }
}
