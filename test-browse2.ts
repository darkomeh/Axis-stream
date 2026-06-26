import axios from 'axios';

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  try {
     let m = await axios.get(mainBase + '/browse', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('MAIN browse length:', m.data.data.list?.length, 'first item genre:', m.data.data.list?.[0]?.genre);
  } catch(e:any) { console.log('MAIN Error:', e.message); }
  
  try {
     let m = await axios.get(backupBase + '/search', { params: { apikey: 'Godszeal', query: 'Horror', subjectType: 'MOVIE' }});
     console.log('BACKUP search (as browse fallback) length:', m.data.data.items?.length, 'first item genre:', m.data.data.items?.[0]?.genre);
  } catch(e:any) { console.log('BACKUP Error:', e.message); }
}

run();
