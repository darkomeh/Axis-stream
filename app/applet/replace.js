const fs = require('fs');

const files = [
  'src/components/MediaPreviewTray.tsx',
  'src/pages/Details.tsx',
  'src/components/Tray.tsx',
  'src/pages/Home.tsx',
  'src/components/Carousel.tsx',
  'src/components/ContinueWatchingGrid.tsx',
  'src/components/PosterGrid.tsx',
  'src/components/TopTenGrid.tsx',
  'src/components/Navbar.tsx',
  'src/components/BottomNav.tsx',
  'src/pages/Browse.tsx',
  'src/pages/Ranking.tsx',
  'src/pages/Profile.tsx',
  'src/pages/Actor.tsx',
  'src/pages/Search.tsx',
  'src/pages/Playlist.tsx',
  'src/components/VideoPlayer.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/font-black/g, 'font-semibold');
    content = content.replace(/italic/g, '');
    content = content.replace(/tracking-tighter/g, 'tracking-tight');
    content = content.replace(/tracking-\[0\.2em\]/g, 'tracking-wide');
    content = content.replace(/tracking-\[0\.15em\]/g, 'tracking-wide');
    content = content.replace(/tracking-widest/g, 'tracking-wide');
    content = content.replace(/uppercase/g, '');
    fs.writeFileSync(file, content);
  }
}
