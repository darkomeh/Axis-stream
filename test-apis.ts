import axios from 'axios';

async function testApi(name: string, baseUrl: string, endpoints: any[]) {
  console.log(`\nTesting ${name} API...`);
  const results: any[] = [];
  
  for (const ep of endpoints) {
    const url = `${baseUrl}${ep.path}`;
    const params = { ...ep.params, apikey: 'Godszeal' };
    
    try {
      const start = Date.now();
      const res = await axios.get(url, { params, timeout: 5000 });
      const duration = Date.now() - start;
      const status = res.status;
      const length = Array.isArray(res.data) ? res.data.length + ' array items' : Object.keys(res.data).length + ' root keys';
      console.log(`[${name}] ${ep.name}: ${duration}ms (Status: ${status}) -> ${length}`);
      results.push({ name: ep.name, duration, success: true });
    } catch (err: any) {
      console.log(`[${name}] ${ep.name}: FAILED - ${err.message}`);
      results.push({ name: ep.name, duration: null, success: false });
    }
  }
  return results;
}

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  const testEndpoints = [
    { name: 'Search', pathMain: '/search/suggest', pathBackup: '/search-suggestions', params: { keyword: 'batman' } },
    { name: 'Popular Search', pathMain: '/popular-search', pathBackup: '/popular-searches', params: {} },
    { name: 'Hot', pathMain: '/hot', pathBackup: '/hot-movies-series', params: {} },
    { name: 'Detail', pathMain: '/detail', pathBackup: '/item-details', params: { detailPath: 'movie/batman' } }
  ];
  
  const mainConfig = testEndpoints.map(e => ({ name: e.name, path: e.pathMain, params: e.params }));
  const backupConfig = testEndpoints.map(e => ({ name: e.name, path: e.pathBackup, params: e.params }));

  await testApi('MAIN (movieapi.xcasper.space)', mainBase, mainConfig);
  await testApi('BACKUP (gzmovieboxapi.septorch.tech)', backupBase, backupConfig);
}

run();
