
const API_KEY = "Godszeal";
const BASE_URL = "https://gzmovieboxapi.vercel.app/api";

async function test() {
  const url = `${BASE_URL}/homepage?apikey=${API_KEY}`;
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Data keys:", Object.keys(json.data || {}));
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
