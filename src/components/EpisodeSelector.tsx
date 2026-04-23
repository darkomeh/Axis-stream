import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ItemDetails } from '../types';
import { Download, ChevronDown, Film, X, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Tray from './Tray';

interface EpisodeSelectorProps {
  seasons: ItemDetails['seasons'];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeChange: (s: number, e: number) => void;
  poster?: string;
  itemId?: string;
  progressList?: any[];
  episodeDetails?: any; 
}

const EpisodeSelectorComponent = ({ 
  seasons, 
  selectedSeason, 
  selectedEpisode, 
  onEpisodeChange,
  itemId,
  progressList,
  episodeDetails,
  poster
}: EpisodeSelectorProps) => {
  const [isSeasonTrayOpen, setIsSeasonTrayOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seasonScrollRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLButtonElement>(null);
  const activeSeasonRef = useRef<HTMLButtonElement>(null);

  // Auto-center current episode within its container (without scrolling the page body)
  useEffect(() => {
    if (activeEpisodeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = activeEpisodeRef.current;
      const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedEpisode, selectedSeason]);

  // Auto-center current season when tray opens (without scrolling the page body)
  useEffect(() => {
    if (isSeasonTrayOpen && activeSeasonRef.current && seasonScrollRef.current) {
      const timer = setTimeout(() => {
        const container = seasonScrollRef.current;
        const element = activeSeasonRef.current;
        if (container && element) {
          const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSeasonTrayOpen]);

  if (!Array.isArray(seasons) || seasons.length === 0) return null;

  const currentSeason = seasons.find(s => s.se === selectedSeason);
  const episodesCount = currentSeason?.maxEp || 0;

  const getEpProgress = useCallback((ep: number) => {
    if (!progressList || !itemId) return 0;
    const progressItem = progressList.find(p => p.id === itemId && p.season === selectedSeason && p.episode === ep);
    if (!progressItem || !progressItem.duration) return 0;
    return (progressItem.progress / progressItem.duration) * 100;
  }, [progressList, itemId, selectedSeason]);

  const getEpInfo = useCallback((ep: number) => {
    const realEp = episodeDetails?.episodes?.find((e: any) => e.episode === ep && e.season === selectedSeason);
    
    // Leaving it plain as requested, avoiding "Full HD" or "SD" labels
    const sizeStr = realEp?.size || '';
    const durationStr = realEp?.duration ? (realEp.duration.includes(':') ? realEp.duration : `${realEp.duration}m`) : '';
    
    return {
      title: realEp?.title || `Episode ${ep}`,
      size: sizeStr,
      duration: durationStr,
      thumbnail: realEp?.poster || realEp?.cover || realEp?.image
    };
  }, [episodeDetails, selectedSeason]);

  const activeEpInfo = useMemo(() => getEpInfo(selectedEpisode), [selectedEpisode, getEpInfo]);

  const remainingTimeStr = useMemo(() => {
    if (!activeEpInfo.duration) return '';
    // If it's something like "45m", just return it. 
    // If we had real progress tracking we'd subtract here.
    return `${activeEpInfo.duration} remaining`;
  }, [activeEpInfo.duration]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Season Selector - Matches Image 1, Shrinked as requested */}
      <div className="flex items-center">
        <button 
          onClick={() => setIsSeasonTrayOpen(true)}
          className="relative flex items-center gap-5 pl-6 pr-8 py-3.5 bg-[#121212]/40 backdrop-blur-3xl rounded-[24px] border border-white/5 hover:bg-[#181818]/60 transition-all group overflow-hidden"
        >
          {/* Subtle Glow Borders */}
          <div className="absolute left-0 top-1/4 bottom-1/4 w-[2.5px] bg-brand shadow-[0_0_12px_rgba(255,45,45,0.8)] rounded-full" />
          <div className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-brand/40 to-transparent" />

          <div className="flex flex-col items-start leading-none gap-0.5">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em]">Selection</span>
            <span className="text-[18px] font-black text-white tracking-tight uppercase italic group-hover:text-brand transition-colors">
              Season {selectedSeason.toString().padStart(2, '0')}
            </span>
          </div>
          
          <div className="w-11 h-11 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-brand/10 group-hover:border-brand/30 transition-all duration-500 shadow-inner">
            <ChevronDown className="w-5 h-5 text-white/30 group-hover:text-brand group-hover:rotate-180 transition-all duration-500" />
          </div>
        </button>
      </div>

      {/* Vertical Episode Navigator - Smaller as requested */}
      <div className="relative group">
        <div ref={scrollRef} className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-10 -mx-1 px-1 scroll-smooth">
          {Array.from({ length: episodesCount }).map((_, idx) => {
            const ep = idx + 1;
            const isActive = selectedEpisode === ep;
            const progress = getEpProgress(ep);
            
            return (
              <button
                key={ep}
                ref={isActive ? activeEpisodeRef : null}
                onClick={() => onEpisodeChange(selectedSeason, ep)}
                className={`flex-shrink-0 w-[110px] h-[160px] p-4 rounded-[28px] border transition-all text-center relative overflow-hidden flex flex-col justify-center items-center group/card ${
                  isActive
                    ? 'bg-[#181818]/80 border-brand shadow-[0_0_50px_rgba(255,45,45,0.25)] ring-1 ring-brand/30' 
                    : 'bg-[#121212]/40 border-white/10 hover:border-white/20 hover:bg-[#1A1A1A]/60'
                }`}
              >
                <div className="space-y-2">
                  <span className={`block text-[8px] font-black uppercase tracking-[0.3em] transition-colors ${isActive ? 'text-brand' : 'text-white/20'}`}>
                    Episode
                  </span>
                  <span className={`block text-[32px] font-black italic tracking-tighter transition-all leading-none ${isActive ? 'text-white scale-110 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-gray-600 group-hover/card:text-white'}`}>
                    {ep.toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Progress Bar - Maps to real progress */}
                {progress > 0 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand shadow-[0_0_10px_rgba(255,45,45,1)] rounded-full transition-all duration-1000" 
                      style={{ width: `${Math.max(5, progress)}%` }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* "Current" Status Banner - Matches bottom of reference image */}
      <div className="pt-4">
        <div className="p-8 rounded-[32px] bg-[#121212]/40 backdrop-blur-3xl border border-white/5 flex items-center justify-between group cursor-pointer hover:bg-[#181818]/60 transition-all">
           <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] bg-brand px-3 py-1.5 rounded-lg shadow-lg">Current</span>
                <h4 className="text-white font-black uppercase text-xl md:text-2xl tracking-tighter italic scale-y-110">
                  {activeEpInfo.title}
                </h4>
              </div>
              <div className="flex items-center gap-2.5 text-[11px] font-bold text-white/30 uppercase tracking-widest leading-none">
                <span>S{selectedSeason}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                <span>E{selectedEpisode}</span>
                {remainingTimeStr && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                    <span>{remainingTimeStr}</span>
                  </>
                )}
              </div>
           </div>
           
           <div className="w-20 h-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-white group-hover:scale-105 transition-transform relative">
              <div className="absolute inset-0 rounded-full bg-brand/20 animate-pulse blur-xl" />
              <div className="w-14 h-14 rounded-full bg-[#121212]/80 border border-brand/50 flex items-center justify-center shadow-2xl relative z-10">
                 <Play className="w-6 h-6 fill-white ml-1" strokeWidth={0} />
              </div>
           </div>
        </div>
      </div>

      {/* Season Picker Modal/Tray - Uses Tray component for "Details" pop-up behavior */}
      <Tray 
        isOpen={isSeasonTrayOpen} 
        onClose={() => setIsSeasonTrayOpen(false)} 
        title={`Select Season [${seasons.length}]`}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1 px-1">
            <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Collection List</p>
            <p className="text-white/60 text-[11px] font-medium">Pick a volume to dive back into the story</p>
          </div>
          
          <div ref={seasonScrollRef} className="flex flex-nowrap gap-4 overflow-x-auto no-scrollbar pb-8 -mx-1 px-1 scroll-smooth touch-pan-x w-full">
            {seasons.map((s) => {
               const isActive = selectedSeason === s.se;
               return (
                 <button
                   key={s.se}
                   ref={isActive ? activeSeasonRef : null}
                   onClick={(e) => {
                     e.stopPropagation();
                     onEpisodeChange(s.se, 1);
                     setIsSeasonTrayOpen(false);
                   }}
                   className={`flex-shrink-0 w-[140px] aspect-[3/4.2] rounded-[28px] border transition-all text-center group overflow-hidden active:scale-[0.98] flex flex-col items-center justify-center hover:scale-[1.03] duration-500 ${
                     isActive 
                       ? 'border-brand shadow-[0_0_40px_rgba(255,45,45,0.2)] ring-1 ring-brand/30 bg-[#121212]' 
                       : 'bg-[#111] border-white/5 hover:border-white/20 hover:bg-[#161616]'
                   }`}
                 >
                   {/* Card Background Overlay - Dark Cinematic */}
                   <div className="absolute inset-0 z-0 opacity-20 group-hover:opacity-40 transition-opacity duration-700">
                     <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                     {poster ? (
                       <img src={poster} alt="" className="w-full h-full object-cover grayscale brightness-50" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="absolute inset-0 bg-[#222]" />
                     )}
                   </div>

                   <div className="relative z-10 flex flex-col items-center gap-1 scale-90 group-hover:scale-100 transition-transform duration-500">
                     <span className={`block text-[9px] font-black uppercase tracking-[0.4em] ${isActive ? 'text-brand' : 'text-gray-600'}`}>Season</span>
                     <span className={`block text-[44px] font-black italic tracking-tighter transition-all leading-none ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                       {s.se.toString().padStart(2, '0')}
                     </span>
                   </div>

                   {/* Red bar for active - Now with Pulse */}
                   {isActive && (
                     <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-brand shadow-[0_0_20px_rgba(255,45,45,1)] rounded-full animate-pulse" />
                   )}

                   {/* Subtle border glow on active */}
                   {isActive && <div className="absolute inset-0 border border-brand/20 rounded-[28px] pointer-events-none" />}
                 </button>
               );
            })}
          </div>
        </div>
      </Tray>
    </div>
  );
};

export default React.memo(EpisodeSelectorComponent);
