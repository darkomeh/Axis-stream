import fs from 'fs';
const payloadText = fs.readFileSync('payload.json', 'utf8');

const matches = [];
const teamPattern = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
const allTeams = [];
let match;
while ((match = teamPattern.exec(payloadText)) !== null) {
  allTeams.push(match);
}

console.log("allTeams length:", allTeams.length);

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

  const statusRegex = /"(MatchIng|NoStart|Finished|MatchEnd|MatchEnded|MatchNotSt|MatchNotStart)"/;
  const statusMatch = combined.match(statusRegex);
  const rawStatus = statusMatch ? statusMatch[1] : "UNKNOWN";

  const m3u8Regex = /(https:\/\/live-pull\.aisports\.mobi\/[^"\s\\]+\.m3u8[^"\s\\]*)/;
  const m3u8Match = combined.match(m3u8Regex);
  const m3u8Url = m3u8Match ? m3u8Match[1] : null;

  matches.push({
    id: matchId,
    home_team: t1[2],
    away_team: t2[2],
    status: rawStatus,
    m3u8_url: m3u8Url
  });

  i += 2;
}

console.log("Matches found:", matches.length);
console.log(matches);
