const https = require('https');

function getUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', err => resolve(''));
  });
}

async function main() {
  const m3u8Url = "https://dq2a9ghraf7sw.cloudfront.net/en-vtt/index.m3u8";
  const playlist = await getUrl(m3u8Url);
  console.log("PLAYLIST:");
  console.log(playlist);
  
  // Find a segment name ending in .vtt
  const lines = playlist.split('\n');
  const segmentLine = lines.find(line => line.trim().endsWith('.vtt'));
  if (segmentLine) {
    const segmentUrl = `https://dq2a9ghraf7sw.cloudfront.net/en-vtt/${segmentLine.trim()}`;
    console.log(`Fetching segment: ${segmentUrl}`);
    const vttContent = await getUrl(segmentUrl);
    console.log("VTT CONTENT:");
    console.log(vttContent);
  } else {
    console.log("No .vtt segment found in playlist.");
  }
}

main();
