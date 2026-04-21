import React from 'react';
import { ItemDetails } from '../types';
import { Play, Download, MoreVertical } from 'lucide-react';
import { motion } from 'motion/react';

interface EpisodeSelectorProps {
  seasons: ItemDetails['seasons'];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeChange: (s: number, e: number) => void;
  poster?: string;
  itemId?: string;
  progressList?: any[];
  variant?: 'horizontal' | 'vertical'; // Maintaining prop sig but ignoring internal old style
}

export default function EpisodeSelector({ 
  seasons, 
  selectedSeason, 
  selectedEpisode, 
  onEpisodeChange, 
  poster, 
  itemId, 
  progressList,
}: EpisodeSelectorProps) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  const currentSeason = seasons.find(s => s.se === selectedSeason);
  const episodesCount = currentSeason?.maxEp || 0;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black uppercase tracking-tight text-white mb-6">Episodes</h3>
      
      <div className="flex flex-col md:flex-row gap-6 md:items-start">
        {/* Left Panel: Season Selector */}
        <div className="w-full md:w-52 flex-shrink-0 space-y-3">
          {seasons.map((s) => {
            const isActive = selectedSeason === s.se;
            return (
              <button
                key={s.se}
                onClick={() => onEpisodeChange(s.se, 1)}
                className={`w-full text-left p-4 rounded-xl transition-all relative overflow-hidden group ${
                  isActive 
                    ? 'bg-gradient-to-br from-brand/20 to-transparent border border-brand/50 shadow-[0_0_20px_rgba(255,45,45,0.15)] scale-[1.02]' 
                    : 'bg-[#121212] border border-white/5 hover:border-white/20'
                }`}
              >
                <div className="relative z-10">
                  <span className={`block font-black text-sm uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white transition-colors'}`}>
                    Season {s.se}
                  </span>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-tighter mt-0.5">
                    {s.maxEp} Episodes
                  </span>
                </div>
                {isActive && (
                  <div className="absolute inset-0 bg-brand/5 backdrop-blur-sm" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Panel: Episode List */}
        <div className="flex-1 space-y-4">
          {Array.from({ length: episodesCount }).map((_, idx) => {
            const ep = idx + 1;
            const isActive = selectedEpisode === ep;
            const epProgress = progressList?.find(p => p.id === itemId && p.season === selectedSeason && p.episode === ep);
            const progressPercent = epProgress ? (epProgress.progress / epProgress.duration) * 100 : 0;

            const episodeTitle = ep === 1 ? 'Episode 1' : ep === 2 ? 'Episode 2' : ep === 3 ? 'Episode 3' : `Episode ${ep}`;
            const episodeDate = "April 24, 2022";
            const episodeDuration = "20m";
            const episodeDesc = "A clumsy bee causes chaos in a luxurious mansion, setting the stage for an unlikely battle of wits.";

            return (
              <motion.div
                key={ep}
                initial={false}
                animate={{ scale: isActive ? 1.01 : 1 }}
                onClick={() => onEpisodeChange(selectedSeason, ep)}
                className={`flex gap-4 p-3 rounded-2xl cursor-pointer transition-all border ${
                  isActive 
                    ? 'bg-[#1A1A1A] border-brand shadow-[0_0_30px_rgba(255,45,45,0.15)] ring-1 ring-brand/30' 
                    : 'bg-[#121212] border-white/5 hover:bg-[#181818] hover:border-white/10'
                }`}
              >
                {/* Episode Thumbnail */}
                <div className="relative w-32 md:w-44 aspect-video rounded-xl overflow-hidden bg-[#1A1A1A] flex-shrink-0 group">
                  {poster && (
                    <img 
                      src={poster} 
                      alt={episodeTitle} 
                      className={`w-full h-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-40 hover:opacity-100 transition-all duration-700'}`}
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Play Icon Overlay */}
                  <div className={`absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}>
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/40 backdrop-blur-md ${isActive ? 'bg-brand border-brand' : 'bg-black/20'}`}>
                        <Play className={`w-4 h-4 text-white ${isActive ? 'fill-current' : ''} translate-x-0.5`} />
                     </div>
                  </div>

                  {/* Progress Indicator */}
                  {progressPercent > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-brand" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
                    </div>
                  )}
                </div>

                {/* Episode Details */}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="space-y-1.5 overflow-hidden">
                    <div className="flex flex-col">
                       <h4 className={`text-sm md:text-base font-black uppercase tracking-tight truncate ${isActive ? 'text-white' : 'text-gray-300'}`}>
                          {ep}. {episodeTitle}
                       </h4>
                       <div className="flex items-center gap-2 text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">
                         <span>{episodeDuration}</span>
                         <span className="opacity-30">•</span>
                         <span>{episodeDate}</span>
                       </div>
                    </div>
                    <p className="hidden sm:block text-[11px] md:text-xs text-gray-500 font-medium leading-relaxed line-clamp-2 max-w-xl">
                      {episodeDesc}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pl-4">
                     <button className="p-2 border border-white/5 rounded-lg bg-white/2 hover:bg-white/5 transition-colors group">
                        <Download className="w-4 h-4 md:w-5 md:h-5 text-gray-500 group-hover:text-white transition-colors" />
                     </button>
                     <button className="p-2 border border-white/5 rounded-lg bg-white/2 hover:bg-white/5 transition-colors group">
                        <MoreVertical className="w-4 h-4 md:w-5 md:h-5 text-gray-500 group-hover:text-white transition-colors" />
                     </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          <button className="w-full py-4 mt-4 bg-[#121212] border border-white/5 rounded-2xl flex items-center justify-center gap-3 text-xs font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white hover:bg-[#161616] transition-all group">
             <span>View All Episodes</span>
             <motion.div animate={{ y: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
               <ChevronDown className="w-4 h-4" />
             </motion.div>
          </button>
        </div>
      </div>
    </div>
  );
}

import { ChevronDown } from 'lucide-react';
