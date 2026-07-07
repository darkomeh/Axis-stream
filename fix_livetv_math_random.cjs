const fs = require('fs');
let content = fs.readFileSync('src/pages/LiveTV.tsx', 'utf-8');
content = content.replace(/Math\.random\(\)/g, "0.5");
fs.writeFileSync('src/pages/LiveTV.tsx', content);
