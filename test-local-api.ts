import axios from 'axios';

async function test() {
  try {
    const subjectId = "2105648425101411352"; // The Accountant 2
    console.log(`Testing /api/rich-detail for Movie: ${subjectId}...`);
    const response = await axios.get(`http://localhost:3000/api/rich-detail?subjectId=${subjectId}`);
    console.log("Status:", response.status);
    console.log("Data:", JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

test();
