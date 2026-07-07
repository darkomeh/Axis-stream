const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveTVPlayerScreen.tsx', 'utf-8');

if (!content.includes('import Hls from "hls.js";')) {
  content = content.replace(
    'import { motion, AnimatePresence } from "motion/react";',
    'import { motion, AnimatePresence } from "motion/react";\nimport Hls from "hls.js";'
  );
}

content = content.replace(
  `  useEffect(() => {
    if (videoRef.current) {
      // HLS initialization will be implemented here
    }
  }, [channel]);`,
  `  useEffect(() => {
    if (videoRef.current && channel) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          xhrSetup: (xhr, url) => {
            xhr.withCredentials = false; // important for some IPTVs
          }
        });
        hlsRef.current = hls;
        hls.loadSource(channel.url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (isPlaying) videoRef.current?.play().catch(e => console.error(e));
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = channel.url;
        videoRef.current.addEventListener('loadedmetadata', () => {
          if (isPlaying) videoRef.current?.play().catch(e => console.error(e));
        });
      }
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [channel, isPlaying]);`
);

fs.writeFileSync('src/pages/LiveTVPlayerScreen.tsx', content);
