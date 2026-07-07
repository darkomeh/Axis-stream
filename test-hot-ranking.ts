import axios from 'axios';
async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  try {
     let m = await axios.get(mainBase + '/hot', { params: { apikey: 'Godszeal' }});
     console.log('MAIN /hot movies:', m.data.data?.movie?.slice(0,3)?.map((x:any)=>x.title));
     console.log('MAIN /hot series:', m.data.data?.tv?.slice(0,3)?.map((x:any)=>x.title));
  } catch(e:any) { console.log('MAIN Error /hot:', e.message); }
  
  try {
     let m = await axios.get(backupBase + '/hot-movies-series', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP /hot-movies-series movies:', m.data.data?.movies?.slice(0,3)?.map((x:any)=>x.title));
     console.log('BACKUP /hot-movies-series series:', m.data.data?.series?.slice(0,3)?.map((x:any)=>x.title));
  } catch(e:any) { console.log('BACKUP Error /hot:', e.message); }
}
run();
