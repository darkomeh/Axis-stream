import axios from 'axios';
async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';
  try {
     let m = await axios.get(backupBase + '/hot-movies-series', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP /hot-movies-series keys of data:', Object.keys(m.data.data));
  } catch(e:any) { console.log('BACKUP Error /hot:', e.message); }
}
run();
