const fs = require('fs');
let content = fs.readFileSync('src/data/liveChannels.ts', 'utf-8');

// Replace Math.random() in views with deterministic pseudo-random logic based on id
content = content.replace(
  /views: Math\.floor\(Math\.random\(\) \* 50000\) \+ 1000/g,
  `views: Math.floor((Math.sin(parseInt(c.id.replace('channel-', ''))) * 10000 - Math.floor(Math.sin(parseInt(c.id.replace('channel-', ''))) * 10000)) * 50000) + 1000`
);
// the logic above doesn't work if c is not defined in the map function correctly because it's a static file. We need to evaluate the Math.floor locally in the script when generating the file.
