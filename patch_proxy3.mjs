import fs from 'fs';
const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'if (isM3u8) {',
  'if (isM3u8 && response.ok) {'
);

fs.writeFileSync(path, code);
console.log("Patched proxy isM3u8 status check");
