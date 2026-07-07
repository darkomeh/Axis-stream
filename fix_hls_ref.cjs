const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveTVPlayerScreen.tsx', 'utf-8');

// The file has:
// const videoRef = useRef<HTMLVideoElement>(null);
// const hlsRef = useRef<any>(null);
// const hlsRef = useRef<Hls | null>(null);

content = content.replace('const hlsRef = useRef<any>(null);\n', '');
fs.writeFileSync('src/pages/LiveTVPlayerScreen.tsx', content);
