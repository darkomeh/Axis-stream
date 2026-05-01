import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, Cpu, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export default function ServerHealthMonitor() {
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch('/api/server-health');
        if (res.ok) {
          const data = await res.json();
          setHealthData(data);
        }
      } catch (e) {
        console.error("Failed to fetch server health:", e);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0d 0h 0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="flex items-center gap-3 relative">
        <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
          <Server className="w-6 h-6 text-blue-500" />
        </div>
        <div>
           <h2 className="text-2xl font-black italic uppercase tracking-tighter">Server Health</h2>
           <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">Live Host Diagnostics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative">
        <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col justify-between group hover:bg-white/5 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Activity className="w-3 h-3" /> Uptime
          </p>
          <p className="text-xl font-bold italic tracking-tight">{healthData ? formatUptime(healthData.uptime) : 'Loading...'}</p>
        </div>

        <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col justify-between group hover:bg-white/5 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Database className="w-3 h-3" /> Memory (RSS)
          </p>
          <p className="text-xl font-bold italic tracking-tight">
             {healthData?.memory ? `${Math.floor(healthData.memory.rss / 1024 / 1024)} MB` : 'N/A'}
          </p>
        </div>

        <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col justify-between group hover:bg-white/5 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Cpu className="w-3 h-3" /> Arch / Platform
          </p>
          <p className="text-xl font-bold italic tracking-tight uppercase">
             {healthData ? `${healthData.arch} / ${healthData.platform}` : 'Loading...'}
          </p>
        </div>

        <div className="p-6 bg-black/40 rounded-3xl border border-white/5 flex flex-col justify-between group hover:bg-white/5 transition-all">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
             <Globe className="w-3 h-3" /> Node Version
          </p>
          <p className="text-xl font-bold italic tracking-tight truncate">
             {healthData ? healthData.nodeVersion : 'Loading...'}
          </p>
        </div>
      </div>
    </div>
  );
}
