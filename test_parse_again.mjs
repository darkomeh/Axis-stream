import fs from 'fs';
const payloadText = fs.readFileSync('payload.json', 'utf8');

const teamPattern = /"(\d{15,20})"\s*,\s*"([^"]{2,40})"(?:\s*,\s*"(\d+)")?\s*,\s*"(https:\/\/pbcdn\.aoneroom\.com\/[^"\s]+)"/g;
let match;
let count = 0;
while ((match = teamPattern.exec(payloadText)) !== null) {
  count++;
}
console.log("Count is:", count);
