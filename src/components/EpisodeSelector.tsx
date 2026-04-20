import React from 'react';
import { ItemDetails } from '../types';

interface EpisodeSelectorProps {
  seasons: ItemDetails['seasons'];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeChange: (s: number, e: number) => void;
}

export default function EpisodeSelector({ seasons, selectedSeason, selectedEpisode, onEpisodeChange }: EpisodeSelectorProps) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-400">Season:</label>
        <select 
          value={selectedSeason}
          onChange={(e) => onEpisodeChange(Number(e.target.value), 1)}
          className="bg-white/5 border border-white/10 text-white rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {seasons.map((s) => (
            <option key={s.se} value={s.se}>Season {s.se}</option>
          ))}
        </select>
      </div>

      {/* Episode List */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: seasons.find(s => s.se === selectedSeason)?.maxEp || 0 }).map((_, idx) => {
          const ep = idx + 1;
          const isActive = selectedEpisode === ep;
          return (
            <button
              key={ep}
              onClick={() => onEpisodeChange(selectedSeason, ep)}
              className={`p-4 rounded-xl text-left transition-all ${
                isActive 
                  ? "bg-brand text-white font-bold shadow-[0_0_15px_rgba(229,9,20,0.4)]" 
                  : "bg-white/5 text-gray-300 hover:bg-white/10"
              }`}
            >
              <p className="text-xs opacity-70 mb-1">Episode {ep}</p>
              <p className="text-sm">Episode {ep}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
