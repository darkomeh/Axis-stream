import axios from 'axios';

async function measureSpeed(name: string, url: string, params: any) {
  try {
    const start = Date.now();
    const res = await axios.get(url, { params: { ...params, apikey: 'Godszeal' }, timeout: 10000 });
    const duration = Date.now() - start;
    if (res.data) {
       return { duration, data: res.data, status: res.status };
    }
  } catch (err: any) {
    return { duration: null, data: null, status: err.response?.status || 500, error: err.message };
  }
}

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  console.log('Fetching movie "Inception"...');
  let backupSearch = await measureSpeed('BACKUP Search', backupBase + '/search', { query: 'inception', subjectType: 'MOVIE', page: 1 });
  
  if (backupSearch.data && backupSearch.data.data && backupSearch.data.data.items && backupSearch.data.data.items.length > 0) {
      let id = backupSearch.data.data.items[0].subjectId;
      console.log(`Movie ID: ${id}`);
      
      console.log('--- Testing MAIN API ---');
      let mH = await measureSpeed('MAIN Hot', mainBase + '/hot', {});
      let mS = await measureSpeed('MAIN Search', mainBase + '/search', { keyword: 'inception', subjectType: 1 });
      let mD = await measureSpeed('MAIN Detail', mainBase + '/detail', { subjectId: id });
      let mP = await measureSpeed('MAIN Play', mainBase + '/play', { subjectId: id });
      
      console.log(`[MAIN] Hot: ${mH.duration}ms`);
      console.log(`[MAIN] Search: ${mS.duration}ms`);
      console.log(`[MAIN] Detail: ${mD.duration}ms`);
      console.log(`[MAIN] Playback: ${mP.duration}ms (Status: ${mP.status})`);
      
      console.log('\n--- Testing BACKUP API ---');
      let bH = await measureSpeed('BACKUP Hot', backupBase + '/hot-movies-series', {});
      let bS = await measureSpeed('BACKUP Search', backupBase + '/search', { query: 'inception', subjectType: 'MOVIE' });
      let bD = await measureSpeed('BACKUP Detail', backupBase + '/item-details', { subjectId: id });
      let bP = await measureSpeed('BACKUP Play', backupBase + '/playback', { subjectId: id });
      
      console.log(`[BACKUP] Hot: ${bH.duration}ms`);
      console.log(`[BACKUP] Search: ${bS.duration}ms`);
      console.log(`[BACKUP] Detail: ${bD.duration}ms`);
      console.log(`[BACKUP] Playback: ${bP.duration}ms (Status: ${bP.status})`);
  }
}

run();
