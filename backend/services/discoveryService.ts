import axios from "axios";
import { config } from "../config/settings";
import { logger } from "../utils/logger";
import fs from "fs";
import path from "path";
import os from "os";

const TEMP_CACHE_PATH = path.join(os.tmpdir(), "best_domain.json");

let bestDomainCache: { domain: string; time: number } | null = null;
let bestDomainLastCheck: number = 0;

function loadCache() {
  const now = Date.now();
  if (bestDomainCache && now - bestDomainLastCheck < 30 * 60 * 1000) {
    return bestDomainCache;
  }
  try {
    if (fs.existsSync(TEMP_CACHE_PATH)) {
      const data = fs.readFileSync(TEMP_CACHE_PATH, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && parsed.domain && typeof parsed.time === "number") {
        const fileAge = now - (parsed.timestamp || 0);
        // Let it survive up to 30 minutes to stay warm on Vercel
        if (fileAge < 30 * 60 * 1000) {
          bestDomainCache = { domain: parsed.domain, time: parsed.time };
          bestDomainLastCheck = parsed.timestamp || now;
          logger.info(`Loaded best domain from /tmp cache: ${bestDomainCache.domain}`);
          return bestDomainCache;
        }
      }
    }
  } catch (err: any) {
    logger.debug(`Failed to read best_domain from /tmp cache: ${err.message}`);
  }
  return null;
}

function saveCache(cache: { domain: string; time: number }) {
  bestDomainCache = cache;
  bestDomainLastCheck = Date.now();
  try {
    fs.writeFileSync(TEMP_CACHE_PATH, JSON.stringify({
      domain: cache.domain,
      time: cache.time,
      timestamp: bestDomainLastCheck
    }), "utf-8");
    logger.info(`Saved best domain to /tmp cache: ${cache.domain}`);
  } catch (err: any) {
    logger.warn(`Failed to write best_domain to /tmp cache: ${err.message}`);
  }
}

export class DiscoveryService {
  /**
   * Test all known domains and return the fastest working one.
   * Returns: { domain, responseTimeMs } or null if none work.
   */
  static async getBestDomain(): Promise<{ domain: string; time: number } | null> {
    const cached = loadCache();
    if (cached) {
      return cached;
    }

    logger.info("Discovering working domains...");
    const timeoutVal = (config as any).DOMAIN_DISCOVERY_TIMEOUT || 3000;
    const promises = config.DOMAINS_TO_TEST.map(async (domain) => {
      const start = Date.now();
      try {
        const response = await axios.head(domain, {
          headers: config.BROWSER_HEADERS,
          timeout: timeoutVal,
          maxRedirects: 5
        });
        
        const elapsed = Date.now() - start;
        if (response.status >= 200 && response.status < 400) {
          const finalUrl = response.request?.res?.responseUrl || domain;
          logger.info(`✅ ${domain} - ${elapsed}ms`);
          return { domain: finalUrl, time: elapsed };
        }
      } catch (e: any) {
        logger.debug(`❌ ${domain} - ${e.message}`);
      }
      return null;
    });

    const results = await Promise.all(promises);
    const working = results.filter((r): r is { domain: string; time: number } => r !== null);

    if (working.length === 0) {
      logger.error("No working domains found!");
      return null;
    }

    working.sort((a, b) => a.time - b.time);
    const best = working[0];
    saveCache(best);
    
    logger.info(`Best domain discovered: ${best.domain} (${best.time}ms)`);
    return best;
  }
}
