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
 <footer className="relative bg-black/40 backdrop-blur-3xl border-t border-white/10 pt-16 pb-24 md:pb-12 mt-20 overflow-hidden">
 {/* Background Glow */}
 <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 blur-[120px] rounded-full -z-10" />
 <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/5 blur-[120px] rounded-full -z-10" />

 <div className="max-w-[1400px] mx-auto px-fluid">
 {/* Top Logo & Branding */}
 <div className="mb-8 md:mb-12">
 <Link to="/" className="flex flex-col gap-1 mb-6 group w-fit">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-[14px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transition-transform group-hover:scale-105 duration-500 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
 <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-current ml-0.5" />
 </div>
 <span className="text-fluid-2xl font-bold tracking-tight text-white drop-shadow-md">
 Axis TV
 </span>
 </div>
 <span className="font-medium tracking-wide text-white/50 ml-14 md:ml-16 text-fluid-sm">
 Your Movie Plug
 </span>
 </Link>
 <p className="text-white/60 text-fluid-base leading-relaxed max-w-2xl font-normal mt-4">
 Axis TV is your movie plug for premium streaming. Watch the latest movies, series, and exclusive content in high quality with our seamless cinematic interface.
 </p>
 </div>

 {/* Action Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-12 md:mb-16">
 <a 
 href={WHATSAPP_CHANNEL} 
 target="_blank" 
 rel="noopener noreferrer"
 className="flex items-center justify-between p-5 md:p-6 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 hover:border-white/20 transition-all duration-300"
 >
 <div className="flex items-center gap-4 md:gap-6">
 <div className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
 <MessageCircle className="w-6 h-6 md:w-7 md:h-7" />
 </div>
 <div>
 <h4 className="text-white font-semibold text-fluid-base tracking-wide mb-1">WhatsApp Channel</h4>
 <p className="text-white/50 text-fluid-sm">Join our channel for updates & news</p>
 </div>
 </div>
 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover:translate-x-2 group-hover:text-white transition-all" />
 </a>

 <a 
 href={WHATSAPP_CONTACT} 
 target="_blank" 
 rel="noopener noreferrer"
 className="flex items-center justify-between p-5 md:p-6 bg-white/5 border border-white/10 rounded-3xl group hover:bg-white/10 hover:border-white/20 transition-all duration-300"
 >
 <div className="flex items-center gap-4 md:gap-6">
 <div className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] bg-white/10 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
 <Headphones className="w-6 h-6 md:w-7 md:h-7" />
 </div>
 <div>
 <h4 className="text-white font-semibold text-fluid-base tracking-wide mb-1">Contact Developer</h4>
 <p className="text-white/50 text-fluid-sm">Need help or want to build a site like this?</p>
 </div>
 </div>
 <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white/40 group-hover:translate-x-2 group-hover:text-white transition-all" />
 </a>
 </div>

 <div className="h-px bg-white/10 w-full mb-12 md:mb-16" />

 {/* Main Navigation Grid */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
 <div className="space-y-4 md:space-y-5">
 <h3 className="text-white font-semibold tracking-wide mb-4 text-fluid-base">
 Explore
 </h3>
 <ul className="space-y-3">
 <li>
 <Link to="/" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Home
 </Link>
 </li>
 <li>
 <Link to="/browse" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Browse
 </Link>
 </li>
 <li>
 <Link to="/ranking" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Rankings
 </Link>
 </li>
 </ul>
 </div>

 <div className="space-y-4 md:space-y-5">
 <h3 className="text-white font-semibold tracking-wide mb-4 text-fluid-base">
 Legal
 </h3>
 <ul className="space-y-3">
 <li>
 <Link to="/legal/terms" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Terms of Service
 </Link>
 </li>
 <li>
 <Link to="/legal/privacy" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Privacy Policy
 </Link>
 </li>
 <li>
 <Link to="/legal/cookies" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 Cookie Policy
 </Link>
 </li>
 <li>
 <Link to="/legal/dmca" className="text-white/60 hover:text-white transition-colors text-fluid-base">
 DMCA Content
 </Link>
 </li>
 </ul>
 </div>

 {/* Empty Space for desktop layout matching */}
 <div className="hidden lg:block"></div>
 <div className="hidden lg:block"></div>
 </div>

 {/* Developer Promotion Banner */}
 <div className="bg-white/5 border border-white/10 rounded-3xl p-6 lg:p-8 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 backdrop-blur-[20px]">
 <div className="flex items-center gap-6 text-center md:text-left">
 <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
 <Crown className="w-6 h-6 md:w-8 md:h-8" />
 </div>
 <div>
 <h4 className="text-white font-semibold text-fluid-sm tracking-tight mb-2">Want to create a site like Axis TV?</h4>
 <p className="text-white/60 font-normal leading-relaxed max-w-xl text-fluid-base">
 Contact the developer to get your own premium streaming website or app. Beautifully crafted and highly optimized.
 </p>
 </div>
 </div>
 <a 
 href={WHATSAPP_CONTACT}
 target="_blank"
 rel="noopener noreferrer"
 className="w-full md:w-auto px-8 py-3.5 bg-white text-black font-semibold rounded-full hover:bg-white/90 active:scale-95 transition-all text-center shadow-[0_0_20px_rgba(255,255,255,0.2)] whitespace-nowrap text-fluid-base"
 >
 Contact Developer
 </a>
 </div>

 {/* Bottom WhatsApp Channel Persistent Link */}
 <a 
 href={WHATSAPP_CHANNEL}
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-[20px] mb-12 hover:bg-white/10 transition-all group"
 >
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/50 group-hover:text-white transition-colors">
 <MessageCircle className="w-5 h-5" />
 </div>
 <div>
 <h5 className="text-white font-semibold text-fluid-sm tracking-tight mb-0.5">WhatsApp Channel</h5>
 <p className="text-fluid-base text-white/50">Stay updated with the latest movies, series & more</p>
 </div>
 </div>
 <ChevronRight className="w-5 h-5 text-white/40 group-hover:translate-x-1 group-hover:text-white transition-all" />
 </a>

 {/* Final Disclaimer & Copyright */}
 <div className="pt-8 border-t border-white/10 text-center">
 <p className="text-white/40 text-fluid-base font-medium tracking-wide mb-4">
 &copy; 2026 Axis TV. All rights reserved.
 </p>
 <p className="text-white/30 leading-relaxed max-w-4xl mx-auto text-fluid-sm">
 This site does not store any files on its server. All contents are provided by non-affiliated third parties.
 </p>
 </div>
 </div>
 </footer>
 );
}

export default React.memo(Footer);

