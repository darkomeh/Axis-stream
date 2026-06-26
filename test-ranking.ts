import axios from 'axios';
async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  try {
     let m = await axios.get(mainBase + '/ranking', { params: { apikey: 'Godszeal' }});
     console.log('MAIN /ranking:', m.data.data?.list?.slice(0,5)?.map((x:any)=>x.title) || m.data.data?.slice(0,5)?.map((x:any)=>x.title) || m.data?.data);
  } catch(e:any) { console.log('MAIN Error /ranking:', e.message); }
}
run();
