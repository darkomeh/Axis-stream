const fs = require('fs');
const https = require('https');
const http = require('http');

async function fetchPlaylist(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    protocol.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ url, ok: true });
      } else {
        resolve({ url, ok: false, status: res.statusCode });
      }
      res.destroy();
    });
    req.on('error', (e) => resolve({ url, ok: false, error: e.message }));
    req.setTimeout(4000, () => {
      req.abort();
      resolve({ url, ok: false, error: 'timeout' });
    });
  });
}

const existingWorking = [
  { url: "https://cdn.whiplash.cc/whiplash/tracks-v1a1/mono.m3u8", name: "Whiplash Cinema", category: "Movies" },
  { url: "https://amg00864-shemarooenterta-shemabollywood-ono-nlwbw.amagi.tv/ts-us-w2-n1/playlist/amg00864-shemarooenterta-shemabollywood-ono/cb573d1e7e6c648f99d43962cef64982847b3dcb0e6c886470af4a9765d97800dbe8ae84ae5b910c4c9e1fc061017d360439cd1dd56c49c1da63b820743c4b21fdcde00080dd0d0cb1df11292ca36265299a7369cc350f7bd2ec5a2f803ebe764c53cb017c593f88f258a97e4cc59e0a957f39e8fc8b307b24455a9c5a43e6a64cb7aae6554d8a68f3b1014f942c47fa83439fd501b280d60983108077a21dcfc3a282da15d1e4f1598b6f5cc6e739581fb7a73bf4e754b1df886038ee0042243f73966917632c46e066454ef1fccac505b5739cca4d150346db60f82fe450ce4bd369c7812ec0cdfbff082d18a2d6526226efc9a18df42609700791adc4d2697595fa153712873d986a1c319ef9c40397833ba2f672d5fa394678f7984bcdc9e9c3f7e6d903dc04dad7f89d0a474c480d16c908f1cd23887f9d3083e6270c700104a1935ec1c6fe5b336940cfc07ddc0114b4dec4d28b56759a2e4b14b820ea5a036dde3d2329b67ab7c96a1efc4c60b23c33ff57229302ade85e9289efa5576bfb8ebd019509c8ba05d5fa07d31d1f5110bcff291f080c4ad9e06202276a8122c0d6d9ea630610e6949cad97b35988828fe36a9c7ce83d61e4a3061fd2605070387d00/137/1920x1080_6046040/index.m3u8", name: "Bollywood Movies", category: "Movies" },
  { url: "https://amg01076-lightningintern-actionhollywood-samsungau-rs69y.amagi.tv/ts-eu-w1-n2/playlist/amg01076-lightningintern-actionhollywood-samsungau/cb573d1e7e6c648f99d43962cef64982847b3dcb0e6c886470af4a9765d97800dbe8ae84ae5b910c4c9e1fc061017d360439cd1dd56c49c1da63b820743c4b21fdcde00080dd0d0cb1df11292ca36265299a7369cc350f7bd2ec5a2f803ebe764c53cb017c593f88f258a97e4cc59e0a957f39e8fc8b307b24455a9c5a43e6a64cb7fae75914df68a4e4014f942c41fa83439fd501b386dc5d8347d370a714cec7a68bd61680e4f1598b6f5cc6e739581fb7a73bf4e754b1df886038ee0042243f73966917632c46e066454ef1fccac505b5739cca4d150346db60f82fe450ce4bd369c7812ec0cdfbff082d18a2d6526226efc9a18df42609700791adc4d2697595fa153712873d986a1c319ef9c40397833ba2f672d5fa394678f7984bcdc9e9c3f7e6d903dc04dad7f89d0a474c480d16c908f1cd23887f9d3083e6270c700104a1935ec1c6fe5b336940cfc07ddc0114b4dec4d28b56759a2e4b14b820ea5a036dde3d2329b67ab7c96a1efc4c60b23c33ff57229302ade85e9289efa5576bfb8ebd019509c8ba05d5fa07d31d1f5110bcff291f080c4ad9e06202276a8122c0d6d9ea630610e6949cae98b359b1b98fe36aea8310eca8cabb80b14ac1f8d5ac67bf/108/1920x1080_4716800/index.m3u8", name: "Action Hollywood", category: "Movies" },
  { url: "https://dtz4aepbew7ez.cloudfront.net/hotwh_1080.m3u8", name: "Hot Wheels Action", category: "Kids" },
  { url: "https://amg00627-amg00627c31-rakuten-fr-3991.playouts.now.amagi.tv/ts-eu-w1-n2/playlist/amg00627-banijayfast-mrbeanfrcc-rakutenfr/cb543d1e7e6c648f99d43761cef044a7f9481fde1d6988693eb5518975d10725dce2b48be65b9e3608dd4087351a6c515677b24788255f9e966ac0573c7f0e64ebd8f2278cfe475bc9814b352fb07d0052f81e0dab5d375ff5a55a048c36b0392216eb02611f72aeb51bf22b07da810e82612995aad5633e63535e8f2002b7f902f6ef820c13892ef8ae194b923146e19056c0814db285d00d965e8176a0468093f1ddd20dd0d49964b456e3360b0876249dd12097cb6f86b0e801876e9f493c7c7bc1e1f4d0473b83554a5d8a8ea1dd44d963040db8e31a519a068a468731f00be069f5a22634cecabf222159c4a41f415ec085c0ea9b55739d2c9783efcf7a7f98b9387940c67ee2ea4a528ed0c40e8dcf1997f976cbe4295514c99f5083c6f2a2e1b49f4595218a96a4c37d6b40650d0c8f45e2a23b837a943889de032d597a41afb15cd0c98c0d672c1cd0c016ff3b2f94f7c7c3d30730cf203c5feb6bd612454fc4266371e062a8ce6522d9685ddd676ab50164c06ff3ba25f9a29bd6073db4ccce0daa3cb8fb5984846fc30a1d5706a1fd255b372e2c809411675750cd43edddc3f935652de3f5c4f2c513080f36195706e9bbbf90fa1835bcac70c4a398629ee97bb80a93a548a1ad0aa6/98/1920x1080_6046040/index.m3u8", name: "Mr Bean", category: "Comedy" },
  { url: "https://2-fss-2.streamhoster.com/pl_138/205510-3094608-1/chunklist.m3u8", name: "Family Movies", category: "Movies" },
  { url: "https://amg00627-amg00627c28-rakuten-uk-3984.playouts.now.amagi.tv/ts-eu-w1-n2/playlist/amg00627-banijayfast-mrbeanukcc-rakutenuk/cb543d1e7e6c648f99d43e67d8ef43a6f9481fde1d6988693eb5518975d10725dce2b48be65b9e3608dd4087351a6c515677b24788255f9e966ac0573c7f0e64ebd8f2278cfe475bc9814b352fb07d0052f81e0dab5d375ff5a55a048c36b0392216eb02611f72aeb51bf22b07da810e82612995aad5633e63535e8f2002b7f902f6ef820c13892ef8ae194b923146e19056cdd715b9d4d75e985e8176a0418093f1ddd20d8b8ec530b454b432500b212a9c852bc7c86f86b0e801876e9f493c7c7bc1e1f4d0473b83554a5d8a8ea1dd44d963040db8e31a519a068a468731f00be069f5a22634cecabf222159c4a41f415ec085c0ea9b55739d2c9783efcf7a7f98b9387940c67ee2ea4a528ed0c40e8dcf1997f976cbe4295514c99f5083c6f2a2e1b49f4595218a96a4c37d6b40650d0c8f45e2a23b837a943889de032d597a41afb15cd0c98c0d672c1cd0c016ff3b2f94f7c7c3d30730cf203c5feb6bd612454fc4266371e062a8ce6522d9685ddd676ab50164c06ff3ba25f9a29bd6073db4ccce0daa3cb8fb5984846fc30a1d5706a1fd255b372e2c809411675750cd43edddc3f935652de3f5c4f2c513080f36195706e8b3b5257bef46d788a7a78e78b57cf39e2e33597b15ac713329aa/125/1920x1080_6046040/index.m3u8", name: "Mr Bean UK", category: "Comedy" },
  { url: "https://docpe51mdltl5.cloudfront.net/Pokemon_GB1080p.m3u8", name: "Pokemon TV", category: "Kids" },
  { url: "https://amg01076-lightningintern-kartoonchannel-samsungnz-t8blu.amagi.tv/ts-eu-w1-n2/playlist/amg01076-lightningintern-kartoonchannel-samsungnz/cb573f1a6570678a84cf3e78d1f84882847b3dcb0e6c886470af4a9765d97800dbe8ae84ae5b910c4c9e1fc061017d360439cd1dd56c49c1da63b820743c4b21fdcde00080dd0d0cb1df11292ca36265299a7369cc350f7bd2ec5a2f803ebe764c53cb017c593f88f258af734cc59e0a957f39e8fc8b307b24455a9c5a43e6a64cb7aeb05c4dde64a4b9014ec02c45fa83439fd501b381dc52834a8422a740cec7a38a8543d1e42c52937f8ab5a2c54007fbb54ad1a468b8d38e6c3ddc423c470a50f5d1eb942c12a7378ed8659db1d24bf001da8165a06d32a9099b4efe5ee2ad07c8c5932981beb3dd575337e6b733d1a53d87d2e8cd1449d550f2b0eed47d7598bc7312229b3d8976726ad995cf65e7db7ed2fec5a694105d3b4eab67a5ae12c370d3c73abd28cfd5fd9b3c0d6066133dbf52b091571648b77785c10928504145e2cf1b94c69169396c4b89974d943d2ff98adbcd8f557bfd69150cbc3b9943533885744d6cf521fcad396ea22f1eca606eac1666d602b49304c18af7a94637bcd5c202d86aecbe059bb621a17f335407fca37e0a0b1c3380a0364d0378c544f6da85b4245e4ebfa1bf8baa390f0e37135d1b98a2b620e9e9ee1d5d47911d761a377a71b10bd96ed30533700dc10cdca10c34c8461624e8a3304a492ef1ecb4928cc2c554bf1c829baad94ef4fae70c5517019fc4d9785e570348f7561a1f3e0c/147/1920x1080_4716800/index.m3u8", name: "Kartoon Channel", category: "Kids" },
  { url: "https://fast-channels.sinclairstoryline.com/CHARGE/index_1.m3u8", name: "Charge Action", category: "Movies" },
  { url: "https://dqi7ayt2o24fn.cloudfront.net/playlist_1920x1080.m3u8", name: "Live Entertainment", category: "Entertainment" },
  { url: "https://live-evg11.tv360.bitel.com.pe/bitel/ucayalitvSRT/chunks.m3u8", name: "Ucayali TV", category: "Entertainment" },
  { url: "https://amg01329-otterainc-toongoggles-samsungau-ad-4c.amagi.tv/ts-eu-w1-n2/playlist/amg01329-otterainc-toongoggles-samsungau/cb543d1e7e6c648f99d43665cef046a8f9591fde1d6988693eb5518975d1073edce2a59caa08ff16388f1ede7f0a66413a3e951fda77118fd87eb141453c5728cfffe729a2c05616b7db083429b56a062a866a68ac39437ed0e21f48a238b6720a5aa82a66443d80b846ac725adb80148b61299bce8c37683f03409a5e5afba358b1ebe55846d96af0e54e55922e40b39f43c8821da6888058ca5e8570f71098c7f38fd312d1d2f30393758a8afbb64307fbae5ed1ae73bfdd9f7b309d03592c7c74c0d3597ad35efc21625aeaf6c8be1f9f59aedb66e9f454ca60f82fe450ea2f8a70c7812ec0cddb9f620b5585c2496824a1aa8c8bfc3a2087ab9ac8e6f07c6690fa1879089c238862630f99f3cf1b93d055b88263d4e4274d6380a64c95cbe6d8afa8db1ed565ebd7e49438754b612f0b9212f7c93a957a8b38e0e53b15716108ed965ccf83997935614489c91ef71b09b6d68ecc8e5a638430550aa6309968046acd266533b07eaed46f3afb5360ef0234f55c3a9751bce97c87c0f5d1466ae5909738bc05899205ddf10eac174c7a0aa1fd215a05013de7e768093f6ed00783f7cff27c1d0ffcfdafa698b359e4b38ee36ae883fdc70ad76058aacf2f8e9967a5a4/88/1280x720_3071200/index.m3u8", name: "Toon Goggles", category: "Kids" },
  { url: "https://cdn.whiplash.cc/whiplash-cinema/tracks-v1a1/mono.m3u8", name: "Whiplash Classic", category: "Movies" },
  { url: "https://amg01753-narrativeentert-popkids-lggb-xyy5k.amagi.tv/ts-eu-w1-n2/playlist/amg01753-narrativeentert-popkids-lggb/cb543d1e7e6c648f99d43e67d2ef46a1f9481fde1d6988693eb5518975d10725dce2b48be65b9e3608dd4087351a6c515677b24788255f9e966ac0573c7f0e64ebd8f2278cfe475bc9814b352fb07d0052f81e0dab5d375ff5a55a048c36b0392216eb02611f72aeb51bf22b07da810e82612995aad5633e63535e8f2002b7f902f6ef820c13892ef8ae194b923146e19056cadc1bedd5805fcc5e8177f7148093f1ddd20dd3d09663b452b0670f5e2628cf862e959e6f86b0e801876e9f493c7c7bc1e1f4d0473b83554a5d8a8ea1dd44d963040db8e31a519a068a468731f00be069f5a22634cecabf222159c4a41f415ec085c0ea9b55739d2c9783efcf7a7f98b9387940c67ee2ea4a528ed0c40e8dcf1997f976cbe4295514c99f5083c6f2a2e1b49f4595218a96a4c37d6b40650d0c8f45e2a23b837a943889de032d597a41afb15cd0c98c0d672c1cd0c016ff3b2f94f7c7c3d30730cf203c5feb6bd612454fc4266371e062a8ce6522d9685ddd676ab50164c06ff3ba25f9a29bd6073db4ccce0daa3cb8fb5984846fc30a1d5706a1fd255b372e2c809411675750cd43edddc3f935652de3f5c4f2c513080f36195706e9b1be90fa1853b0ac70452e09074d403b1d9278ebd673b17c36/39/1920x1080_5903040/index.m3u8", name: "Pop Kids", category: "Kids" },
  { url: "https://amg01753-narrativeentert-tinypop-samsunguk-hvvb7.amagi.tv/ts-eu-w1-n2/playlist/amg01753-narrativeentert-tinypop-samsunguk/cb543d1e7e6c648f99d43e67d2ef46a1f9481fde1d6988693eb5518975d10725dce2b48be65b9e3608dd4087351a6c515677b24788255f9e966ac0573c7f0e64ebd8f2278cfe475bc9814b352fb07d0052f81e0dab5d375ff5a55a048c36b0392216eb02611f72aeb51bf22b07da810e82612995aad5633e63535e8f2002b7f902f6ef820c13892ef8ae194b923146e19056cad31ae9d4dd5c9f5e8177f7148093f1ddd20dd3d09663b452b0670f5e2628cf862e959e6f86b0e801876e9f493c7c7bc1e1f4d0473b83554a5d8a8ea1dd44d963040db8e31a519a068a468731f00be069f5a22634cecabf222159c4a41f415ec085c0ea9b55739d2c9783efcf7a7f98b9387940c67ee2ea4a528ed0c40e8dcf1997f976cbe4295514c99f5083c6f2a2e1b49f4595218a96a4c37d6b40650d0c8f45e2a23b837a943889de032d597a41afb15cd0c98c0d672c1cd0c016ff3b2f94f7c7c3d30730cf203c5feb6bd612454fc4266371e062a8ce6522d9685ddd676ab50164c06ff3ba25f9a29bd6073db4ccce0daa3cb8fb5984846fc30a1d5706a1fd255b372e2c809411675750cd43edddc3f935652de3f5c4f2c513080f36195706e9bbb390fa1a53b0ac704b9145d68f9dd5c58d25ed10f6f43d78/94/1920x1080_5903040/index.m3u8", name: "Tiny Pop", category: "Kids" },
  { url: "https://amg01753-narrativeentert-greatmovies-samsunguk-7z6eh.amagi.tv/ts-eu-w1-n2/playlist/amg01753-narrativeentert-greatmovies-samsunguk/cb573d1e7e6c648f99d43962cef64982847b3dcb0e6c886470af4a9765d97800dbe8ae84ae5b910c4c9e1fc061017d360439cd1dd56c49c1da63b820743c4b21fdcde00080dd0d0cb1df11292ca36265299a7369cc350f7bd2ec5a2f803ebe764c53cb017c593f88f258a97e4cc59e0a957f39e8fc8b307b24455a9c5a43e6a64cb7ffe55f47df39f0b8014f942b47fa83439fd501b282d45b8341d720f2409dc4f38e8712d7e4f1598b6f5cc6e739581fb7a73bf4e754b1df886038ee0042243f73966917632c46e066454ef1fccac505b5739cca4d150346db60f82fe450ce4bd369c7812ec0cdfbff082d18a2d6526226efc9a18df42609700791adc4d2697595fa153712873d986a1c319ef9c40397833ba2f672d5fa394678f7984bcdc9e9c3f7e6d903dc04dad7f89d0a474c480d16c908f1cd23887f9d3083e6270c700104a1935ec1c6fe5b336940cfc07ddc0114b4dec4d28b56759a2e4b14b820ea5a036dde3d2329b67ab7c96a1efc4c60b23c33ff57229302ade85e9289efa5576bfb8ebd019509c8ba05d5fa07d31d1f5110bcff291f080c4ad9e06202276a8122c0d6d9ea630610e6949ca799b359aed78ee36a933ae9556b42a3045cfefdd2d1cf7522/199/1920x1080_5903040/index.m3u8", name: "Great Movies", category: "Movies" },
  { url: "https://mumt03.tangotv.in/Dsly5z3HALLTIMEMOVIES/tracks-v1a1/mono.m3u8", name: "All Time Movies", category: "Movies" },
  { url: "https://aegis-cloudfront-1.tubi.video/8b127a5b-3054-4f39-93a2-1c4aab9ef5ff/1080p-en-cc/index.m3u8", name: "Tubi Free Movies", category: "Movies" },
  { url: "https://moviesphereuk-samsunguk.amagi.tv/720p-vtt/index.m3u8", name: "MovieSphere UK", category: "Movies" },
  { url: "https://3rscartoonmovies.elektriko4444.workers.dev/kolet.m3u8", name: "Cartoon Movies", category: "Kids" },
  { url: "https://3rsmoviebox.elektriko4444.workers.dev/moon.m3u8", name: "Movie Box", category: "Movies" },
  { url: "https://dash2.antik.sk/live/1plus1_marathon/playlist.m3u8", name: "1+1 Marathon", category: "Entertainment" },
  { url: "https://livestream.pbskids.org/out/v1/14507d931bbe48a69287e4850e53443c/est_2.m3u8", name: "PBS Kids", category: "Kids" },
  { url: "https://a62dad94.wurl.com/master/f36d25e7e52f1ba8d7e56eb859c636563214f541/UmFrdXRlblRWLWV1X0ZJRkFQbHVzRW5nbGlzaF9ITFM/playlist.m3u8", name: "FIFA Plus", category: "Sports" }
];

