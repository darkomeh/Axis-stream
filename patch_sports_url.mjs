import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;',
  'const proxyUrl = `/api/proxy/playlist.m3u8?url=${encodeURIComponent(targetUrl)}`;'
);

fs.writeFileSync(path, code);
console.log("Patched Sports proxy url");
