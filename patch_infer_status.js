import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

const replacement = `
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
`;

code = code.replace(
  'const finalStatus = statusMap[rawStatus] || rawStatus;',
  replacement
);

fs.writeFileSync(path, code);
