const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// Replace common card backgrounds
content = content.replace(/bg-white\/5\s+border\s+border-white\/10\s+(p-\d+)\s+rounded-\[?[a-zA-Z0-9.]+\]?/g, "bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] $1 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.3)]");
content = content.replace(/bg-white\/5\s+border\s+border-white\/10\s+rounded-\[?[a-zA-Z0-9.]+\]?\s+(p-\d+)/g, "bg-white/[0.04] backdrop-blur-[24px] border border-white/[0.08] rounded-[24px] $1 shadow-[0_8px_32px_rgba(0,0,0,0.3)]");
content = content.replace(/bg-white\/5\s+(p-\d+)\s+rounded-\[?[a-zA-Z0-9.]+\]?\s+border\s+border-white\/10/g, "bg-white/[0.04] backdrop-blur-[24px] $1 rounded-[24px] border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]");

// Replace the navbar and smaller elements
content = content.replace(/bg-white\/5\s+p-1\s+rounded-2xl\s+border\s+border-white\/10/g, "bg-white/[0.06] backdrop-blur-[24px] p-1 rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3)]");

content = content.replace(/bg-white\/5/g, "bg-white/[0.04] backdrop-blur-[24px]");

// Remove any duplicate backdrop-blur-[24px] backdrop-blur-[24px]
content = content.replace(/backdrop-blur-\[24px\]\s+backdrop-blur-\[24px\]/g, "backdrop-blur-[24px]");

fs.writeFileSync('src/pages/Admin.tsx', content);
console.log('Done fixing Admin.tsx');
