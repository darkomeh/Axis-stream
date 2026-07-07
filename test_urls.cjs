const https = require('https');
const http = require('http');

const urls = [
  "http://84.17.50.102/nickjr/index.m3u8",
  "http://41.205.93.154/NICKTOONS/index.m3u8",
  "http://23.237.104.106:8080/USA_DISNEY_JUNIOR/index.m3u8",
  "http://23.237.104.106:8080/USA_DISNEY_XD/index.m3u8",
  "http://23.237.104.106:8080/USA_ESPNU/index.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/5.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/4.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/0.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/3.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/2.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/1.m3u8",
  "https://dvu7aia8rjlfm.cloudfront.net/webvtt.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/5eceed4d-1e95-4bba-b103-c3cef8122391/2.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/d0ea7e3b-e11b-4dab-b706-1a40d2227f36/2.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/5eceed4d-1e95-4bba-b103-c3cef8122391/1.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/d0ea7e3b-e11b-4dab-b706-1a40d2227f36/1.m3u8",
  "https://5b622f07944df.streamlock.net/aghapykids.tv/aghapykids2/chunklist_w234455069.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/6378c192-733b-49a7-9f2b-381648c352eb/0.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/5eceed4d-1e95-4bba-b103-c3cef8122391/0.m3u8",
  "https://c0c65b821b3542c3a4dca92702f59944.mediatailor.us-east-1.amazonaws.com/v1/manifest/04fd913bb278d8775298c26fdca9d9841f37601f/RakutenTV-eu_BabySharkTV/d0ea7e3b-e11b-4dab-b706-1a40d2227f36/0.m3u8",
  "https://5b622f07944df.streamlock.net/aghapykids.tv/aghapykids2/chunklist_w1308408676.m3u8",
  "https://dh18i7whff86v.cloudfront.net/1.m3u8",
  "https://dh18i7whff86v.cloudfront.net/2.m3u8",
  "https://dh18i7whff86v.cloudfront.net/3.m3u8",
  "https://dh18i7whff86v.cloudfront.net/4.m3u8",
  "https://dh18i7whff86v.cloudfront.net/5.m3u8",
  "https://stream.ads.ottera.tv/cl/260630d91r8pn6pkes73dr3s30/640x360_350000_2_f.m3u8?i=475_50",
  "https://627bb251f23c7.streamlock.net:444/ExtremaKids/ExtremaKids/chunklist_w392014482.m3u8",
  "https://627bb251f23c7.streamlock.net:444/ExtremaKids/ExtremaKids/chunklist_w1120061818.m3u8",
  "https://dh18i7whff86v.cloudfront.net/sub_1.m3u8",
  "https://dq2a9ghraf7sw.cloudfront.net/1080p-vtt/index.m3u8",
  "https://dq2a9ghraf7sw.cloudfront.net/720p-vtt/index.m3u8",
  "https://dq2a9ghraf7sw.cloudfront.net/480p-vtt/index.m3u8",
  "https://dq2a9ghraf7sw.cloudfront.net/360p-vtt/index.m3u8",
  "https://streamer1.streamhost.org/salive/logoskidsH/chunklist_w611765924.m3u8",
  "https://streamer1.streamhost.org/salive/logoskidsH/chunklist_w782317202.m3u8",
  "https://streamer1.streamhost.org/salive/logoskidsH/chunklist_w1396925027.m3u8",
  "https://dq2a9ghraf7sw.cloudfront.net/en-vtt/index.m3u8",
  "https://live20.bozztv.com/giatvplayout7/giatv-208314/tracks-v1a1/mono.ts.m3u8",
  "https://stream.ads.ottera.tv/cl/260701d92heba4rfhc73do593g/640x360_350000_2_f.m3u8?i=475_50",
  "https://d1wal6k3d7ssin.cloudfront.net/out/v1/ea91db0906c847a4931b46a9ec36e77b/index_1.m3u8",
  "https://d1wal6k3d7ssin.cloudfront.net/out/v1/ea91db0906c847a4931b46a9ec36e77b/index_2.m3u8",
  "https://d1wal6k3d7ssin.cloudfront.net/out/v1/ea91db0906c847a4931b46a9ec36e77b/index_3.m3u8",
  "https://stream.ads.ottera.tv/cl/260701d92heuhejqgs73cs8ci0/1280x720_2300000_0_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heug4s5os73ee66tg/1280x720_2300000_0_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heug4s5os73ee66tg/1280x720_1400000_1_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heuhejqgs73cs8ci0/1280x720_1400000_1_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heuhejqgs73cs8ci0/960x540_900000_4_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heug4s5os73ee66tg/960x540_900000_4_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heudrgbjs73cbuda0/640x360_350000_2_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heuhejqgs73cs8ci0/854x480_550000_3_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heug4s5os73ee66tg/854x480_550000_3_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heuhejqgs73cs8ci0/640x360_350000_2_f.m3u8?i=475_50",
  "https://stream.ads.ottera.tv/cl/260701d92heug4s5os73ee66tg/640x360_350000_2_f.m3u8?i=475_50"
];

function checkUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, (res) => {
      resolve({ url, statusCode: res.statusCode });
    });
    req.on('error', (err) => {
      resolve({ url, statusCode: null, error: err.message });
    });
    req.setTimeout(4000, () => {
      req.destroy();
      resolve({ url, statusCode: null, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log("SUCCESSFUL CHANNELS ONLY:");
  for (const u of urls) {
    const res = await checkUrl(u);
    if (res.statusCode === 200 || res.statusCode === 302) {
      console.log(`OK: ${u}`);
    }
  }
}

main();
