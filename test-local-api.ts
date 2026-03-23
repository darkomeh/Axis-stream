import axios from 'axios';

async function test() {
  try {
    console.log("Testing /api/homepage...");
    const response = await axios.get('http://localhost:3000/api/homepage');
    console.log("Status:", response.status);
    console.log("Data keys:", Object.keys(response.data));
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
    }
  }
}

test();
