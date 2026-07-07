import fs from 'fs';
const path = 'src/pages/Sports.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace the status badge logic
const statusBadgeOld = `{match.status === "LIVE" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        <span className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full animate-pulse" />
                        Live Now
                      </span>
                    ) : match.status === "FINISHED" ? (
                      <span className="px-3 py-1 bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        Finished
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-brand/10 border border-brand/30 text-brand text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        Upcoming
                      </span>
                    )}`;

const statusBadgeNew = `{match.status === "LIVE" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-[#ff3b30]/10 border border-[#ff3b30]/30 text-[#ff3b30] text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        <span className="w-1.5 h-1.5 bg-[#ff3b30] rounded-full animate-pulse" />
                        {match.status_live && match.status_live !== "Living" && !isNaN(Number(match.status_live)) ? \`\${match.status_live}'\` : 'LIVE'}
                      </span>
                    ) : match.status === "HALF_TIME" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        HT
                      </span>
                    ) : match.status === "FINISHED" ? (
                      <span className="px-3 py-1 bg-white/10 border border-white/20 text-gray-300 text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        FT
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-brand/10 border border-brand/30 text-brand text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-md">
                        Upcoming
                      </span>
                    )}`;

code = code.replace(statusBadgeOld, statusBadgeNew);


// Replace the top section above logos to add League + Round
const logosOld = `<div className="flex items-center justify-between gap-4 mb-6">`;
const logosNew = `
                    <div className="mb-4 text-center">
                      {match.league && (
                        <p className="text-xs font-semibold text-brand/80 tracking-wide uppercase line-clamp-1">{match.league}</p>
                      )}
                      {match.round && (
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest">{match.round}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-4 mb-6">`;
code = code.replace(logosOld, logosNew);


// Replace the Streams rendering part
const streamsOldRegex = /<div className="mt-auto pt-4 border-t border-white\/10">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\)/;
const streamsNew = `<div className="mt-auto pt-4 border-t border-white/10">
                      {match.period_scores && match.period_scores.length > 0 && (
                        <div className="flex justify-center gap-3 mb-4 text-[10px] text-gray-400">
                          {match.period_scores.map((ps: any, i: number) => (
                             <div key={i} className="flex flex-col items-center">
                               <span className="font-bold text-gray-500 mb-0.5">{ps.name}</span>
                               <span className="text-white">{ps.home}-{ps.away}</span>
                             </div>
                          ))}
                        </div>
                      )}
                      
                      {match.streams && match.streams.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-gray-500 font-semibold mb-1">Available Streams ({match.streams.length}):</p>
                          <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto scrollbar-hide">
                            {match.streams.slice(0, 4).map((stream: any, idx: number) => {
                              const isHls = stream.type === 'm3u8';
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handlePlayStream(match, stream.url)}
                                  className={\`flex-1 min-w-[100px] flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-xl text-[10px] font-semibold transition-all \${
                                    isHls
                                       ? "bg-brand/20 text-brand hover:bg-brand/30 border border-brand/30"
                                       : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                                  }\`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {isHls ? <PlayCircle className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                    <span className="truncate max-w-[80px]">{stream.name}</span>
                                  </div>
                                  <span className="text-[9px] opacity-70">{stream.quality || 'HD'}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <button disabled className="w-full py-3 bg-white/5 text-gray-500 rounded-xl font-semibold cursor-not-allowed">
                          No Streams Available
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))`;
code = code.replace(streamsOldRegex, streamsNew);

fs.writeFileSync(path, code);
console.log("Patched frontend UI");
