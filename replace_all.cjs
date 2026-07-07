const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const original = content;
      content = content.replace(/font-black/g, 'font-semibold');
      content = content.replace(/italic/g, '');
      content = content.replace(/tracking-tighter/g, 'tracking-tight');
      content = content.replace(/tracking-\[0\.2em\]/g, 'tracking-wide');
      content = content.replace(/tracking-\[0\.15em\]/g, 'tracking-wide');
      content = content.replace(/tracking-widest/g, 'tracking-wide');
      content = content.replace(/uppercase/g, '');
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('src');
