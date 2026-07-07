import fs from 'fs';
const path = 'backend/config/settings.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '"Referer": "https://thesports.today/",',
  '"Referer": "https://sportslivetoday.com/",'
).replace(
  '"Origin": "https://thesports.today",',
  '"Origin": "https://sportslivetoday.com",'
);

fs.writeFileSync(path, code);
console.log("Patched settings");
