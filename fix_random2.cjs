const fs = require('fs');
let content = fs.readFileSync('src/data/liveChannels.ts', 'utf-8');

const regex = /views: Math\.floor\(Math\.random\(\) \* 50000\) \+ 1000/g;
let id = 1;
content = content.replace(regex, () => {
  const pseudoRandom = Math.sin(id++) * 10000;
  const value = pseudoRandom - Math.floor(pseudoRandom);
  return `views: ${Math.floor(value * 50000) + 1000}`;
});

fs.writeFileSync('src/data/liveChannels.ts', content);
