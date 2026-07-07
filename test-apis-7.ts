import axios from 'axios';

async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';
  const start = Date.now();
  let res = await axios.get(backupBase + '/search', { params: { query: 'batman', page: 1, apikey: 'Godszeal' } });
  console.log('Time:', Date.now() - start, 'ms');
  console.log(JSON.stringify(res.data).substring(0, 500));
}

run();
