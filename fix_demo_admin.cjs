const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// It seems we replaced Demographics -> Previewgraphics, Demote -> Previwte!
// Let's fix that

content = content.replace(/Previewgraphics/g, 'Demographics');
content = content.replace(/previewgraphics/g, 'demographics');
content = content.replace(/Previwte/g, 'Demote');
content = content.replace(/previwte/g, 'demote');
content = content.replace(/Previewte/g, 'Demote');
content = content.replace(/previewte/g, 'demote');

fs.writeFileSync('src/pages/Admin.tsx', content);
