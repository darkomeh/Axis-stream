import React from 'react';
import { ItemDetails } from '../types';
import { Play, Download } from 'lucide-react';
import { motion } from 'motion/react';

interface EpisodeSelectorProps {
  seasons: ItemDetails['seasons'];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeChange: (s: number, e: number) => void;
  poster?: string;
}

export default function EpisodeSelector({ seasons, selectedSeason, selectedEpisode, onEpisodeChange, poster }: EpisodeSelectorProps) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  const currentSeason = seasons.find(s => s.se === selectedSeason);
  const episodesCount = currentSeason?.maxEp || 0;

  return (
    <div className="space-y-8 py-4">
      {/* Season Selector */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xl font-black uppercase tracking-tighter text-white">Episodes</h3>
        <select 
          value={selectedSeason}
          onChange={(e) => onEpisodeChange(Number(e.target.value), 1)}
          className="bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors"
        >
          {seasons.map((s) => (
            <option key={s.se} value={s.se} className="bg-bg-sidebar">Season {s.se}</option>
          ))}
        </select>
      </div>

      {/* Episode Horizontal List */}
      <div className="flex overflow-x-auto gap-5 pb-6 no-scrollbar snap-x snap-mandatory px-2">
        {Array.from({ length: episodesCount }).map((_, idx) => {
          const ep = idx + 1;
          const isActive = selectedEpisode === ep;
          return (
            <motion.button
              key={ep}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onEpisodeChange(selectedSeason, ep)}
              className={`flex-none w-[240px] md:w-[300px] snap-start text-left transition-all rounded-2xl overflow-hidden group ${
                isActive ? 'ring-2 ring-brand ring-offset-4 ring-offset-black' : ''
              }`}
            >
              {/* Thumbnail Placeholder */}
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-[#1A1A1A]">
                {poster && (
                  <img 
                    src={poster} 
                    alt={`Episode ${ep}`} 
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`}
                    referrerPolicy="no-referrer"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                
                {/* Play icon overlay */}
                <div className={`absolute inset-0 flex items-center justify-center transition-all ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-sm ${isActive ? 'bg-brand border-brand' : 'bg-black/20'}`}>
                      <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
                   </div>
                </div>

                <div className="absolute bottom-2 left-3">
                   <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">24m</span>
                </div>
              </div>

              <div className="px-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={`text-sm font-black uppercase tracking-tight truncate ${isActive ? 'text-brand' : 'text-white'}`}>
                    {ep}. Episode {ep}
                  </h4>
                  <Download className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
                </div>
                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  In this episode, the team faces their biggest challenge yet as secrets from the past resurface.
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
