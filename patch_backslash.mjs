import fs from 'fs';
let path = 'backend/services/streamValidator.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync(path, code);

path = 'backend/services/matchScraper.ts';
code = fs.readFileSync(path, 'utf8');
code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');
fs.writeFileSync(path, code);
