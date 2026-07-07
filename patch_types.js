const fs = require('fs');
const path = 'backend/models/types.ts';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('home_logo')) {
  code = code.replace(
    'home_team: string;',
    'home_team: string;\n  home_logo?: string;'
  ).replace(
    'away_team: string;',
    'away_team: string;\n  away_logo?: string;'
  ).replace(
    'status: string;',
    'status: string;\n  start_time?: string;'
  );
  fs.writeFileSync(path, code);
  console.log("Updated Match interface");
}
