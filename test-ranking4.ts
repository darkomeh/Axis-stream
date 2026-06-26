import axios from 'axios';
async function run() {
  const mainBase = 'https://movieapi.xcasper.space/api';
  try {
     let m = await axios.get(mainBase + '/ranking', { params: { apikey: 'Godszeal' }});
     console.log('MAIN /ranking subjectList:', m.data.data.subjectList?.length);
     console.log('first item:', Object.keys(m.data.data.subjectList[0]));
     console.log('first item title:', m.data.data.subjectList[0].title);
  } catch(e:any) { console.log('MAIN Error /ranking:', e.message); }
}
run();
