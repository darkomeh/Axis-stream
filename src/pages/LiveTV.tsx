import React from "react";
import { useNavigate } from "react-router-dom";
import { Tv, ArrowLeft, Radio, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";

export default function LiveTV() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-hidden font-sans pb-32 relative flex flex-col justify-between">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full bg-[#FF453A]/10 blur-[80px] pointer-events-none animate-pulse duration-[4000ms]" />
      <div className="absolute bottom-1/4 left-1/3 w-60 h-60 rounded-full bg-[#FF9F0A]/5 blur-[100px] pointer-events-none animate-pulse duration-[6000ms]" />

      {/* Top Header */}
      <header className="px-5 py-4 flex items-center justify-between sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-3xl border-b border-white/5">
        <div className="flex items-center gap-1">
          <span className="text-xl font-black tracking-tight">AXIS</span>
          <span className="text-xl font-black text-[#FF453A] tracking-tight">LIVE</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden border border-white/10">
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10 max-w-md mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="space-y-8 w-full"
        >
          {/* Icon Container with multi-layered glow and animation */}
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF453A]/20 animate-spin" style={{ animationDuration: '15s' }} />
            {/* Pulsing glow rings */}
            <div className="absolute inset-2 rounded-full bg-[#FF453A]/10 animate-ping opacity-70" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-2 rounded-full bg-[#FF453A]/5 animate-pulse" />
            
            {/* Glassmorphic inner circle */}
            <div className="relative w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-2xl">
              <Radio className="w-8 h-8 text-[#FF453A]" />
            </div>
          </div>

          {/* Texts */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5" />
              Tune-In Optimization
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Axis Live TV <br />
              <span className="bg-gradient-to-r from-[#FF453A] to-[#FF9F0A] bg-clip-text text-transparent">
                Coming Soon
              </span>
            </h1>
            <p className="text-sm text-white/60 font-medium leading-relaxed px-2">
              We are currently finalizing our broadcast encoders and optimizing streaming buffers to deliver flawless, ultra-HD 4K live feeds for production. Get ready for premium non-stop entertainment!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => navigate("/")}
              className="w-full bg-white text-black font-bold py-3.5 px-6 rounded-2xl hover:bg-neutral-200 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2 text-sm"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate("/browse")}
              className="w-full bg-white/5 border border-white/10 text-white font-bold py-3.5 px-6 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Tv className="w-4 h-4" />
              Explore VOD Library
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Branding */}
      <div className="w-full text-center pb-8 opacity-40 text-[10px] font-bold tracking-widest uppercase">
        © 2026 AXIS TV. All rights reserved.
      </div>
    </div>
  );
}
