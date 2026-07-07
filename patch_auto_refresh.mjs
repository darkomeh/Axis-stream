import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = 'useEffect(() => {\\n    fetchMatches(activeTab, activeSport);\\n  }, [activeTab, activeSport]);';

const autoRefresh = `useEffect(() => {
    fetchMatches(activeTab, activeSport);
    
    // Auto-refresh every 30 seconds for live matches
    let interval: any;
    if (activeTab === "live") {
      interval = setInterval(() => {
         fetchMatches(activeTab, activeSport);
      }, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTab, activeSport]);`;

code = code.replace(target, autoRefresh);
fs.writeFileSync(path, code);
console.log("Patched auto refresh");
