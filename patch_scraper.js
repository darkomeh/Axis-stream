const fs = require('fs');
const path = 'backend/services/matchScraper.ts';
let code = fs.readFileSync(path, 'utf8');
code = code.replace(
  'timeout: config.REQUEST_TIMEOUT',
  'timeout: config.REQUEST_TIMEOUT,\n          responseType: "text",\n          transformResponse: [(data) => data]'
);
fs.writeFileSync(path, code);
