import axios from "axios";
import { config } from "../config/settings";
import { Match } from "../models/types";
import { logger } from "../utils/logger";

export class MatchScraper {
  static async scrapeLiveMatches(baseDomain: string): Promise<Match[]> {
    let payloadUrl = "";
    if (baseDomain.includes("moviebox")) {
      payloadUrl = `https://sportslivetoday.com/_payload.json?live&sportType=${config.DEFAULT_SPORT}`;
    } else {
      const url = new URL(baseDomain);
      payloadUrl = `${url.origin}/_payload.json?live&sportType=${config.DEFAULT_SPORT}`;
    }

    logger.info(`Fetching match data from: ${payloadUrl}`);

    for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(payloadUrl, {
          headers: config.BROWSER_HEADERS,
          timeout: config.REQUEST_TIMEOUT
        });

        if (response.status === 200) {
          const matches = this.parseNuxtPayload(typeof response.data === 'string' ? response.data : JSON.stringify(response.data));
          logger.info(`Found ${matches.length} matches`);
          return matches;
        }
      } catch (e: any) {
        logger.warn(`Attempt ${attempt}/${config.MAX_RETRIES} failed: ${e.message}`);
        if (attempt < config.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
        } else {
          logger.error(`Failed to fetch matches after ${config.MAX_RETRIES} attempts`);
        }
      }
    }
    return [];
  }

  private static parseNuxtPayload(payloadText: string): Match[] {
    const matches: Match[] = [];
    
    // Pattern to find teams
    const teamPattern = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
    const allTeams: RegExpExecArray[] = [];
    
    let match;
    while ((match = teamPattern.exec(payloadText)) !== null) {
      allTeams.push(match);
    }

    if (allTeams.length === 0) {
      logger.warn("No team data found in payload");
      return matches;
    }

    let i = 0;
    while (i < allTeams.length - 1) {
      const t1 = allTeams[i];
      const t2 = allTeams[i + 1];

      const gap = t2.index - t1.index;
      if (gap > 10000) {
        i++;
        continue;
      }

      const combinedStart = t1.index;
      const combinedEnd = Math.min(payloadText.length, t2.index + t2[0].length + 3000);
      const combined = payloadText.substring(combinedStart, combinedEnd);

      const searchBackStart = Math.max(0, t1.index - 1000);
      const searchBack = payloadText.substring(searchBackStart, t1.index);
      
      const matchIdRegex = /"(\d{19})"/g;
      let matchIds = [];
      let mIdMatch;
      while ((mIdMatch = matchIdRegex.exec(searchBack)) !== null) {
        matchIds.push(mIdMatch[1]);
      }
      const matchId = matchIds.length > 0 ? matchIds[matchIds.length - 1] : "UNKNOWN";

      const statusRegex = /"(MatchIng|NoStart|Finished|MatchEnd|MatchEnded|MatchNotSt)"/;
      const statusMatch = combined.match(statusRegex);
      const rawStatus = statusMatch ? statusMatch[1] : "UNKNOWN";

      const statusMap: Record<string, string> = {
        "MatchIng": "LIVE",
        "MatchNotSt": "UPCOMING",
        "NoStart": "UPCOMING",
        "Finished": "FINISHED",
        "MatchEnd": "FINISHED",
        "MatchEnded": "FINISHED"
      };
      const finalStatus = statusMap[rawStatus] || rawStatus;

      const m3u8Regex = /(https:\/\/live-pull\.aisports\.mobi\/[^"\s\\]+\.m3u8[^"\s\\]*)/;
      const m3u8Match = combined.match(m3u8Regex);
      const m3u8Url = m3u8Match ? m3u8Match[1] : null;

      const channels: Record<string, string> = {};
      const channelRegex = /"(Channel \d+)"\s*,\s*"(https?:\/\/[^"]+)"/g;
      let chMatch;
      while ((chMatch = channelRegex.exec(combined)) !== null) {
        const chName = chMatch[1];
        const chUrl = chMatch[2];
        channels[chName] = chUrl;

        const m3u8InUrl = chUrl.match(/[?&]url=(https?:\/\/[^&]+\.m3u8)/);
        if (m3u8InUrl) {
          channels[`${chName}_direct`] = m3u8InUrl[1];
        }
      }

      matches.push({
        id: matchId,
        home_team: t1[2],
        away_team: t2[2],
        home_score: t1[3] || "?",
        away_score: t2[3] || "?",
        status: finalStatus,
        m3u8_url: m3u8Url,
        channels: channels,
        scraped_at: new Date().toISOString()
      });

      i += 2;
    }

    return matches;
  }
}
