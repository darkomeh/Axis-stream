import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
    const teamPattern = /"(\\d{15,20})"\\s*,\\s*"([^"]{2,40})"(?:\\s*,\\s*"(\\d+)")?\\s*,\\s*"(https:\\/\\/pbcdn\\.aoneroom\\.com\\/[^"\\s]+)"/g;
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
      
      const matchIdRegex = /"(\\d{19})"/g;
      let matchIds = [];
      let mIdMatch;
      while ((mIdMatch = matchIdRegex.exec(searchBack)) !== null) {
        matchIds.push(mIdMatch[1]);
      }
      const matchId = matchIds.length > 0 ? matchIds[matchIds.length - 1] : "UNKNOWN";

      const statusRegex = /"(MatchIng|NoStart|Finished|MatchEnd|MatchEnded|MatchNotSt|MatchNotStart)"/;
      const statusMatch = combined.match(statusRegex);
      const rawStatus = statusMatch ? statusMatch[1] : "UNKNOWN";

      const statusMap: Record<string, string> = {
        "MatchIng": "LIVE",
        "MatchNotSt": "UPCOMING",
        "MatchNotStart": "UPCOMING",
        "NoStart": "UPCOMING",
        "Finished": "FINISHED",
        "MatchEnd": "FINISHED",
        "MatchEnded": "FINISHED"
      };

      const timeRegex = /"(\\d{13})"/;
      const timeMatch = combined.match(timeRegex);
      const startTime = timeMatch ? parseInt(timeMatch[1]) : 0;

      let finalStatus = statusMap[rawStatus] || rawStatus;
      
      if (finalStatus === "UNKNOWN" && startTime > 0) {
        const now = Date.now();
        if (now >= startTime && now <= startTime + 7200000) {
           finalStatus = "LIVE";
        } else if (now < startTime) {
           finalStatus = "UPCOMING";
        } else {
           finalStatus = "FINISHED";
        }
      }

      const m3u8Regex = /(https:\\/\\/live-pull\\.aisports\\.mobi\\/[^"\\s\\\\]+\\.m3u8[^"\\s\\\\]*)/;
      const m3u8Match = combined.match(m3u8Regex);
      const m3u8Url = m3u8Match ? m3u8Match[1] : null;

      const channels: Record<string, string> = {};
      const channelRegex = /"(Channel \\d+)"\\s*,\\s*"(https?:\\/\\/[^"]+)"/g;
      let chMatch;
      while ((chMatch = channelRegex.exec(combined)) !== null) {
        const chName = chMatch[1];
        const chUrl = chMatch[2];
        channels[chName] = chUrl;
        const m3u8InUrl = chUrl.match(/[?&]url=(https?:\\/\\/[^&]+\\.m3u8)/);
        if (m3u8InUrl) {
          channels[\`\${chName}_direct\`] = m3u8InUrl[1];
        }
      }

      matches.push({
        id: matchId,
        home_team: t1[2],
        away_team: t2[2],
        home_score: t1[3] || "?",
        away_score: t2[3] || "?",
        home_logo: t1[4],
        away_logo: t2[4],
        status: finalStatus,
        start_time: startTime > 0 ? new Date(startTime).toISOString() : undefined,
        m3u8_url: m3u8Url,
        channels: channels,
        scraped_at: new Date().toISOString()
      });

      i += 2;
    }

    return matches;
`;

const parseStart = code.indexOf('const teamPattern =');
const parseEnd = code.lastIndexOf('return matches;');
if (parseStart !== -1 && parseEnd !== -1) {
  code = code.substring(0, parseStart) + replacement + code.substring(parseEnd + 'return matches;'.length);
  fs.writeFileSync(path, code);
  console.log("Updated matchScraper.ts successfully");
} else {
  console.log("Could not find the target code to replace");
}
