import fs from 'fs';
const path = 'backend/api/routes.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain);',
  'const sport = (req.query.sport as string) || "football";\n    const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain, sport);'
);

code = code.replace(
  'const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain);',
  'const sport = (req.query.sport as string) || "football";\n    const matches = await MatchScraper.scrapeLiveMatches(domainInfo.domain, sport);'
);

fs.writeFileSync(path, code);
console.log("Patched api routes for sports");
