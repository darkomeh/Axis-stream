import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

const regexToReplace = /const rawStatus = matchData\.status \|\| "Unknown";[\s\S]*?m3u8_url: primaryM3u8,\n\s*channels: channels,\n\s*scraped_at: new Date\(\)\.toISOString\(\)\n\s*}\);/;

const replacement = `const rawStatus = matchData.status || "Unknown";
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
                name: j < periodNames.length ? periodNames[j] : \`P\${j+1}\`,
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
          });`;

code = code.replace(regexToReplace, replacement);

fs.writeFileSync(path, code);
console.log("Patched scraper again");
