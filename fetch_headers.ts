import axios from 'axios';

async function fetchHeaders(url: string) {
  try {
    const res = await axios.head(url);
    console.log(res.headers);
  } catch (e: any) {
    console.error("Fetch failed:", e.message);
  }
}

const url = process.argv[2];
if (url) {
  fetchHeaders(url);
}