async function run() {
  console.log("Fetching global iptv lists from GitHub...");
  let newChannels = [];
  try {
      const playlists = [
          'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
          'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/uk.m3u',
          'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ae.m3u',
          'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/in.m3u' // India for Bollywood
      ];
      
      let allLines = [];
      for(const p of playlists) {
          const data = await fetchPlaylist(p);
          allLines = allLines.concat(data.split('\n'));
      }
      
      for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].startsWith('#EXTINF:')) {
            const url = allLines[i+1];
            if (url && url.startsWith('http')) {
                let nameMatch = allLines[i].match(/tvg-name="([^"]+)"/);
                let name = nameMatch ? nameMatch[1] : '';
                if (!name) {
                    nameMatch = allLines[i].match(/,(.+)$/);
                    name = nameMatch ? nameMatch[1].trim() : 'Unknown';
                }
                
                let lowerName = name.toLowerCase();
                let category = "Entertainment";
                if (lowerName.includes('movie') || lowerName.includes('cinema') || lowerName.includes('film') || lowerName.includes('hollywood') || lowerName.includes('bollywood') || lowerName.includes('nollywood')) {
                    category = "Movies";
                } else if (lowerName.includes('sport') || lowerName.includes('espn') || lowerName.includes('fifa')) {
                    category = "Sports";
                } else if (lowerName.includes('kid') || lowerName.includes('toon') || lowerName.includes('disney') || lowerName.includes('nick')) {
                    category = "Kids";
                } else if (lowerName.includes('news') || lowerName.includes('cnn') || lowerName.includes('bbc')) {
                    category = "News";
                } else if (lowerName.includes('mbc')) {
                    category = "Entertainment";
                } else if (lowerName.includes('music') || lowerName.includes('mtv')) {
                    category = "Music";
                }
                
                if (category !== "Entertainment" || lowerName.includes('mbc') || lowerName.includes('action')) {
                    newChannels.push({name, url, category});
                }
            }
        }
      }
  } catch(e) {
      console.log("Error fetching playlists", e);
  }

  // Deduplicate
  const uniqueUrls = new Set();
  newChannels = newChannels.filter(c => {
      if (uniqueUrls.has(c.url)) return false;
      uniqueUrls.add(c.url);
      return true;
  });

  console.log("Testing existing working set...");
  let finalChannels = [];
  
  for (const c of existingWorking) {
      const res = await checkUrl(c.url);
      if (res.ok) {
          finalChannels.push(c);
      }
  }
  
  console.log(`Found ${finalChannels.length} existing working.`);
  
  console.log("Testing new discovered urls...");
  let added = 0;
  // Test some new channels, we need a good mix
  const mixCategories = ["Movies", "Sports", "Kids", "News", "Music"];
  
  for (const c of newChannels) {
      if (added > 30) break; // Don't test forever
      
      const res = await checkUrl(c.url);
      if (res.ok) {
          // Avoid generic names if possible, but keep if good
          if (!c.name.includes('Live Channel') && !c.name.includes('http')) {
              finalChannels.push(c);
              added++;
          }
      }
  }
  
  console.log("Total working channels:", finalChannels.length);
  
  // Clean up channel array
  let channelsCode = "export interface LiveChannel {\n" +
  "  id: string;\n" +
  "  name: string;\n" +
  "  logo: string;\n" +
  "  image: string;\n" +
  "  url: string;\n" +
  "  category: string;\n" +
  "  description: string;\n" +
  "  currentProgram: string;\n" +
  "  country: string;\n" +
  "  views: number;\n" +
  "}\n\n" +
  "export const LIVE_CHANNELS: LiveChannel[] = [\n";
  
  // filter duplicates and fix names
  const finalUnique = new Map();
  finalChannels.forEach(c => {
      let name = c.name;
      // if name looks like a URL or is too long, shorten it
      if (name.startsWith('http') || name.length > 30) {
          name = c.category + " TV";
      }
      finalUnique.set(c.url, {name, url: c.url, category: c.category});
  });
  
  let i = 0;
  finalUnique.forEach((c) => {
      let logoName = c.name.substring(0, 3).toUpperCase();
      let seed = i + 1000;
      let imgUrl = `https://picsum.photos/seed/${seed}/400/225`;
      
      // Let's add some hardcoded images for known channels to make it look cool
      if (c.name.toLowerCase().includes('movie')) imgUrl = "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80";
      if (c.name.toLowerCase().includes('kid') || c.name.toLowerCase().includes('toon')) imgUrl = "https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=800&q=80";
      if (c.name.toLowerCase().includes('sport')) imgUrl = "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80";
      if (c.name.toLowerCase().includes('news')) imgUrl = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80";
      
      channelsCode += `  {\n` +
      `    id: "channel-${i}",\n` +
      `    name: ${JSON.stringify(c.name)},\n` +
      `    logo: ${JSON.stringify(logoName)},\n` +
      `    image: "${imgUrl}",\n` +
      `    url: ${JSON.stringify(c.url)},\n` +
      `    category: ${JSON.stringify(c.category)},\n` +
      `    description: "Enjoy premium 24/7 continuous broadcast of " + ${JSON.stringify(c.name)} + " featuring the best live entertainment.",\n` +
      `    currentProgram: "Live Broadcast",\n` +
      `    country: "Global",\n` +
      `    views: Math.floor(Math.random() * 50000) + 1000\n` +
      `  }${i < finalUnique.size - 1 ? ',' : ''}\n`;
      i++;
  });
  
  channelsCode += "];\n";
  
  fs.writeFileSync('src/data/liveChannels.ts', channelsCode);
  console.log("Updated liveChannels.ts with real names");
}
run();
