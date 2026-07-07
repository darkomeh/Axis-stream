const fs = require('fs');
const content = fs.readFileSync('src/pages/LiveTVPlayerScreen.tsx', 'utf-8');
console.log(content.includes('hlsRef.current'));
