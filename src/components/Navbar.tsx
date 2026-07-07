import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
 Search, Bell, Home, Film, Tv, Trophy, Radio, Activity,
 LayoutGrid, Grid2X2, Settings, User as UserIcon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { motion, AnimatePresence } from "motion/react";

function Navbar() {
 const [isScrolled, setIsScrolled] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();
 const { user, siteConfig } = useAuth();
 const { showToast } = useToast();
 const { previewId } = useMediaPreview();
 const [searchQuery, setSearchQuery] = useState("");

 useEffect(() => {
 const handleScroll = () => {
 setIsScrolled(window.scrollY > 10);
 };
 window.addEventListener("scroll", handleScroll);
 return () => window.removeEventListener("scroll", handleScroll);
 }, []);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 if (searchQuery.trim()) {
 navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
 }
 };

 const SIDEBAR_LINKS = [
 { label: 'Home', path: '/', icon: Home, isActive: location.pathname === '/' },
 { label: 'Trails', path: '/trails', icon: Radio, isActive: location.pathname === '/trails' },
 { label: 'Movies', path: '/movies', icon: Film, isActive: location.pathname === '/movies' || location.search.includes('type=1') },
 { label: 'Series', path: '/series', icon: Tv, isActive: location.pathname === '/series' || location.search.includes('type=2') },
 { label: 'Rank', path: '/ranking', icon: Trophy, isActive: location.pathname === '/ranking' },
 { label: 'Browse', path: '/browse', icon: LayoutGrid, isActive: location.pathname === '/browse' && !location.search },
 ];

 const shouldHide = !!previewId;

 return (
 <AnimatePresence>
 {!shouldHide && (
 <>
 {/* DESKTOP SIDEBAR */}
 <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-black/40 backdrop-blur-3xl border-r border-white/5 flex-col z-[100] shadow-[10px_0_40px_rgba(0,0,0,0.5)]">
 <div className="p-8">
 <Link to="/" className="flex flex-col gap-0.5 group">
 <div className="flex items-center gap-2 image-glow">
 <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white shrink-0">
 <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
 </svg>
 <span className="text-fluid-2xl font-semibold text-white tracking-tight">
 Axis TV
 </span>
 </div>
 <span className="text-fluid-sm font-semibold tracking-wide text-white/60 ml-10">
 Your Movie Plug
 </span>
 </Link>
 </div>

 <nav className="flex-1 px-4 space-y-3 overflow-y-auto hide-scrollbar mt-4">
 {SIDEBAR_LINKS.map((link) => {
 const Icon = link.icon;
 return (
 <Link
 key={link.label}
 to={link.path}
 className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 font-semibold tracking-wide relative overflow-hidden ${ link.isActive ? "text-white bg-white/10 shadow-[0_4px_20px_rgba(255,255,255,0.05)] border border-white/10" : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent" }`}
 >
 <Icon className="w-5 h-5 relative z-10" />
 <span className="text-fluid-lg relative z-10">{link.label}</span>
 {link.isActive && (
 <motion.div 
 layoutId="activeSidebarIndicator" 
 className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50"
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 />
 )}
 </Link>
 );
 })}
 </nav>

 <div className="p-4 space-y-2 mb-4 border-t border-white/10 pt-6">
 <Link to="/profile" className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-white/50 hover:text-white hover:bg-white/5 transition-all duration-300 font-semibold tracking-wide border border-transparent">
 <Settings className="w-5 h-5" />
 <span className="text-fluid-lg">Settings</span>
 </Link>
 <Link to="/profile" className="flex items-center gap-4 px-5 py-3.5 rounded-2xl text-white/50 hover:text-white hover:bg-white/5 transition-all duration-300 font-semibold tracking-wide border border-transparent">
 {user?.avatar ? (
 <img src={user.avatar || undefined} alt="Profile" className="w-6 h-6 rounded-full object-cover" loading="lazy" />
 ) : (
 <UserIcon className="w-5 h-5" />
 )}
 <span className="text-fluid-lg">Profile</span>
 </Link>
 </div>
 </aside>

 {/* DESKTOP TOP HEADER */}
 <motion.header 
 initial={{ y: -100, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: -100, opacity: 0 }}
 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
 className={`hidden lg:flex fixed left-64 right-0 top-0 h-28 z-50 transition-all duration-700 items-center px-12 ${ isScrolled ? "bg-black/40 backdrop-blur-3xl border-b border-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-gradient-to-b from-black/80 via-black/40 to-transparent" }`}>
 <div className="flex-1 flex justify-center">
 <form onSubmit={handleSearch} className="w-full max-w-2xl relative group">
 <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/40 group-focus-within:text-white transition-colors" />
 <input 
 type="text" 
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Search for movies, series, actors..." 
 className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl py-4 pl-14 pr-6 text-fluid-lg text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
 />
 </form>
 </div>
 <div className="flex shrink-0 items-center gap-8">
 <Link to="/profile" className="hover:scale-105 transition-transform duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] rounded-full">
 {user?.avatar ? (
 <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-white/40 to-white/5 border border-white/20">
 <img src={user.avatar || undefined} alt="Profile" className="w-11 h-11 rounded-full object-cover" loading="lazy" />
 </div>
 ) : (
 <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 transition-all">
 <UserIcon className="w-5 h-5" />
 </div>
 )}
 </Link>
 </div>
 </motion.header>

 {/* MOBILE HEADER */}
 <motion.header 
 initial={{ y: -100, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: -100, opacity: 0 }}
 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
 className={`lg:hidden fixed left-0 right-0 top-0 z-50 transition-all duration-500 overflow-hidden ${ isScrolled ? "bg-black/40 backdrop-blur-3xl border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-gradient-to-b from-black/90 to-transparent pt-4" }`}>
 <div className="flex items-center justify-between px-fluid pt-6 pb-4">
 <Link to="/" className="flex flex-col shrink-0 image-glow">
 <div className="flex items-center gap-2">
 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white w-5 h-5">
 <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
 </svg>
 <span className="text-fluid-xl font-semibold text-white tracking-tight">
 Axis TV
 </span>
 </div>
 <span className="text-fluid-xs font-semibold tracking-wide text-white/60 ml-7">
 Your Movie Plug
 </span>
 </Link>
 <div className="flex items-center gap-3 shrink-0">
 <Link to="/search" className="w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-xl">
 <Search className="w-5 h-5" />
 </Link>
 <Link to="/profile" className="relative group">
 {user?.avatar ? (
 <div className="w-10 h-10 rounded-full p-[1px] bg-gradient-to-tr from-white/40 to-white/5 border border-white/20">
 <img src={user.avatar || undefined} alt="Profile" className="w-full h-full rounded-full object-cover" loading="lazy" />
 </div>
 ) : (
 <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 backdrop-blur-xl">
 <UserIcon className="w-5 h-5" />
 </div>
 )}
 <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black" />
 </Link>
 </div>
 </div>

 {/* Mobile Tabs */}
 <div className="flex items-center gap-8 px-fluid overflow-x-auto hide-scrollbar pb-4 -mb-px">
 <Link to="/" className={`text-fluid-sm font-semibold pb-3 border-b-[3px] whitespace-nowrap tracking-wider transition-all duration-300 ${location.pathname === '/' ? 'text-white border-white' : 'text-white/40 border-transparent'}`}>Home</Link>
 <Link to="/trails" className={`text-fluid-sm font-semibold pb-3 border-b-[3px] whitespace-nowrap tracking-wider transition-all duration-300 ${location.pathname === '/trails' ? 'text-white border-white' : 'text-white/40 border-transparent'}`}>Trails</Link>
 <Link to="/movies" className={`text-fluid-sm font-semibold pb-3 border-b-[3px] whitespace-nowrap tracking-wider transition-all duration-300 ${location.pathname === '/movies' || location.search.includes('type=1') ? 'text-white border-white' : 'text-white/40 border-transparent'}`}>Movies</Link>
 <Link to="/series" className={`text-fluid-sm font-semibold pb-3 border-b-[3px] whitespace-nowrap tracking-wider transition-all duration-300 ${location.pathname === '/series' || location.search.includes('type=2') ? 'text-white border-white' : 'text-white/40 border-transparent'}`}>Series</Link>
 <Link to="/ranking" className={`text-fluid-sm font-semibold pb-3 border-b-[3px] whitespace-nowrap tracking-wider transition-all duration-300 ${location.pathname === '/ranking' ? 'text-white border-white' : 'text-white/40 border-transparent'}`}>Rank</Link>
 </div>
 </motion.header>
 </>
 )}
 </AnimatePresence>
 );
}

export default React.memo(Navbar);
