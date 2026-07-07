import fs from 'fs';
const payloadText = fs.readFileSync('payload.json', 'utf8');

const teamPattern = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
const allTeams = [];

let match;
while ((match = teamPattern.exec(payloadText)) !== null) {
  allTeams.push(match);
}

console.log('Found:', allTeams.length);
if (allTeams.length > 0) {
  console.log(allTeams[0]);
} else {
  // Try relaxed regex
  const regex = /"(\d{15,20})".*?"([^"]{2,40})".*?"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
  console.log("Alternative regex test:");
  const alt = [];
  while ((match = regex.exec(payloadText)) !== null) {
    alt.push(match);
  }
  console.log('Found alt:', alt.length);
}
