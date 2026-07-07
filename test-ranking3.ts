import axios from 'axios';
async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';
  try {
     let m = await axios.get(backupBase + '/ranking', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP /ranking keys:', Object.keys(m.data.data || {}));
     console.log(JSON.stringify(m.data.data).substring(0, 300));
  } catch(e:any) { console.log('BACKUP Error /ranking:', e.message); }
}
run();
