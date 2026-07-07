async function test() {
  const BASE_URL = "https://movieapi.xcasper.space/api";
  const API_KEY = "Godszeal";
  const url = `${BASE_URL}/homepage?apikey=${API_KEY}`;
  console.log("Fetching:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 100));
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
