import fs from 'fs';
const path = 'backend/proxy/engine.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const proxyUrl = `${reqBaseUrl}${config.PROXY_SEGMENT_PREFIX}?url=${encodeURIComponent(originalUrl)}`;',
  'const proxyUrl = `/api/proxy/segment?url=${encodeURIComponent(originalUrl)}`;'
);

fs.writeFileSync(path, code);
console.log("Patched rewrite logic");
