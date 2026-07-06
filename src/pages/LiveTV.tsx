import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Tv, Play, ChevronRight, PlayCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { LIVE_CHANNELS } from "../data/liveChannels";
import { useAuth } from "../contexts/AuthContext";

const CATEGORIES = ["All", "Entertainment", "Movies", "Kids"];

export default function LiveTV() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { user } = useAuth();
  const navigate = useNavigate();

  const filteredChannels = selectedCategory === "All" 
    ? LIVE_CHANNELS 
    : LIVE_CHANNELS.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden font-sans pb-32">
      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-1">
          <span className="text-xl font-black tracking-tight">AXIS</span>
          <span className="text-xl font-black text-[#FF453A] tracking-tight">LIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-white/80 hover:text-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-5 pt-6 space-y-8">
        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Live TV</h1>
          <p className="text-sm text-white/50 font-medium">Watch any channel. Anytime.</p>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-3 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all shrink-0 ${
                selectedCategory === cat
                  ? "bg-[#FF453A] text-white shadow-[0_0_15px_rgba(255,69,58,0.3)]"
                  : "bg-white/[0.06] text-white/70 border border-white/5 hover:bg-white/10"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Now (Featured) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Live Now</h2>
          <motion.div 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/live/${LIVE_CHANNELS[0].id}`)}
            className="relative w-full h-[220px] rounded-[24px] overflow-hidden cursor-pointer group shadow-[0_10px_40px_rgba(255,69,58,0.15)]"
          >
            {/* Liquid Glass Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a0505] to-[#080808]" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
            <div className="absolute -inset-20 bg-[#FF453A]/20 blur-[60px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            {/* Border */}
            <div className="absolute inset-0 rounded-[24px] border border-white/10 pointer-events-none" />

            <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF453A] animate-pulse" />
              <span className="text-[10px] font-bold text-[#FF453A] tracking-wider">LIVE</span>
            </div>

            <div className="absolute inset-0 p-6 flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl shrink-0">
                <PlayCircle className="w-10 h-10 text-white/80" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">{LIVE_CHANNELS[0].name}</h3>
                  <p className="text-sm text-[#FF453A] font-semibold mt-0.5">Live Now</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-white/90 truncate">{LIVE_CHANNELS[0].currentProgram}</p>
                  <p className="text-xs text-white/50">10:00 AM - 12:00 PM</p>
                </div>
                <button className="mt-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white text-sm font-semibold py-2 px-5 rounded-full flex items-center gap-2 transition-colors">
                  <Play className="w-4 h-4" fill="currentColor" />
                  Watch Now
                </button>
              </div>
            </div>
          </motion.div>
          
  
        </div>

        {/* Continue Watching */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Continue Watching</h2>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-4">
            {LIVE_CHANNELS.slice(1, 4).map((channel) => (
              <motion.div
                whileTap={{ scale: 0.96 }}
                key={`cw-${channel.id}`}
                onClick={() => navigate(`/live/${channel.id}`)}
                className="w-[160px] h-[180px] shrink-0 rounded-[24px] bg-white/[0.04] border border-white/5 relative flex flex-col items-center justify-center p-4 cursor-pointer hover:bg-white/[0.08] transition-colors overflow-hidden group"
              >
                <div className="absolute top-3 right-3 bg-[#FF453A] text-white text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded-sm z-10">
                  LIVE
                </div>
                
                <img src={channel.image} alt={channel.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                
                <div className="text-center w-full mt-auto mb-2 space-y-1 z-10 relative">
                  <h4 className="text-sm font-bold truncate text-white">{channel.name}</h4>
                  <p className="text-[10px] text-white/70 truncate">{channel.currentProgram}</p>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden absolute bottom-4 left-0 right-0 w-[calc(100%-2rem)] mx-auto z-10">
                  <div className="h-full bg-[#FF453A] rounded-full" style={{ width: `${(parseInt(channel.id.replace('channel-', '')) || 1) * 7 % 60 + 20}%` }} />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Popular Channels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Popular Channels</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-4">
            {filteredChannels.map((channel, i) => (
              <motion.div
                whileTap={{ scale: 0.95 }}
                key={`pop-${channel.id}`}
                onClick={() => navigate(`/live/${channel.id}`)}
                className="w-[120px] h-[90px] shrink-0 rounded-[16px] bg-white/[0.04] border border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors relative overflow-hidden group"
              >
                <img src={channel.image} alt={channel.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <span className="text-[11px] font-bold text-white truncate w-full text-center px-2 absolute bottom-2 z-10">{channel.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Category Rows */}
        {Array.from(new Set(LIVE_CHANNELS.map(c => c.category))).filter(Boolean).map((categoryRow) => {
          const rowChannels = LIVE_CHANNELS.filter(c => c.category === categoryRow);
          if (rowChannels.length === 0) return null;
          return (
            <div key={categoryRow} className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{categoryRow}</h2>
              </div>
              <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-5 px-5 pb-4">
                {rowChannels.map((channel) => (
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    key={`cat-${channel.id}`}
                    onClick={() => navigate(`/live/${channel.id}`)}
                    className="w-[120px] h-[90px] shrink-0 rounded-[16px] bg-white/[0.04] border border-white/5 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.08] transition-colors relative overflow-hidden group"
                  >
                    <img src={channel.image} alt={channel.name} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    <span className="text-[11px] font-bold text-white truncate w-full text-center px-2 absolute bottom-2 z-10">{channel.name}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
