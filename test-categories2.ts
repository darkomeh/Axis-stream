import axios from 'axios';

async function testApi(name: string, url: string, params: any) {
  try {
    const res = await axios.get(url, { params: { ...params, apikey: 'Godszeal' }, timeout: 10000 });
    console.log(`\n--- ${name} ---`);
    if (res.data) {
       console.log('Status Details:', res.data.status, res.data.statusCode, res.data.message);
       if (res.data.data) {
          const keys = Object.keys(res.data.data);
          console.log('Keys:', keys);
          if (res.data.data.items) {
             console.log('Items Count:', res.data.data.items.length);
             if (res.data.data.items.length > 0) {
                 console.log('First Item Genre:', res.data.data.items[0].genre);
             }
          } else if (res.data.data.list) {
             console.log('List Count:', res.data.data.list.length);
             if (res.data.data.list.length > 0) {
                 console.log('First Item Genre:', res.data.data.list[0].genre);
             }
          }
       } else {
           console.log('Data:', res.data);
       }
    }
  } catch (err: any) {
    console.log(`[${name}] ${err.message}`);
  }
}

async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';

  await testApi('MAIN Explore', mainBase + '/explore', { genre: 'Horror', subjectType: 1 });
  await testApi('MAIN Filter/Movie', mainBase + '/filter/movie', { genre: 'Horror' });
  await testApi('MAIN Category', mainBase + '/category', { genre: 'Horror' });

  await testApi('BACKUP Explore', backupBase + '/explore', { genre: 'Horror', subjectType: 1 });
  await testApi('BACKUP Filter/Movie', backupBase + '/filter/movie', { genre: 'Horror' });
  await testApi('BACKUP Category', backupBase + '/category', { genre: 'Horror' });
}

run();
