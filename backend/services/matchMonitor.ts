import webpush from "web-push";
import fs from "fs";
import path from "path";
import { MatchScraper } from "./matchScraper.js";
import { DiscoveryService } from "./discoveryService.js";
import { db } from "../config/firebase.js";
import { logger } from "../utils/logger.js";
import { Match } from "../models/types.js";

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

interface StreamSession {
  matchId: string;
  startedAt: number;
  sportType: string;
  streamUrl: string | null;
}

export class MatchMonitor {
  private static previousMatches = new Map<string, Match>();
  private static streamSessions = new Map<string, StreamSession>();
  private static vapidKeys: VapidKeys | null = null;
  private static isInitialized = false;
  private static intervalId: NodeJS.Timeout | null = null;

  static init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load or generate VAPID keys
    const keysPath = path.join(process.cwd(), "vapid_keys.json");
    try {
      if (fs.existsSync(keysPath)) {
        this.vapidKeys = JSON.parse(fs.readFileSync(keysPath, "utf-8"));
        logger.info("VAPID keys loaded from existing vapid_keys.json");
      } else {
        const keys = webpush.generateVAPIDKeys();
        this.vapidKeys = {
          publicKey: keys.publicKey,
          privateKey: keys.privateKey
        };
        fs.writeFileSync(keysPath, JSON.stringify(this.vapidKeys, null, 2), "utf-8");
        logger.info("Successfully generated and saved new VAPID keys");
      }

      if (this.vapidKeys) {
        webpush.setVapidDetails(
          "mailto:greatmayuku2@gmail.com",
          this.vapidKeys.publicKey,
          this.vapidKeys.privateKey
        );
      }
    } catch (err: any) {
      logger.error(`Failed to initialize VAPID keys in MatchMonitor: ${err.message}`);
    }

