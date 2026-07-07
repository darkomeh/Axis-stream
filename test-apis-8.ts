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
  const subjectId = "5344157555780633288";

  console.log('--- Testing MAIN API ---');
  let mainDetail = await measureSpeed('MAIN Detail', mainBase + '/detail', { subjectId });
  console.log(`[MAIN] Detail: ${mainDetail.duration}ms`);
  let mainPlay = await measureSpeed('MAIN Play', mainBase + '/play', { subjectId });
  console.log(`[MAIN] Play: ${mainPlay.duration}ms`);
  
  console.log('\n--- Testing BACKUP API ---');
  let backupDetail = await measureSpeed('BACKUP Detail', backupBase + '/item-details', { subjectId });
  console.log(`[BACKUP] Detail: ${backupDetail.duration}ms`);
  let backupPlay = await measureSpeed('BACKUP Play', backupBase + '/playback', { subjectId });
  console.log(`[BACKUP] Play: ${backupPlay.duration}ms`);
}

run();
