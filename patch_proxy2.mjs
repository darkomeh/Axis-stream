import fs from 'fs';
const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '"Referer": "https://movieapi.xcasper.space/",',
  '"Referer": "https://sportslivetoday.com/",\n        "Origin": "https://sportslivetoday.com",'
);

fs.writeFileSync(path, code);
console.log("Patched proxy referer");
