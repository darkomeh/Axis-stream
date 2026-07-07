import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const matchData = this.resolveNuxtRef(payload, i);\n          if (!matchData || typeof matchData !== "object") continue;',
  'const matchData = this.resolveNuxtRef(payload, i);\n          if (!matchData || typeof matchData !== "object") continue;\n\n          const matchSport = matchData.type || "football";\n          if (requestedSport !== "all" && matchSport !== requestedSport && requestedSport) continue;'
);

fs.writeFileSync(path, code);
console.log("Patched sport filter");
