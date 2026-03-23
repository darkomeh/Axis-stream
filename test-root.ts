import axios from 'axios';

async function test() {
  try {
    console.log("Testing /...");
    const response = await axios.get('http://localhost:3000/');
    console.log("Status:", response.status);
    console.log("Data length:", response.data.length);
    console.log("Data starts with:", response.data.substring(0, 100));
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Response status:", error.response.status);
    }
  }
}

test();
