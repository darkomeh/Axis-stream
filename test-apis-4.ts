import axios from 'axios';

async function measureSpeed(name: string, url: string, params: any) {
  try {
    const start = Date.now();
    const res = await axios.get(url, { params: { ...params, apikey: 'Godszeal' }, timeout: 10000 });
    const duration = Date.now() - start;
    if (res.data) {
       return { duration, data: res.data };
    }
  } catch (err: any) {
    console.log(`[${name}] ${err.message}`);
  }
  return { duration: null, data: null };
}

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  console.log('--- Testing MAIN API ---');
  let mainSearch = await measureSpeed('MAIN Search', mainBase + '/search', { keyword: 'spiderman', query: 'spiderman', page: 1 });
  console.log(`[MAIN] Search: ${mainSearch.duration}ms`);
  if (mainSearch.data && mainSearch.data.data && mainSearch.data.data.list && mainSearch.data.data.list.length > 0) {
      let id = mainSearch.data.data.list[0].id;
      let path = mainSearch.data.data.list[0].detailPath || '';
      console.log(`[MAIN] Found ID: ${id}, Path: ${path}`);
      
      let mainDetail = await measureSpeed('MAIN Detail', mainBase + '/detail', { subjectId: id, detailPath: path });
      console.log(`[MAIN] Detail: ${mainDetail.duration}ms`);
      
      let mainPlay = await measureSpeed('MAIN Play', mainBase + '/play', { subjectId: id, detailPath: path });
      console.log(`[MAIN] Play: ${mainPlay.duration}ms`);
  }

  console.log('\n--- Testing BACKUP API ---');
  let backupSearch = await measureSpeed('BACKUP Search', backupBase + '/search', { keyword: 'spiderman', query: 'spiderman', page: 1 });
  console.log(`[BACKUP] Search: ${backupSearch.duration}ms`);
  if (backupSearch.data && backupSearch.data.data && backupSearch.data.data.list && backupSearch.data.data.list.length > 0) {
      let id = backupSearch.data.data.list[0].id;
      let path = backupSearch.data.data.list[0].detailPath || '';
      console.log(`[BACKUP] Found ID: ${id}, Path: ${path}`);
      
      let backupDetail = await measureSpeed('BACKUP Detail', backupBase + '/item-details', { subjectId: id, detailPath: path });
      console.log(`[BACKUP] Detail: ${backupDetail.duration}ms`);
      
      let backupPlay = await measureSpeed('BACKUP Play', backupBase + '/playback', { subjectId: id, detailPath: path });
      console.log(`[BACKUP] Play: ${backupPlay.duration}ms`);
  }
}

run();
