const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveTVPlayerScreen.tsx', 'utf-8');

if (!content.includes('const hlsRef = useRef<any>(null);')) {
  content = content.replace(
    'const videoRef = useRef<HTMLVideoElement>(null);',
    'const videoRef = useRef<HTMLVideoElement>(null);\n  const hlsRef = useRef<any>(null);'
  );
}

fs.writeFileSync('src/pages/LiveTVPlayerScreen.tsx', content);
