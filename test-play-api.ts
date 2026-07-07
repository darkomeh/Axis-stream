
import axios from "axios";

const TARGET_API = 'https://gzmovieboxapi.vercel.app/api';
const API_KEY = 'Godszeal';

const api = axios.create();

async function test() {
  try {
    console.log("Fetching trending from Vercel...");
    const trendingRes = await api.get(`${TARGET_API}/homepage?apikey=${API_KEY}`);
    const trendingList = trendingRes.data?.data?.topPickList || [];
    console.log("Trending items found:", trendingList.length);
    
    if (trendingList.length > 0) {
      const firstItem = trendingList[0];
      const subjectId = firstItem.subjectId || firstItem.id;
      console.log(`Testing media for subjectId: ${subjectId} (${firstItem.title})`);
      
      try {
        const mediaRes = await api.get(`${TARGET_API}/media?subjectId=${subjectId}&apikey=${API_KEY}`);
        console.log("Media response status:", mediaRes.status);
        console.log("Media data keys:", Object.keys(mediaRes.data || {}));
        if (mediaRes.data?.data?.streams) {
            console.log("Streams found:", mediaRes.data.data.streams.length);
        }
      } catch (e: any) {
        console.error("Media request failed:", e.message);
      }
    }
  } catch (e: any) {
    console.error("Trending request failed:", e.message);
  }
}

test();
