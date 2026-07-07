import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'useEffect(() => {\n    fetchMatches(activeTab, activeSport);\n  }, [activeTab]);',
  'useEffect(() => {\n    fetchMatches(activeTab, activeSport);\n  }, [activeTab, activeSport]);'
);

fs.writeFileSync(path, code);
console.log("Patched useEffect");
