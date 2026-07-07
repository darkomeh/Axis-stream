import * as fs from 'fs';
import * as path from 'path';

const files = ['./src/pages/Toons.tsx', './src/pages/Anime.tsx', './src/pages/Search.tsx'];

files.forEach(file => {
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      let original = content;
      content = content.replace(
          /className="w-full bg-white\/5 border border-white\/10 rounded-full py-3( sm:py-4)? pl-12 pr-6 focus:outline-none focus:border-brand transition-all.*?"/g, 
          'className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] py-4 pl-14 pr-6 text-lg text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"'
      );
      if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed inputs in', file);
      }
  }
});
