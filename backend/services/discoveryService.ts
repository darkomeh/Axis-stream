import axios from "axios";
import { config } from "../config/settings";
import { logger } from "../utils/logger";

let bestDomainCache: { domain: string; time: number } | null = null;
let bestDomainLastCheck: number = 0;

export class DiscoveryService {
  /**
   * Test all known domains and return the fastest working one.
   * Returns: { domain, responseTimeMs } or null if none work.
   */
  static async getBestDomain(): Promise<{ domain: string; time: number } | null> {
    const now = Date.now();
    // Cache the best domain for 10 minutes to avoid spamming HEAD requests
    if (bestDomainCache && now - bestDomainLastCheck < 10 * 60 * 1000) {
      return bestDomainCache;
    }

    logger.info("Discovering working domains...");
    const promises = config.DOMAINS_TO_TEST.map(async (domain) => {
      const start = Date.now();
      try {
        const response = await axios.head(domain, {
          headers: config.BROWSER_HEADERS,
          timeout: 10000,
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
    bestDomainCache = working[0];
    bestDomainLastCheck = now;
    
    logger.info(`Best domain: ${bestDomainCache.domain} (${bestDomainCache.time}ms)`);
    return bestDomainCache;
  }
}
