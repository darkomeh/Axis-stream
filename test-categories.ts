import axios from 'axios';

async function testApi(name: string, url: string) {
  try {
    const res = await axios.get(url, { params: { apikey: 'Godszeal' }, timeout: 10000 });
    console.log(`\n--- ${name} ---`);
    if (res.data && res.data.data) {
       const data = res.data.data;
       console.log('Keys:', Object.keys(data));
       if (data.blocks) {
          console.log('Blocks:', data.blocks.map((b: any) => ({ name: b.name, type: b.type })));
       }
       if (data.items) {
          console.log('Items Count:', data.items.length);
       }
    }
  } catch (err: any) {
    console.log(`[${name}] ${err.message}`);
  }
}

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  await testApi('MAIN Homepage', mainBase + '/homepage');
  await testApi('BACKUP Homepage', backupBase + '/homepage');
  await testApi('MAIN Filter/Discover', mainBase + '/search/filter');
  await testApi('BACKUP Filter/Discover', backupBase + '/filter');
}

run();
