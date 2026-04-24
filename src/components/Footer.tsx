import React from "react";
import { Link } from "react-router-dom";
import { 
  Play, MessageCircle, Headphones, ArrowRight, Home, 
  LayoutGrid, Trophy, Radio, Shield, Lock, FileText, 
  HelpCircle, ChevronRight, Crown
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

function Footer() {
  const { showToast } = useToast();
  const WHATSAPP_CHANNEL = "https://whatsapp.com/channel/0029VbC0knY72WU0QUNAid3B";
  const WHATSAPP_CONTACT = "https://wa.me/2348087253512?text=I%20saw%20Axis%20TV%20and%20I'm%20interested%20in...";

  return (
    <footer className="relative bg-black border-t border-white/5 pt-16 pb-12 mt-20 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand/5 blur-[120px] rounded-full -z-10" />

      <div className="max-w-[1400px] mx-auto px-fluid">
        {/* Top Logo & Branding */}
        <div className="mb-8 md:mb-12">
          <Link to="/" className="flex items-center gap-3 mb-6 group">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-brand flex items-center justify-center shadow-[0_0_20px_rgba(255,45,45,0.4)] transition-transform group-hover:scale-110 duration-500">
              <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-current ml-0.5" />
            </div>
            <span className="text-2xl md:text-3xl font-black italic tracking-tighter text-white uppercase">
              AXIS <span className="text-brand not-italic">TV</span>
            </span>
          </Link>
          <p className="text-gray-400 text-fluid-xs md:text-[15px] leading-relaxed max-w-2xl font-medium">
            Experience the ultimate premium streaming platform. Watch the latest movies, series, and exclusive content in high quality with our seamless cinematic interface.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-12 md:mb-16">
          <a 
            href={WHATSAPP_CHANNEL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 md:p-6 bg-[#121212] border border-white/5 rounded-2xl group hover:border-brand/40 transition-all duration-300"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#1D2B1D] flex items-center justify-center text-[#4ADE80] group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 md:w-8 md:h-8 fill-current" />
              </div>
              <div>
                <h4 className="text-white font-black uppercase text-xs md:text-sm tracking-widest mb-1">WhatsApp Channel</h4>
                <p className="text-gray-500 text-[10px] md:text-xs font-bold leading-tight">Join our channel for<br />updates & news</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-brand group-hover:translate-x-2 transition-transform" />
          </a>

          <a 
            href={WHATSAPP_CONTACT} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 md:p-6 bg-[#121212] border border-white/5 rounded-2xl group hover:border-brand/40 transition-all duration-300"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/5 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <Headphones className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <h4 className="text-white font-black uppercase text-xs md:text-sm tracking-widest mb-1">Contact Dev</h4>
                <p className="text-gray-500 text-[10px] md:text-xs font-bold leading-tight">Need help or want to<br />build a site like this?</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-brand group-hover:translate-x-2 transition-transform" />
          </a>
        </div>

        <div className="h-px bg-white/5 w-full mb-12 md:mb-16" />

        {/* Main Navigation Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="space-y-4 md:space-y-6">
            <h3 className="text-white font-black uppercase text-fluid-xs md:text-[15px] tracking-[0.2em] relative inline-block">
              Explore
              <div className="absolute -bottom-2 left-0 w-8 h-[2px] md:h-[3px] bg-brand" />
            </h3>
            <ul className="space-y-3 md:space-y-4">
              <li>
                <Link to="/" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Home</span>
                </Link>
              </li>
              <li>
                <Link to="/browse" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Browse</span>
                </Link>
              </li>
              <li>
                <Link to="/ranking" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Trophy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Rankings</span>
                </Link>
              </li>
              <li>
                <Link to="/live" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Radio className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Live Sports</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4 md:space-y-6">
            <h3 className="text-white font-black uppercase text-fluid-xs md:text-[15px] tracking-[0.2em] relative inline-block">
              Legal
              <div className="absolute -bottom-2 left-0 w-8 h-[2px] md:h-[3px] bg-brand" />
            </h3>
            <ul className="space-y-3 md:space-y-4">
              <li>
                <Link to="/legal/terms" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group w-full text-left">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Shield className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Terms</span>
                </Link>
              </li>
              <li>
                <Link to="/legal/privacy" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group w-full text-left">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <Lock className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Privacy</span>
                </Link>
              </li>
              <li>
                <Link to="/legal/cookies" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group w-full text-left">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">Cookies</span>
                </Link>
              </li>
              <li>
                <Link to="/legal/dmca" className="flex items-center gap-3 text-gray-500 hover:text-white transition-colors group w-full text-left">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-white/2 flex items-center justify-center group-hover:bg-brand/10 transition-colors">
                    <FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </div>
                  <span className="text-[11px] md:text-sm font-bold uppercase tracking-widest">DMCA</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Empty Space for desktop layout matching */}
          <div className="hidden lg:block"></div>
          <div className="hidden lg:block"></div>
        </div>

        {/* Developer Promotion Banner */}
        <div className="bg-[#121212] border border-white/5 rounded-2xl p-fluid-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-brand/10 flex items-center justify-center text-brand shrink-0 animate-pulse shadow-[0_0_20px_rgba(255,45,45,0.2)]">
              <Crown className="w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h4 className="text-white font-black uppercase text-sm md:text-base tracking-widest mb-1 italic">Want to create a site like AXIS TV?</h4>
              <p className="text-gray-500 text-[11px] md:text-[13px] font-bold leading-relaxed max-w-xl">
                Contact the developer to get your own premium streaming website or app.
              </p>
            </div>
          </div>
          <a 
            href={WHATSAPP_CONTACT}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto px-fluid py-4 bg-transparent border border-brand/40 text-brand font-black uppercase tracking-widest text-[10px] md:text-[11px] rounded-xl hover:bg-brand/5 transition-all text-center"
          >
            Contact Dev
          </a>
        </div>

        {/* Bottom WhatsApp Channel Persistent Link */}
        <a 
          href={WHATSAPP_CHANNEL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-4 bg-[#121212]/50 border border-white/5 rounded-2xl mb-12 hover:border-brand/30 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand transition-colors">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h5 className="text-white font-black text-sm uppercase tracking-widest">WhatsApp Channel</h5>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Stay updated with the latest movies, series & more</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:translate-x-1 group-hover:text-brand transition-all" />
        </a>

        {/* Final Disclaimer & Copyright */}
        <div className="pt-8 border-t border-white/5 text-center">
          <p className="text-gray-500 text-sm font-black uppercase tracking-[0.2em] mb-4 overflow-hidden">
            &copy; 2026 <span className="text-brand italic">AXIS TV</span>. All rights reserved.
          </p>
          <p className="text-gray-600 text-[11px] font-bold uppercase tracking-widest leading-loose max-w-4xl mx-auto opacity-60">
            This site does not store any files on its server. All contents are provided by non-affiliated third parties.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default React.memo(Footer);

