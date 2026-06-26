import axios from 'axios';
async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  try {
     let m = await axios.get(mainBase + '/ranking', { params: { apikey: 'Godszeal' }});
     console.log('MAIN /ranking keys:', Object.keys(m.data.data || {}));
     console.log(JSON.stringify(m.data.data).substring(0, 300));
  } catch(e:any) { console.log('MAIN Error /ranking:', e.message); }
}
run();
