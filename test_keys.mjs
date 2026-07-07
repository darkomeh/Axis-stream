import axios from 'axios';

async function run() {
  const resp = await axios.get("https://sportslivetoday.com/_payload.json?live");
  const payload = resp.data;
  const match = payload.find(x => x && typeof x === 'object' && x.team1);
  if(match) console.log(Object.keys(match));
}
run();
