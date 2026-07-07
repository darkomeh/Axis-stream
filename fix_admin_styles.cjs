const fs = require('fs');
let content = fs.readFileSync('src/pages/Admin.tsx', 'utf-8');

// Replace standard bg-white/5 patterns with Liquid Glass pattern
content = content.replace(/bg-white\/5\s+border\s+border-white\/10\s+rounded-\[?(?:3rem|2\.5rem|3xl)\]?/g, "bg-white/[0.04] backdrop-blur-2xl border border-white/[0.08] rounded-[24px] shadow-2xl");

// Replace bg-black/40 backdrop-blur-3xl ... rounded-2xl patterns
content = content.replace(/bg-black\/40\s+backdrop-blur-3xl\s+border\s+border-white\/[0-9]+\s+rounded-(?:2xl|3xl|\[2\.5rem\])/g, "bg-[#161616]/60 backdrop-blur-2xl border border-white/[0.08] rounded-[16px]");
content = content.replace(/bg-black\/40\s+backdrop-blur-3xl/g, "bg-[#161616]/60 backdrop-blur-2xl");

// Update standard text-brand to text-[#FF3B30] or accent red
content = content.replace(/text-brand/g, "text-[#FF3B30]");
content = content.replace(/bg-brand/g, "bg-[#FF3B30]");
content = content.replace(/border-brand/g, "border-[#FF3B30]");
content = content.replace(/shadow-brand\/20/g, "shadow-[#FF3B30]/20");

fs.writeFileSync('src/pages/Admin.tsx', content);
console.log('Done modifying Admin.tsx');
