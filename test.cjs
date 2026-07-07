const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://gzmovieboxapi.septorch.tech/api/staff/detail?apikey=Godszeal&staffId=52003');
    console.log(res.data);
  } catch (e) {
    console.log('Error 1:', e.response?.status);
  }
}
test();
