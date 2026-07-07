import fs from 'fs';
const payloadText = fs.readFileSync('payload.json', 'utf8');

const matches = [];

const regex = /"(\d{15,20})"[\s\S]{1,500}?"(\d{15,20})"[\s\S]{1,500}?"(MatchNotStart|MatchEnded|MatchIng|MatchNotSt|MatchEnd)"[\s\S]{1,300}?(https?:\/\/[^"]+\.m3u8[^"]*)/g;

let m;
while ((m = regex.exec(payloadText)) !== null) {
  matches.push(m);
}
console.log("Found matches with regex:", matches.length);
