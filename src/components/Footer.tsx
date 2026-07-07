import React from "react";
import { Link } from "react-router-dom";
import { 
  Play, MessageCircle, Headphones, ArrowRight, Home, 
  LayoutGrid, Trophy, Radio, Shield, Lock, FileText, 
  HelpCircle, ChevronRight, Crown, Code, Globe, Sparkles,
  Tv, Film, ListMusic, Gamepad2, Settings, User
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function Footer() {
  const { siteConfig } = useAuth();
  const { showToast } = useToast();
  
  const siteName = siteConfig?.siteName || "Axis TV";
  const tagline = siteConfig?.tagline || "Your Movie Plug";
  const logoUrl = siteConfig?.logoUrl;

  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbC0knY72WU0QUNAid3B";
  const WHATSAPP_CONTACT = "https://wa.me/2348087253512?text=I%20saw%20Axis%20TV%20and%20I'm%20interested%20in...";

  return (
    <footer className="relative bg-gradient-to-b from-[#060608] to-black border-t border-white/5 pt-24 pb-28 md:pb-16 mt-28 overflow-hidden">
      {/* Dynamic Background Atmospheric Glows */}
      <div className="absolute top-0 left-1/12 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-1/12 w-[500px] h-[500px] bg-purple-500/[0.02] blur-[130px] rounded-full pointer-events-none -z-10" />
      
      {/* Decorative Top Accent Light Line */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-brand/30 to-transparent pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16">
        {/* Top Section: Branding, Details, and Clean Layout Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 mb-20">
          
          {/* Brand Identity Panel (5 columns span on large screens) */}
          <div className="lg:col-span-5 space-y-8 text-left">
            <Link to="/" className="inline-flex flex-col gap-2 group">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 shadow-lg group-hover:scale-105 duration-500 transition-transform">
                    <img 
                      src={logoUrl} 
                      alt={siteName} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-[14px] bg-brand/10 border border-brand/20 flex items-center justify-center transition-transform group-hover:scale-105 duration-500 shadow-[0_0_20px_rgba(229,9,20,0.2)]">
                    <Play className="w-4.5 h-4.5 text-brand fill-current ml-0.5" />
                  </div>
                )}
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-brand transition-colors duration-300">
                  {siteName}
                </span>
              </div>
              <span className="font-bold tracking-[0.2em] text-[10px] uppercase text-brand ml-1 transition-colors group-hover:text-white">
                {tagline}
              </span>
            </Link>

            <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-md font-medium">
              Experience the future of seamless entertainment. Stream high-definition movies, complete seasons, and exclusive live sports events with customized playback controls and instant load times.
            </p>

            {/* Micro Social & Connect Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <a 
                href={WHATSAPP_CHANNEL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-semibold text-white/90 shadow-md hover:shadow-lg active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                WhatsApp Hub
              </a>
              <a 
                href={WHATSAPP_CONTACT}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-xs font-semibold text-white/90 shadow-md hover:shadow-lg active:scale-95"
              >
                <Headphones className="w-4 h-4 text-sky-400" />
                Contact Developer
              </a>
            </div>
          </div>

          {/* Navigation Columns (7 columns span) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            
            {/* Explore Column */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-extrabold tracking-widest text-white uppercase opacity-90 border-l-2 border-brand pl-3">
                Discover
              </h4>
              <ul className="space-y-3.5 pt-2">
                <li>
                  <Link to="/" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Home className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Home</span>
                  </Link>
                </li>
                <li>
                  <Link to="/browse" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <LayoutGrid className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Browse Catalog</span>
                  </Link>
                </li>
                <li>
                  <Link to="/ranking" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Trophy className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Global Rankings</span>
                  </Link>
                </li>
                <li>
                  <Link to="/live" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Tv className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Live Television</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Collections Column */}
            <div className="space-y-4 text-left">
              <h4 className="text-xs font-extrabold tracking-widest text-white uppercase opacity-90 border-l-2 border-brand pl-3">
                Categories
              </h4>
              <ul className="space-y-3.5 pt-2">
                <li>
                  <Link to="/anime" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Sparkles className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Anime Hub</span>
                  </Link>
                </li>
                <li>
                  <Link to="/toons" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Gamepad2 className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Toons & Kids</span>
                  </Link>
                </li>
                <li>
                  <Link to="/playlist" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <ListMusic className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Playlists</span>
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <User className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">User Profile</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Column */}
            <div className="space-y-4 col-span-2 sm:col-span-1 text-left">
              <h4 className="text-xs font-extrabold tracking-widest text-white uppercase opacity-90 border-l-2 border-brand pl-3">
                Legal & Info
              </h4>
              <ul className="space-y-3.5 pt-2">
                <li>
                  <Link to="/legal/terms" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <FileText className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Terms of Service</span>
                  </Link>
                </li>
                <li>
                  <Link to="/legal/privacy" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Lock className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Privacy Policy</span>
                  </Link>
                </li>
                <li>
                  <Link to="/legal/cookies" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <Shield className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">Cookie Policy</span>
                  </Link>
                </li>
                <li>
                  <Link to="/legal/dmca" className="text-sm text-white/50 hover:text-brand transition-colors duration-300 flex items-center gap-2 group">
                    <HelpCircle className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                    <span className="font-medium">DMCA Takedown</span>
                  </Link>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Cohesive Consolidated Developer CTA Banner */}
        <div className="relative bg-gradient-to-r from-white/[0.02] to-white/[0.01] border border-white/10 rounded-3xl p-6 lg:p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-xl overflow-hidden group hover:border-white/15 transition-all duration-500">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/[0.01] blur-[60px] rounded-full -z-10 pointer-events-none group-hover:scale-110 transition-transform duration-700" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-105 transition-transform duration-500">
              <Crown className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-white font-semibold text-lg tracking-tight">
                Want to build your own custom streaming app?
              </h4>
              <p className="text-white/60 text-sm leading-relaxed max-w-xl">
                Get a highly optimized, fully featured streaming app customized for your brand with instant load times and seamless premium playback.
              </p>
            </div>
          </div>
          
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-center shrink-0">
            <a 
              href={WHATSAPP_CONTACT}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-white text-black hover:bg-neutral-100 active:scale-95 transition-all text-sm font-semibold rounded-2xl shadow-xl flex items-center justify-center gap-2 group/btn"
            >
              <Code className="w-4 h-4" />
              <span>Contact Developer</span>
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </a>
            <a 
              href={WHATSAPP_CHANNEL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl transition-all text-sm flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>Join Channel</span>
            </a>
          </div>
        </div>

        {/* Thin bottom separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full mb-8" />

        {/* Copyright and Safe Streaming Disclaimer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-2">
          <div className="text-center md:text-left space-y-1.5">
            <p className="text-white/40 text-sm font-medium tracking-wide">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <p className="text-white/20 text-xs max-w-2xl leading-normal">
              This site is a custom search engine index. Content streams are handled and hosted securely by non-affiliated third-party providers. We do not store or host any media files directly on our systems.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-white/30 font-medium">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 opacity-60" />
              English
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
            <span>Secure Streaming</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

export default React.memo(Footer);
