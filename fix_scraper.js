import fs from 'fs';
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const statusRegex = /"(MatchIng|NoStart|Finished|MatchEnd|MatchEnded|MatchNotSt)"/;',
  'const statusRegex = /"(MatchIng|NoStart|Finished|MatchEnd|MatchEnded|MatchNotSt|MatchNotStart)"/;'
);

code = code.replace(
  '"MatchNotSt": "UPCOMING",',
  '"MatchNotSt": "UPCOMING",\n        "MatchNotStart": "UPCOMING",'
);

// We should also ensure we don't return 0 matches if there are parsing errors.
fs.writeFileSync(path, code);
console.log("Fixed matchScraper.ts");
