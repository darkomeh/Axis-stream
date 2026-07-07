import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const [activeTab, setActiveTab] = useState<"live" | "upcoming">("live");',
  'const [activeTab, setActiveTab] = useState<"live" | "upcoming">("live");\n  const [activeSport, setActiveSport] = useState<string>("football");'
);

code = code.replace(
  'const fetchMatches = async (type: "live" | "upcoming") => {',
  'const fetchMatches = async (type: "live" | "upcoming", sport: string = activeSport) => {'
);

code = code.replace(
  'const response = await axios.get(`/api/matches/${type}`);',
  'const response = await axios.get(`/api/matches/${type}?sport=${sport}`);'
);

code = code.replace(
  'fetchMatches(activeTab);',
  'fetchMatches(activeTab, activeSport);'
);

code = code.replace(
  'onClick={() => fetchMatches(activeTab)}',
  'onClick={() => fetchMatches(activeTab, activeSport)}'
);

code = code.replace(
  'onClick={() => fetchMatches(activeTab)}',
  'onClick={() => fetchMatches(activeTab, activeSport)}'
);

const tabsHtml = `
          {/* Sport Switcher */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full self-start">
            {[
              { id: 'football', name: 'Football', icon: '⚽' },
              { id: 'basketball', name: 'Basketball', icon: '🏀' },
              { id: 'tennis', name: 'Tennis', icon: '🎾' },
              { id: 'cricket', name: 'Cricket', icon: '🏏' },
              { id: 'baseball', name: 'Baseball', icon: '⚾' }
            ].map(sport => (
              <button
                key={sport.id}
                onClick={() => { setActiveSport(sport.id); fetchMatches(activeTab, sport.id); }}
                className={\`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap \${
                  activeSport === sport.id
                    ? "bg-white/20 text-white shadow-lg"
                    : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                }\`}
              >
                <span>{sport.icon}</span>
                {sport.name}
              </button>
            ))}
          </div>
`;

code = code.replace(
  '<div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md self-start md:self-auto">',
  tabsHtml + '\n<div className="flex gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-md self-start md:self-auto shrink-0">'
);

fs.writeFileSync(path, code);
console.log("Patched sports component for sports tabs");
