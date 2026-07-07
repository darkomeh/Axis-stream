import axios from 'axios';
async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  try {
     let m = await axios.get(mainBase + '/hot', { params: { apikey: 'Godszeal' }});
     console.log('MAIN /hot movies:', m.data.data?.movie?.slice(0,10)?.map((x:any)=>x.title));
     console.log('MAIN /hot series:', m.data.data?.tv?.slice(0,10)?.map((x:any)=>x.title));
  } catch(e:any) { console.log('MAIN Error /hot:', e.message); }
}
run();
