import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = '{match.period_scores && match.period_scores.length > 0 && (';

const oddsUi = `{match.odds && match.odds.length > 0 && (
                        <div className="flex justify-center gap-4 mb-4 mt-2 pt-3 border-t border-white/5">
                          {match.odds.map((odd: any, i: number) => (
                             <div key={i} className="flex gap-2 text-[10px]">
                               <span className="font-bold text-gray-500">{odd.type}</span>
                               <span className="text-brand font-semibold">{odd.value}</span>
                             </div>
                          ))}
                        </div>
                      )}
                      
                      {match.period_scores && match.period_scores.length > 0 && (`;

code = code.replace(target, oddsUi);
fs.writeFileSync(path, code);
console.log("Patched odds");
