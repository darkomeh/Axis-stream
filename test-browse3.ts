import axios from 'axios';

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  
  try {
     let m = await axios.get(mainBase + '/browse', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('MAIN browse data keys:', Object.keys(m.data.data));
     if (m.data.data.items) {
        console.log('MAIN browse items length:', m.data.data.items.length);
        console.log('MAIN browse first item:', Object.keys(m.data.data.items[0]), m.data.data.items[0].genre);
     } else if (m.data.data.list) {
         console.log('MAIN browse list length:', m.data.data.list.length);
         console.log('MAIN browse first item:', Object.keys(m.data.data.list[0]), m.data.data.list[0].genre);
     } else {
        console.log('MAIN browse data:', JSON.stringify(m.data).substring(0, 500));
     }
  } catch(e:any) { console.log('MAIN Error:', e.message); }
}

run();
