import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
 Search, Bell, Home, Film, Tv, Trophy, Radio, Activity, Compass,
 LayoutGrid, Grid2X2, Settings, User as UserIcon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { motion, AnimatePresence } from "motion/react";
import { subscribeToNotifications } from "../services/notificationService";

function Navbar() {
 const [isScrolled, setIsScrolled] = useState(false);
 const navigate = useNavigate();
 const location = useLocation();
 const { user, siteConfig, preferences } = useAuth();
 const { showToast } = useToast();
 const { previewId } = useMediaPreview();
 const [searchQuery, setSearchQuery] = useState("");
 const [unreadCount, setUnreadCount] = useState(0);

 useEffect(() => {
   if (user?.id) {
     const unsubscribe = subscribeToNotifications(user.id, (notifs) => {
       const unread = notifs.filter(n => !n.read).length;
       setUnreadCount(unread);
     });
     return () => unsubscribe();
   } else {
     setUnreadCount(0);
   }
 }, [user]);

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

 const SIDEBAR_LINKS = preferences?.kidsMode ? [
   { label: 'Kids Home', path: '/', icon: Home, isActive: location.pathname === '/' },
   { label: 'Cartoons', path: '/toons', icon: Tv, isActive: location.pathname === '/toons' },
   { label: 'Anime & Toons', path: '/anime', icon: Compass, isActive: location.pathname === '/anime' },
   { label: 'Search Fun', path: '/search', icon: Search, isActive: location.pathname === '/search' },
 ] : [
   { label: 'Home', path: '/', icon: Home, isActive: location.pathname === '/' },
   { label: 'Explore', path: '/search', icon: Search, isActive: location.pathname === '/search' },
   { label: 'Trails', path: '/trails', icon: Compass, isActive: location.pathname === '/trails' },
   { label: 'Live TV', path: '/live', icon: Radio, isActive: location.pathname === '/live' },
   { label: 'Series', path: '/series', icon: Tv, isActive: location.pathname === '/series' || location.search.includes('type=2') },
   { label: 'Sports', path: '/sports', icon: Trophy, isActive: location.pathname === '/sports' },
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
 {preferences?.kidsMode ? (
   <span className="text-2xl animate-bounce shrink-0 mr-1 select-none">🎈</span>
 ) : (
   <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white shrink-0">
   <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
   </svg>
 )}
 <span className={`text-fluid-2xl font-black tracking-tight ${preferences?.kidsMode ? "text-yellow-400" : "text-white"}`}>
 {preferences?.kidsMode ? "AXIS KIDS" : "Axis TV"}
 </span>
 </div>
 <span className="text-fluid-sm font-semibold tracking-wide text-white/60 ml-10">
 {preferences?.kidsMode ? "Fun & Cartoons! 🍭" : "Your Movie Plug"}
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
 className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-500 font-semibold tracking-wide relative overflow-hidden ${ link.isActive ? "text-[#FF3B30] bg-[#FF3B30]/10 shadow-[0_4px_20px_rgba(255,59,48,0.15)] border border-[#FF3B30]/20" : "text-[#A1A1AA] hover:text-[#F5F5F7] hover:bg-white/[0.08] border border-transparent" }`}
 >
 <Icon className="w-5 h-5 relative z-10" />
 <span className="text-fluid-lg relative z-10">{link.label}</span>
 {link.isActive && (
 <motion.div 
 layoutId="activeSidebarIndicator" 
 className="absolute inset-0 bg-gradient-to-r from-[#FF3B30]/20 to-transparent opacity-50"
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
 placeholder={preferences?.kidsMode ? "Search for fun cartoons, shows..." : "Search for movies, series, actors..."}
 className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl py-4 pl-14 pr-6 text-fluid-lg text-white focus:outline-none focus:bg-white/10 focus:border-white/20 transition-all font-medium placeholder-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
 />
 </form>
 </div>
 <div className="flex shrink-0 items-center gap-8">
 <Link to="/notifications" className="relative group mr-4 hidden lg:block">
  <div className="w-11 h-11 bg-white/5 border border-white/10 hover:bg-white/10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-md">
    <Bell className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
    {unreadCount > 0 && (
      <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-brand rounded-full border-2 border-[#080808] shadow-[0_0_8px_#E50914] animate-pulse"></div>
    )}
  </div>
</Link>
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
 initial={{ y: -50, opacity: 0 }}
 animate={{ y: 0, opacity: 1 }}
 exit={{ y: -50, opacity: 0 }}
 transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
 className={`lg:hidden fixed left-4 right-4 top-4 z-50 transition-all duration-500 rounded-[24px] ${ isScrolled ? "bg-[#080808]/60 backdrop-blur-3xl border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" : "bg-transparent" }`}>
 <div className="flex items-center justify-between px-5 py-3">
 <Link to="/" className="flex items-center gap-1.5 image-glow">
 {preferences?.kidsMode ? (
   <>
     <span className="text-xl animate-bounce">🎈</span>
     <span className="text-xl font-black text-yellow-400 tracking-tight">
       AXIS<span className="text-cyan-400">KIDS</span>
     </span>
   </>
 ) : (
   <>
     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand w-6 h-6">
     <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
     </svg>
     <span className="text-xl font-bold text-white tracking-tight">
     AXIS<span className="text-brand">TV</span>
     </span>
   </>
 )}
 </Link>
 <div className="flex items-center gap-4 shrink-0">
 <Link to="/search" className="text-white/70 hover:text-white transition-colors p-1">
 <Search className="w-6 h-6" />
 </Link>
 <Link to="/notifications" className="text-white/70 hover:text-white transition-colors p-1 relative">
 <Bell className="w-6 h-6" />
 {unreadCount > 0 && (
   <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full border border-black shadow-[0_0_8px_#E50914] animate-pulse" />
 )}
 </Link>
 <Link to="/profile" className="relative group ml-1">
 {user?.avatar ? (
 <div className="w-8 h-8 rounded-full p-[1px] bg-gradient-to-tr from-white/40 to-white/5 border border-white/20">
 <img src={user.avatar || undefined} alt="Profile" className="w-full h-full rounded-full object-cover" loading="lazy" />
 </div>
 ) : (
 <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20 backdrop-blur-xl">
 <UserIcon className="w-4 h-4" />
 </div>
 )}
 </Link>
 </div>
 </div>
 </motion.header>


 </>
 )}
 </AnimatePresence>
 );
}

export default React.memo(Navbar);
