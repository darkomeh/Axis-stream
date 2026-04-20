const axios = require('axios');

async function testGzApiWithReferer() {
  const BASE_URL = "https://gzmovieboxapi.vercel.app/api";
  const API_KEY = "Godszeal";
  
  try {
    const response = await axios.get(`${BASE_URL}/homepage`, {
      params: { apikey: API_KEY },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://gzmovieboxapi.vercel.app/'
      }
    });
    console.log("Status:", response.status);
    console.log("Data keys:", Object.keys(response.data));
  } catch (error) {
    console.error("Error Status:", error.response?.status);
    console.error("Error Data:", error.response?.data);
  }
}

testGzApiWithReferer();
