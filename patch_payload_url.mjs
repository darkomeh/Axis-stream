import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'payloadUrl = "https://sportslivetoday.com/_payload.json?live&sportType=" + sportType;',
  'payloadUrl = "https://sportslivetoday.com/_payload.json?live";'
);

code = code.replace(
  'payloadUrl = url.origin + "/_payload.json?live&sportType=" + sportType;',
  'payloadUrl = url.origin + "/_payload.json?live";'
);

fs.writeFileSync(path, code);
console.log("Patched payload URL");
