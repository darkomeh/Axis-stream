import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ItemDetails, formatDurationToHours } from '../types';
import { Play, ChevronDown } from 'lucide-react';
import Tray from './Tray';

interface EpisodeSelectorProps {
  seasons: ItemDetails['seasons'];
  selectedSeason: number;
  selectedEpisode: number;
  onEpisodeChange: (s: number, e: number) => void;
  onPlay?: () => void;
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
  onPlay,
  itemId,
  progressList,
  episodeDetails,
  poster
}: EpisodeSelectorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeEpisodeRef = useRef<HTMLButtonElement>(null);
  const [isSeasonTrayOpen, setIsSeasonTrayOpen] = useState(false);

  // Auto-center current episode within its container (without scrolling the page body)
  useEffect(() => {
    if (activeEpisodeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = activeEpisodeRef.current;
      const scrollLeft = element.offsetLeft - (container.offsetWidth / 2) + (element.offsetWidth / 2);
      container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedEpisode, selectedSeason]);

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
    const durationStr = realEp?.duration ? (realEp.duration.includes(':') ? realEp.duration : formatDurationToHours(String(realEp.duration))) : '';
    
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
    return `${activeEpInfo.duration} remaining`;
  }, [activeEpInfo.duration]);

  return (
    <div className="space-y-10 animate-in fade-in duration-1000">
      {/* Dropdown-style Season Selector Trigger */}
      <div className="space-y-4">
        <button
          onClick={() => setIsSeasonTrayOpen(true)}
          className="relative flex items-center justify-between pl-5 pr-4 py-3 rounded-2xl bg-[#0d0d0d] border border-white/5 hover:border-white/10 active:scale-[0.99] transition-all text-left group cursor-pointer w-full max-w-[240px] overflow-hidden shadow-sm"
        >
          {/* Red vertical bar accent on left with neon glow */}
          <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-[#ff0f39] rounded-r shadow-[0_0_15px_rgba(255,15,57,0.8)]" />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase leading-none mb-1">Selection</span>
            <span className="text-white font-bold text-base tracking-tight">
              Season {String(selectedSeason).padStart(2, '0')}
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white group-hover:bg-white/10 transition-all ml-4">
            <ChevronDown className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* Slide-up Season Tray */}
      <Tray
        isOpen={isSeasonTrayOpen}
        onClose={() => setIsSeasonTrayOpen(false)}
        title="Select Season"
        backgroundImage={poster}
      >
        <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto no-scrollbar pb-8 px-2 relative z-10">
          {seasons.map((s) => {
            const isActive = s.se === selectedSeason;
            return (
              <button
                key={s.se}
                onClick={() => {
                  onEpisodeChange(s.se, 1);
                  setIsSeasonTrayOpen(false);
                }}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all text-left group relative overflow-hidden active:scale-[0.99] cursor-pointer backdrop-blur-md ${
                  isActive
                    ? 'bg-brand/10 border-brand/50 shadow-[0_0_30px_rgba(229,9,20,0.25),inset_0_0_15px_rgba(229,9,20,0.15)]'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
                }`}
              >
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-fluid-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-brand text-white shadow-[0_0_20px_rgba(229,9,20,0.6)]' 
                      : 'bg-white/10 text-white/60 group-hover:text-white group-hover:bg-white/20 group-hover:scale-105'
                  }`}>
                    S{s.se}
                  </div>
                  <div>
                    <h4 className={`font-semibold text-fluid-base transition-all duration-300 ${isActive ? 'text-brand drop-shadow-[0_0_12px_rgba(229,9,20,0.4)]' : 'text-white/80 group-hover:text-white'}`}>
                      Season {s.se}
                    </h4>
                    <p className="text-white/40 text-xs mt-1 font-medium tracking-wide">
                      {s.maxEp} Episodes Available
                    </p>
                  </div>
                </div>
                {isActive ? (
                  <div className="w-3 h-3 rounded-full bg-brand shadow-[0_0_12px_rgba(229,9,20,1)] relative z-10 animate-pulse" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/20 group-hover:text-white/60 group-hover:bg-white/10 transition-all z-10 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 duration-300">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                )}
                {/* Micro reflection highlight on hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            );
          })}
        </div>
      </Tray>

      {/* Horizontal Episode Navigator - Circular and Minimal */}
      <div className="space-y-4">
        <div className="relative group">
          <div ref={scrollRef} className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-10 -mx-fluid px-fluid scroll-smooth">
            {Array.from({ length: episodesCount }).map((_, idx) => {
              const ep = idx + 1;
              const isActive = selectedEpisode === ep;
              const progress = getEpProgress(ep);
              
              return (
                <button
                  key={ep}
                  ref={isActive ? activeEpisodeRef : null}
                  onClick={() => onEpisodeChange(selectedSeason, ep)}
                  className={`flex-shrink-0 w-16 h-16 rounded-full border transition-all text-center relative overflow-hidden flex flex-col justify-center items-center group/card active:scale-95 ${
                    isActive 
                      ? 'bg-[#ff0f39] border-[#ff0f39] shadow-[0_0_20px_rgba(255,15,57,0.5)]' 
                      : 'bg-[#121212] border-white/5 hover:border-white/10 text-white/40 hover:text-white'
                  }`}
                >
                  <span className={`block text-fluid-2xl font-bold tracking-tight transition-all leading-none ${isActive ? 'text-white' : 'text-white/40 group-hover/card:text-white'}`}>
                    {ep}
                  </span>

                  {/* Subtle Indicator for playing - small dot at bottom */}
                  {isActive && (
                    <div className="absolute bottom-2.5 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  )}

                  {/* Progress bar overlay if not active */}
                  {!isActive && progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                      <div 
                        className="h-full bg-[#ff0f39]/60 transition-all duration-1000" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* "Current" Status Banner - Matches bottom of reference image */}
      <div className="pt-4">
        <div 
          onClick={onPlay}
          className="p-5 md:p-6 rounded-3xl bg-[#0d0d0d] border border-white/5 flex items-center justify-between gap-5 group cursor-pointer hover:bg-[#121212]/80 transition-all"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-[#ff0f39] px-2.5 py-1 rounded-lg">Current</span>
              <h4 className="text-white font-bold text-lg md:text-xl tracking-tight scale-y-110 truncate">
                {activeEpInfo.title}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-white/40 tracking-wide leading-none">
              <span>S{selectedSeason}</span>
              <span>•</span>
              <span>E{selectedEpisode}</span>
              {remainingTimeStr && (
                <>
                  <span>•</span>
                  <span>{remainingTimeStr}</span>
                </>
              )}
            </div>
          </div>
          
          <div className="w-12 h-12 rounded-full bg-[#ff0f39] flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,15,57,0.4)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex-shrink-0">
            <Play className="w-4 h-4 fill-white ml-0.5" strokeWidth={0} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EpisodeSelectorComponent);
