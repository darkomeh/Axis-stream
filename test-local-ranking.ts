import axios from 'axios';
async function run() {
  try {
     let m = await axios.get('http://localhost:3000/api/ranking');
     console.log('Local /api/ranking:', m.data.map((x:any)=>x.title).join(', '));
  } catch(e:any) { console.log('Error:', e.message); }
}
run();
