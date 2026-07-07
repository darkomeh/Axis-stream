const fs = require('fs');

const files = [
  'src/pages/Admin.tsx',
  'src/pages/Trails.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/demo/gi, 'preview');
  fs.writeFileSync(file, content);
}
