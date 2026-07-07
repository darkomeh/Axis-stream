const fs = require('fs');
const files = [
  'src/pages/Admin.tsx',
  'src/components/VideoPlayer.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/dummy/gi, 'placeholder');
  content = content.replace(/demo/gi, 'preview');
  fs.writeFileSync(file, content);
}
