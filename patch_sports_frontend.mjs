import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'interface Match {',
  'interface Match {\n  home_logo?: string;\n  away_logo?: string;\n  start_time?: string;'
);

const logoReplacement1 = `
                        <div className="w-12 h-12 mx-auto bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 overflow-hidden">
                          {match.home_logo ? (
                            <img src={match.home_logo} alt={match.home_team} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">🛡️</span>
                          )}
                        </div>
`;
code = code.replace(
  /<div className="w-12 h-12 mx-auto bg-white\/5 border border-white\/10 rounded-full flex items-center justify-center mb-3">\s*<span className="text-xl">🛡️<\/span>\s*<\/div>/,
  logoReplacement1
);

const logoReplacement2 = `
                        <div className="w-12 h-12 mx-auto bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-3 overflow-hidden">
                          {match.away_logo ? (
                            <img src={match.away_logo} alt={match.away_team} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl">⚔️</span>
                          )}
                        </div>
`;
code = code.replace(
  /<div className="w-12 h-12 mx-auto bg-white\/5 border border-white\/10 rounded-full flex items-center justify-center mb-3">\s*<span className="text-xl">⚔️<\/span>\s*<\/div>/,
  logoReplacement2
);

const timeReplacement = `
                      <div className="flex flex-col items-center justify-center px-2">
                        {match.status === "UPCOMING" ? (
                          <div className="flex flex-col items-center">
                            <span className="text-gray-500 text-sm font-bold tracking-widest mb-1">VS</span>
                            {match.start_time && (
                              <span className="text-xs text-brand font-medium bg-brand/10 px-2 py-0.5 rounded-md whitespace-nowrap">
                                {new Date(match.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            )}
                          </div>
                        ) : (
`;
code = code.replace(
  /<div className="flex flex-col items-center justify-center px-2">\s*\{match\.status === "UPCOMING" \? \(\s*<span className="text-gray-500 text-sm font-bold tracking-widest">VS<\/span>\s*\) : \(/,
  timeReplacement
);

fs.writeFileSync(path, code);
console.log("Patched Sports.tsx");
