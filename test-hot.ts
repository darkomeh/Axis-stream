import axios from 'axios';

async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  try {
     let m = await axios.get(backupBase + '/hot', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP /hot:', Object.keys(m.data));
  } catch(e:any) { console.log('BACKUP Error /hot:', e.response?.status, e.message); }
}

run();
