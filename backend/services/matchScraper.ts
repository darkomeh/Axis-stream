import axios from "axios";
import { config } from "../config/settings";
import { Match } from "../models/types";
import { logger } from "../utils/logger";

export class MatchScraper {
  static resolveNuxtRef(payload: any[], ref: any, depth = 0, maxDepth = 12, visited = new Set<number>()): any {
    if (depth > maxDepth || visited.has(ref)) {
      return null;
    }
    
    if (typeof ref !== "number" || ref < 0 || ref >= payload.length) {
      return ref;
    }

    visited.add(ref);
    const value = payload[ref];

    if (value === null || typeof value !== "object") {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveNuxtRef(payload, item, depth + 1, maxDepth, new Set(visited)));
    }

    const result: any = {};
    for (const [key, val] of Object.entries(value)) {
      if (!key.startsWith("$")) {
        result[key] = this.resolveNuxtRef(payload, val, depth + 1, maxDepth, new Set(visited));
      }
    }
    return result;
  }

  static extractM3u8FromUrl(url: string): string | null {
    if (!url) return null;
    if (url.includes(".m3u8") && !url.includes("url=")) {
      return url;
    }
    if (url.includes(".m3u8") && url.includes("url=")) {
      const m = url.match(/[?&]url=(https?:\/\/[^&]+\.m3u8)/);
      if (m) return m[1];
    }
    if (url.startsWith("http")) return url;
    return null;
  }

  static async scrapeLiveMatches(baseDomain: string, sportType: string = "football"): Promise<Match[]> {
    let payloadUrl = "";
    if (baseDomain.includes("moviebox")) {
      payloadUrl = "https://sportslivetoday.com/_payload.json?live";
    } else {
      const url = new URL(baseDomain);
      payloadUrl = url.origin + "/_payload.json?live";
    }

    logger.info("Fetching match data from: " + payloadUrl);

    for (let attempt = 1; attempt <= config.MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(payloadUrl, {
          headers: config.BROWSER_HEADERS,
          timeout: config.REQUEST_TIMEOUT,
          responseType: "json"
        });

        if (response.status === 200) {
          const payload = response.data;
          if (Array.isArray(payload)) {
            const matches = this.parseNuxtPayload(payload, sportType);
            logger.info("Found " + matches.length + " matches for " + sportType);
            return matches;
          }
        }
      } catch (e: any) {
        logger.warn("Attempt " + attempt + "/" + config.MAX_RETRIES + " failed: " + e.message);
        if (attempt < config.MAX_RETRIES) {
          await new Promise(r => setTimeout(r, 1000));
        } else {
          logger.error("Failed to fetch matches after " + config.MAX_RETRIES + " attempts");
        }
      }
    }
    return [];
  }

  private static parseNuxtPayload(payload: any[], requestedSport: string): Match[] {
    const matches: Match[] = [];

    for (let i = 0; i < payload.length; i++) {
      const item = payload[i];
      if (item && typeof item === "object" && "team1" in item && "team2" in item) {
        try {
          const matchData = this.resolveNuxtRef(payload, i);
          if (!matchData || typeof matchData !== "object") continue;

          const matchSport = matchData.type || "football";
          if (requestedSport !== "all" && matchSport !== requestedSport && requestedSport) continue;

          const team1 = matchData.team1 || {};
          const team2 = matchData.team2 || {};

          let primaryM3u8 = null;
          const channels: Record<string, string> = {};

          const playPath = matchData.playPath || "";
          if (playPath && playPath.includes(".m3u8")) {
             primaryM3u8 = playPath;
          }

          if (matchData.playSource && Array.isArray(matchData.playSource)) {
            matchData.playSource.forEach((ch: any) => {
              if (typeof ch === "object") {
                 const chTitle = ch.title || "Channel";
                 const chPath = ch.path || "";
                 if (chPath) {
                    const m3u8 = this.extractM3u8FromUrl(chPath);
                    if (m3u8) {
                      channels[chTitle + "_direct"] = m3u8;
                      if (!primaryM3u8) primaryM3u8 = m3u8;
                    } else {
                      channels[chTitle] = chPath;
                    }
                 }
              }
            });
          }

          const rawStatus = matchData.status || "Unknown";
          const statusMap: Record<string, string> = {
            "MatchNotStart": "UPCOMING",
            "MatchIng": "LIVE",
            "MatchEnded": "FINISHED",
            "MatchEnd": "FINISHED",
            "HalfTime": "HALF_TIME",
            "NoStart": "UPCOMING",
            "Finished": "FINISHED",
          };

          let startTimeMs = matchData.startTime || "0";
          let startTime = parseInt(startTimeMs);
          if (isNaN(startTime) || startTime <= 0) startTime = 0;

          // Extract Streams Array (New v3.0 logic)
          const streams: any[] = [];
          if (primaryM3u8) {
            streams.push({
              name: "Primary HD",
              url: primaryM3u8,
              type: "m3u8",
              quality: "HD"
            });
          }
          if (matchData.playSource && Array.isArray(matchData.playSource)) {
            matchData.playSource.forEach((ch: any) => {
              if (typeof ch === "object") {
                 const chTitle = ch.title || "Channel";
                 const chPath = ch.path || "";
                 if (chPath) {
                    const m3u8 = this.extractM3u8FromUrl(chPath);
                    if (m3u8) {
                      streams.push({
                          name: chTitle,
                          url: m3u8,
                          type: "m3u8",
                          quality: "HD"
                      });
                    } else {
                      streams.push({
                          name: chTitle,
                          url: chPath,
                          type: "player",
                          quality: "?"
                      });
                    }
                 }
              }
            });
          }

          // Extract Period Scores
          const t1Info = matchData.teamMatchInfo1 || {};
          const t2Info = matchData.teamMatchInfo2 || {};
          const periodScores: any[] = [];
          const t1Scores = t1Info.scores || [];
          const t2Scores = t2Info.scores || [];
          if (Array.isArray(t1Scores) && Array.isArray(t2Scores) && t1Scores.length > 0 && t2Scores.length > 0) {
            const periodNames = ["1H", "2H", "ET1", "ET2", "P1", "P2", "P3"];
            for(let j=0; j<Math.min(t1Scores.length, t2Scores.length); j++) {
              periodScores.push({
                name: j < periodNames.length ? periodNames[j] : `P${j+1}`,
                home: parseInt(t1Scores[j]) || 0,
                away: parseInt(t2Scores[j]) || 0
              });
            }
          }

          // Extract Odds
          const oddsInfo = matchData.oddsInfo || {};
          const oddsList: any[] = [];
          if (oddsInfo && Array.isArray(oddsInfo.oddsList)) {
             oddsInfo.oddsList.forEach((odd: any) => {
                const typeMap: Record<number, string> = {1: "1", 2: "X", 3: "2"};
                const oddType = typeMap[odd.type] || String(odd.type);
                oddsList.push({
                  type: oddType,
                  value: odd.odds || "-"
                });
             });
          }

          matches.push({
            id: String(matchData.id || "UNKNOWN"),
            sport_type: matchSport,
            league: matchData.league || "",
            round: matchData.matchRound || "",
            home_team: team1.name || "Unknown",
            home_abbr: team1.abbreviation || "",
            home_logo: team1.avatar || "",
            away_team: team2.name || "Unknown",
            away_abbr: team2.abbreviation || "",
            away_logo: team2.avatar || "",
            home_score: String(team1.score ?? "-"),
            away_score: String(team2.score ?? "-"),
            status: statusMap[rawStatus] || rawStatus,
            raw_status: rawStatus,
            status_live: matchData.statusLive || "",
            start_time: startTime > 0 ? new Date(startTime).toISOString() : undefined,
            m3u8_url: primaryM3u8,
            channels: channels,
            streams: streams,
            period_scores: periodScores,
            odds: oddsList,
            highlights: matchData.highlights || [],
            scraped_at: new Date().toISOString()
          });

        } catch (err) {
          continue;
        }
      }
    }
    return matches;
  }
}
