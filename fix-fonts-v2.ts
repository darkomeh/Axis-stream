import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const sizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl'];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Find classNames and clean up duplicate text sizes
  content = content.replace(/className=(["'])(.*?)\1|className=\{`([^`]*?)`\}/g, (match, quote, p2, p3) => {
    let classesStr = p2 || p3;
    if (!classesStr) return match;
    
    // Split by whitespace
    let classes = classesStr.split(/\s+/).filter(Boolean);
    
    // Find all size classes
    let sizesFound = classes.filter(c => sizes.includes(c));
    if (sizesFound.length > 1) {
      // Keep only the largest size found
      let maxIndex = -1;
      let maxClass = '';
      for (const s of sizesFound) {
         const idx = sizes.indexOf(s);
         if (idx > maxIndex) {
           maxIndex = idx;
           maxClass = s;
         }
      }
      // Remove all sizes found
      classes = classes.filter(c => !sizes.includes(c));
      // Add back the max size
      classes.push(maxClass);
    }
    
    let resultClasses = classes.join(' ');
    
    if (p2 !== undefined) {
      return `className=${quote}${resultClasses}${quote}`;
    } else {
      return 'className={`' + resultClasses + '`}';
    }
  });
  
  // also clean up ` sm:text-lg` or similar artifacts we left behind earlier if the `md:` was removed but not the font class
  const artifacts = /(sm:|md:|lg:|xl:)\s*text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl)/g;
  content = content.replace(artifacts, '');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
});
