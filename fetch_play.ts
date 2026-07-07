import axios from 'axios';

async function fetchApi(url: string) {
  try {
    const res = await axios.get(url);
    console.log(JSON.stringify(res.data, null, 2));
  } catch (e: any) {
    console.error("Fetch failed:", e.message);
  }
}

const url = process.argv[2];
if (url) {
  fetchApi(url);
}
