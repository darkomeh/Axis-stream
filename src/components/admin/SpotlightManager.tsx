import React, { useState } from 'react';
import { Search, Plus, Trash2 } from 'lucide-react';
import { movieService } from '../../services/movieService';
import { MediaItem } from '../../types';
import { updateAdminConfig } from '../../services/firebaseService';

export default function SpotlightManager({ currentData, onUpdate }: { currentData: any, onUpdate: () => void }) {
 const [query, setQuery] = useState('');
 const [results, setResults] = useState<MediaItem[]>([]);
 const [loading, setLoading] = useState(false);
 const [spotlights, setSpotlights] = useState<{ carousel: MediaItem[], top10: MediaItem[] }>(currentData?.spotlights || { carousel: [], top10: [] });

 const handleSearch = async () => {
 if (!query) return;
 setLoading(true);
 try {
 const res = await movieService.search(query);
 setResults(res);
 } catch (e) {
 console.error(e);
 } finally {
 setLoading(false);
 }
 };

 const addSpotlight = async (item: MediaItem, target: 'carousel' | 'top10', index?: number) => {
 let newItems = [...(spotlights[target] || [])];
 if (typeof index === 'number' && target === 'top10') {
 // pad array if needed
 while (newItems.length < 10) newItems.push(null as any);
 newItems[index] = item;
 // remove trailing nulls
 while (newItems.length > 0 && newItems[newItems.length - 1] === null) {
 newItems.pop();
 }
 } else {
 if (newItems.find(i => i && i.id === item.id)) return;
 newItems.push(item);
 }
 
 // clean up nulls
 const cleanItems = newItems.map(i => i || null);
 
 const newSpotlights = { ...spotlights, [target]: cleanItems };
 setSpotlights(newSpotlights);
 
 await updateAdminConfig({ spotlights: newSpotlights });
 onUpdate();
 };

 const removeSpotlight = async (target: 'carousel' | 'top10', index: number) => {
 const newItems = [...spotlights[target]];
 if (target === 'top10') {
 newItems[index] = null as any;
 } else {
 newItems.splice(index, 1);
 }
 
 const newSpotlights = { ...spotlights, [target]: newItems };
 setSpotlights(newSpotlights);
 await updateAdminConfig({ spotlights: newSpotlights });
 onUpdate();
 };

 return (
 <div className="space-y-8">
 {/* Search Section */}
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6">
 <h3 className="text-fluid-sm font-semibold tracking-wide mb-6">Search Media to Spotlight</h3>
 <div className="flex gap-4 mb-6">
 <input 
 type="text" 
 value={query}
 onChange={e => setQuery(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSearch()}
 placeholder="Search movie or series..."
 className="flex-1 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl px-6 py-3 focus:border-brand outline-none"
 />
 <button onClick={handleSearch} disabled={loading} className="px-8 bg-brand text-white rounded-2xl font-bold hover:bg-brand/80 transition-colors">
 {loading ? 'Searching...' : 'Search'}
 </button>
 </div>
 
 {results.length > 0 && (
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
 {results.map((item, idx) => (
 <div key={`${item.id}-${idx}`} className="relative group rounded-xl overflow-hidden bg-white/5 border border-white/10 p-2">
 <div className="aspect-[2/3] rounded-lg overflow-hidden mb-2">
 <img src={item.poster} className="w-full h-full object-cover" alt={item.title} />
 </div>
 <div className="p-2">
 <p className="font-bold text-fluid-xs truncate" title={item.title}>{item.title}</p>
 <p className="text-fluid-sm text-gray-500 mb-2 truncate">ID: {item.id}</p>
 <div className="flex flex-col gap-2">
 <button onClick={() => navigator.clipboard.writeText(item.id)} className="w-full text-fluid-sm py-1 bg-white/10 hover:bg-white/20 rounded font-bold ">
 Copy ID
 </button>
 <button onClick={() => addSpotlight(item, 'carousel')} className="w-full text-fluid-sm py-1 bg-brand hover:bg-brand/80 rounded font-bold transition">
 Add to Carousel
 </button>
 <div className="flex gap-1 overflow-x-auto no-scrollbar">
 {[0,1,2,3,4,5,6,7,8,9].map(i => (
 <button key={i} onClick={() => addSpotlight(item, 'top10', i)} className="flex-shrink-0 w-6 h-6 bg-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white rounded text-fluid-sm font-bold transition flex items-center justify-center">
 {i + 1}
 </button>
 ))}
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
 {/* Carousel Spotlights */}
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6">
 <h3 className="text-fluid-sm font-semibold tracking-wide mb-6 text-brand">Homepage Carousel Splight</h3>
 <div className="space-y-4">
 {spotlights.carousel?.length === 0 && <p className="text-gray-500 text-fluid-sm">No items configured.</p>}
 {spotlights.carousel?.map((item, idx) => (
 item && (
 <div key={`${item.id}-${idx}`} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
 <img src={item.poster} className="w-12 h-16 object-cover rounded-lg" alt="" />
 <div className="flex-1">
 <p className="font-bold text-fluid-sm line-clamp-1">{item.title}</p>
 <p className="text-fluid-sm text-gray-500">ID: {item.id}</p>
 </div>
 <button onClick={() => removeSpotlight('carousel', idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition">
 <Trash2 className="w-4 h-4" />
 </button>
 </div>
 )
 ))}
 </div>
 </div>

 {/* Top 10 Spotlights */}
 <div className="bg-black/40 backdrop-blur-3xl border border-white/5 rounded-3xl p-6">
 <h3 className="text-fluid-sm font-semibold tracking-wide mb-6 text-purple-500">Top 10 Spotlight</h3>
 <div className="space-y-4">
 {[0,1,2,3,4,5,6,7,8,9].map(idx => {
 const item = spotlights.top10?.[idx];
 return (
 <div key={idx} className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
 <div className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center font-semibold text-white/50">{idx + 1}</div>
 {item ? (
 <>
 <img src={item.poster} className="w-10 h-14 object-cover rounded-lg" alt="" />
 <div className="flex-1">
 <p className="font-bold text-fluid-sm line-clamp-1">{item.title}</p>
 </div>
 <button onClick={() => removeSpotlight('top10', idx)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-xl transition">
 <Trash2 className="w-4 h-4" />
 </button>
 </>
 ) : (
 <div className="flex-1 text-gray-600 text-fluid-xs ">Unassigned (Default will show)</div>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
}
