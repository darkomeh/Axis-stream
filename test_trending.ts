import axios from 'axios';

async function testTrending() {
  try {
    const res = await axios.get('https://movieapi.xcasper.space/api/trending?page=0&perPage=18');
    const list = res.data?.data?.subjectList || [];
    console.log("Trending items count:", list.length);
    list.forEach((item: any, i: number) => {
      let poster = (typeof item.cover === 'string' ? item.cover : item.cover?.url) || 
                 item.poster || 
                 item.coverUrl || 
                 item.image || 
                 item.img || 
                 item.stills?.url ||
                 '';
      console.log(`Item ${i}: title=${item.title}, poster=${poster}`);
    });
  } catch (e: any) {
    console.error("Fetch failed:", e.message);
  }
}

testTrending();