    // Start background poller (pinger) running every 15 seconds
    this.intervalId = setInterval(() => this.runTick(), 15000);
    // Trigger initial tick after a small delay
    setTimeout(() => this.runTick(), 3000);
    logger.info("MatchMonitor background polling service initialized");
  }

  static getPublicKey(): string | null {
    return this.vapidKeys ? this.vapidKeys.publicKey : null;
  }

  static getStreamSession(matchId: string) {
    const session = this.streamSessions.get(matchId);
    if (!session) {
      // Lazy init if the match is active now
      return {
        matchId,
        startedAt: Date.now(),
        currentPlayhead: 0,
        liveEdgeTime: Date.now()
      };
    }
    const currentPlayhead = Math.max(0, (Date.now() - session.startedAt) / 1000);
    return {
      matchId,
      startedAt: session.startedAt,
      currentPlayhead,
      liveEdgeTime: Date.now()
    };
  }

  private static async runTick() {
    try {
      const domainInfo = await DiscoveryService.getBestDomain();
      const bestDomain = domainInfo?.domain || "https://sportslivetoday.com";
      
      // 1. Scrape live matches - keeps the streams warmed up and cached ("even if no one is watching")
      const currentMatches = await MatchScraper.scrapeLiveMatches(bestDomain, "all");
      
      // 2. Identify match events & update streaming session records
      for (const match of currentMatches) {
        if (!match.id) continue;

        const isLive = match.status === "LIVE" || match.status === "HALF_TIME";
        
        // Ensure StreamSession is active for any Live match so playheads are centralized
        if (isLive) {
          if (!this.streamSessions.has(match.id)) {
            const streamUrl = match.m3u8_url || (match.streams && match.streams.length > 0 ? match.streams[0].url : null);
            this.streamSessions.set(match.id, {
              matchId: match.id,
              startedAt: Date.now(),
              sportType: match.sport_type || "football",
              streamUrl
            });
            logger.info(`Stream Session started for Live match: ${match.home_team} vs ${match.away_team} (${match.id})`);
          }
        } else {
          // If match is finished or upcoming, remove its stream session to save memory
          if (this.streamSessions.has(match.id) && match.status === "FINISHED") {
            this.streamSessions.delete(match.id);
            logger.info(`Removed completed Stream Session for match ID: ${match.id}`);
          }
        }

        const prevMatch = this.previousMatches.get(match.id);
        if (!prevMatch) {
          // Store match state for comparison on next tick
          this.previousMatches.set(match.id, match);
          continue;
        }

        // Event Detection
        // A. KICKOFF: UPCOMING -> LIVE
        if (prevMatch.status === "UPCOMING" && isLive) {
          this.broadcastEvent(match, "kickoff", `Kickoff! ${match.home_team} vs ${match.away_team} has started!`);
        }

        // B. GOAL: Score changes while match is live
        if (isLive && prevMatch.status === match.status) {
          const prevHomeScore = parseInt(prevMatch.home_score) || 0;
          const prevAwayScore = parseInt(prevMatch.away_score) || 0;
          const currHomeScore = parseInt(match.home_score) || 0;
          const currAwayScore = parseInt(match.away_score) || 0;

          if (currHomeScore > prevHomeScore) {
            const scorer = match.home_team;
            this.broadcastEvent(match, "goal", `GOAL! ${scorer} scores! ${match.home_team} ${currHomeScore} - ${currAwayScore} ${match.away_team}`);
          } else if (currAwayScore > prevAwayScore) {
            const scorer = match.away_team;
            this.broadcastEvent(match, "goal", `GOAL! ${scorer} scores! ${match.home_team} ${currHomeScore} - ${currAwayScore} ${match.away_team}`);
          }
        }

        // C. FINAL SCORE: LIVE/HALF_TIME -> FINISHED
        if ((prevMatch.status === "LIVE" || prevMatch.status === "HALF_TIME") && match.status === "FINISHED") {
          this.broadcastEvent(match, "finished", `Full-time whistle! Final score: ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`);
        }

        // Update match state
        this.previousMatches.set(match.id, match);
      }

      // Cleanup finished matches from previous map that might not be in the scrape anymore
      const currentIds = new Set(currentMatches.map(m => m.id));
      for (const id of this.previousMatches.keys()) {
        if (!currentIds.has(id)) {
          this.previousMatches.delete(id);
        }
      }

    } catch (err: any) {
      logger.error(`Error in MatchMonitor runTick: ${err.message}`);
    }
  }

  private static async broadcastEvent(match: Match, eventType: string, message: string) {
    logger.info(`Broadcasting match event [${eventType}] for ${match.home_team} vs ${match.away_team}: ${message}`);
    
    try {
      const snapshot = await db.collection("match_alerts")
        .where("matchId", "==", match.id)
        .get();

      snapshot.forEach(async (docSnap) => {
        const alert = docSnap.data();
        const userId = alert.userId;

        // 1. Add an in-app notification record so it displays in their Notification Center
        try {
          await db.collection("notifications").add({
            userId,
            read: false,
            pinned: false,
            archived: false,
            timestamp: Date.now(),
            type: "trending", // Use compatible notification center type
            title: `Match Update: ${match.home_team} vs ${match.away_team}`,
            subtitle: message,
            priority: "high"
          });
        } catch (innerErr: any) {
          logger.warn(`Failed to save in-app notification for user ${userId}: ${innerErr.message}`);
        }

        // 2. Dispatch push notification via Service Worker Push API if subscription exists
        if (alert.pushSubscription) {
          try {
            const pushSub = alert.pushSubscription;
            const payload = JSON.stringify({
              title: `Match Update: ${match.home_team} vs ${match.away_team}`,
              body: message,
              matchId: match.id,
              eventType
            });
            await webpush.sendNotification(pushSub, payload);
          } catch (pushErr: any) {
            // If the subscription is expired or revoked, clean it up
            if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
              logger.info(`Web Push subscription expired for user ${userId}, deleting document`);
              // Optional: delete document from Firestore to keep db clean
            } else {
              logger.warn(`Failed to dispatch web push notification: ${pushErr.message}`);
            }
          }
        }
      });
    } catch (err: any) {
      logger.error(`Failed to dispatch match alert broadcast: ${err.message}`);
    }
  }
}
