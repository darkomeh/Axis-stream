import axios from 'axios';
async function run() {
  const backupBase = 'https://gzmovieboxapi.septorch.tech/api';
  const subjectId = "5344157555780633288";
  let res = await axios.get(backupBase + '/item-details', { params: { subjectId, apikey: 'Godszeal' } });
  console.log(JSON.stringify(res.data).substring(0, 1000));
}
run();
