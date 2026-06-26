import axios from 'axios';

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  try {
     let m = await axios.get(mainBase + '/browse', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('MAIN browse:', Object.keys(m.data));
  } catch(e:any) { console.log('MAIN Error:', e.message); }

  try {
     let m = await axios.get(mainBase + '/hot', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('MAIN hot:', Object.keys(m.data));
  } catch(e:any) { console.log('MAIN Error hot:', e.message); }
  
  try {
     let m = await axios.get(mainBase + '/trending', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('MAIN trending:', Object.keys(m.data));
  } catch(e:any) { console.log('MAIN Error trending:', e.message); }
  
    try {
     let m = await axios.get(backupBase + '/hot-movies-series', { params: { apikey: 'Godszeal', genre: 'Horror', subjectType: 1 }});
     console.log('BACKUP hot:', Object.keys(m.data));
  } catch(e:any) { console.log('BACKUP Error hot:', e.message); }
}

run();
