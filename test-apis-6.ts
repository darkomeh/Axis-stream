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

  console.log('\n--- Testing BACKUP API ---');
  let backupSearch = await measureSpeed('BACKUP Search', backupBase + '/search-suggestions', { keyword: 'spiderman', query: 'spiderman', page: 1 });
  console.log(`[BACKUP] Search: ${backupSearch.duration}ms`);
  console.log(JSON.stringify(backupSearch.data).substring(0, 500));
}

run();
