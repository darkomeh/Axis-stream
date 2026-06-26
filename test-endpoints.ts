import axios from 'axios';

async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  try {
     let m = await axios.get(backupBase + '/trending', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP trending keys:', Object.keys(m.data));
  } catch(e:any) { console.log('BACKUP trending error:', e.message); }

  try {
     let m = await axios.get(backupBase + '/homepage', { params: { apikey: 'Godszeal' }});
     console.log('BACKUP homepage keys:', Object.keys(m.data));
  } catch(e:any) { console.log('BACKUP homepage error:', e.message); }
}

run();
