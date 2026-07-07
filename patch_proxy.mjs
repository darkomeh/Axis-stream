import fs from 'fs';
const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const targetStart = code.indexOf('app.get("/api/proxy", async (req, res) => {');
if (targetStart === -1) throw new Error("Could not find /api/proxy");

const nextRoute = code.indexOf('app.get("/api/system/status"', targetStart);
if (nextRoute === -1) throw new Error("Could not find next route");

const newRoute = `app.get("/api/proxy", async (req, res) => {
  const videoUrl = req.query.url as string;
  if (!videoUrl) {
    return res.status(400).send("URL is required");
  }

  if (!isUrlAllowed(videoUrl)) {
    return res.status(403).send("Forbidden URL access");
  }

  try {
    const range = req.headers.range;
    
    const response = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://movieapi.xcasper.space/",
        "Accept": "*/*",
        "Connection": "keep-alive",
        ...(range && { "Range": range }),
      },
    });

    if (!response.ok && response.status !== 206) {
        console.warn(\`[Proxy] Upstream returned status \${response.status} for \${videoUrl}\`);
    }

    const contentType = response.headers.get('content-type') || '';
    const isM3u8 = videoUrl.includes('.m3u8') || contentType.includes('mpegurl') || contentType.includes('m3u8');

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (isM3u8) {
      const text = await response.text();
      const baseUrl = new URL(videoUrl);
      
      const rewritten = text.split('\\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line;
        
        let absoluteUrl = trimmed;
        if (!trimmed.startsWith('http')) {
           try {
             absoluteUrl = new URL(trimmed, baseUrl).toString();
           } catch (e) {
             absoluteUrl = baseUrl.toString().substring(0, baseUrl.toString().lastIndexOf('/') + 1) + trimmed;
           }
        }
        return \`/api/proxy?url=\${encodeURIComponent(absoluteUrl)}\`;
      }).join('\\n');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.status(response.status).send(rewritten);
      return;
    }

    const headersToForward = [
      'content-type',
      'content-length',
      'content-range',
      'accept-ranges',
      'cache-control',
      'last-modified',
      'etag'
    ];
    headersToForward.forEach(h => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });
    
    res.status(response.status);

    if (!response.body) throw new Error("No response body");

    const { Readable } = await import("stream");
    const reader = Readable.fromWeb(response.body as any);
    
    reader.on('error', (err) => {
       console.error("[Proxy Stream Error]:", err);
       if (!res.headersSent) res.status(500).end();
    });

    reader.pipe(res);

  } catch (error: any) {
    console.error("[Proxy] Error:", error.message);
    if (!res.headersSent) {
      res.status(500).send(error.message);
    }
  }
});

`;

code = code.substring(0, targetStart) + newRoute + code.substring(nextRoute);
fs.writeFileSync(path, code);
console.log("Patched proxy route");
