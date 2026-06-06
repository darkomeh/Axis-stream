const fs = require('fs');

const file = 'src/components/VideoPlayer.tsx';

if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/w-\[clamp\(56px,16vw,100px\)\]/g, 'w-14 sm:w-16 md:w-20 lg:w-24');
  content = content.replace(/h-\[clamp\(56px,16vw,100px\)\]/g, 'h-14 sm:h-16 md:h-20 lg:h-24');
  
  content = content.replace(/w-\[clamp\(32px,9vw,52px\)\]/g, 'w-10 sm:w-12 md:w-14');
  content = content.replace(/h-\[clamp\(32px,9vw,52px\)\]/g, 'h-10 sm:h-12 md:h-14');
  
  content = content.replace(/gap-\[clamp\(1rem,8vw,6rem\)\]/g, 'gap-6 sm:gap-10 md:gap-16');
  
  fs.writeFileSync(file, content);
}
