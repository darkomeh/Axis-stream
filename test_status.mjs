import fs from 'fs';
const payloadText = fs.readFileSync('payload.json', 'utf8');

const matches = [];
const teamPattern = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
const allTeams = [];
let match;
while ((match = teamPattern.exec(payloadText)) !== null) {
  allTeams.push(match);
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

  const statusMatch = combined.match(/"(Match[^"]*?|NoStart|Finished)"/g);
  console.log(`${t1[2]} vs ${t2[2]} status matches:`, statusMatch);

  i += 2;
}
