import axios from 'axios';

const STREAM_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "*/*",
    "Referer": "https://sportslivetoday.com/",
    "Origin": "https://sportslivetoday.com",
    "Connection": "keep-alive",
};

async function test() {
  const resp = await axios.get("https://sportslivetoday.com/_payload.json?live&sportType=football");
  const data = resp.data;
  let targetUrl = null;
  for (const item of data) {
    if (item && item.playPath) {
      targetUrl = item.playPath;
      break;
    }
  }
  
  if (targetUrl) {
    console.log("Found URL:", targetUrl);
    try {
      const resp2 = await axios.get(targetUrl, { headers: STREAM_HEADERS });
      console.log("Status:", resp2.status);
      console.log("Body:", resp2.data.substring(0, 200));
    } catch(e) {
      console.log("Error status:", e.response?.status);
    }
  }
}
test();
