import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Search, Bell, Home, Film, Tv, Trophy, Radio, 
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
          <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-bg-sidebar border-r border-white/5 flex-col z-[100]">
            <div className="p-8">
              <Link to="/" className="flex flex-col gap-0.5 group">
                 <div className="flex items-center gap-2">
                   <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand shrink-0">
                     <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
                   </svg>
                   <span className="text-2xl font-black text-white tracking-tight">
                     Axis TV
                   </span>
                 </div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-brand ml-10">
                   Your Movie Plug
                 </span>
              </Link>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto hide-scrollbar">
              {SIDEBAR_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.label}
                    to={link.path}
                    className={`flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-300 font-bold tracking-wide ${
                      link.isActive
                        ? "text-brand bg-brand/5 border-l-4 border-brand"
                        : "text-gray-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[15px]">{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 space-y-2 mb-4 border-t border-white/5 pt-4">
              <Link to="/profile" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 font-bold tracking-wide">
                <Settings className="w-5 h-5" />
                <span className="text-[15px]">Settings</span>
              </Link>
              <Link to="/profile" className="flex items-center gap-4 px-5 py-3.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-300 font-bold tracking-wide">
                {user?.avatar ? (
                  <img src={user.avatar || undefined} alt="Profile" className="w-6 h-6 rounded-full object-cover" loading="lazy" />
                ) : (
                  <UserIcon className="w-5 h-5" />
                )}
                <span className="text-[15px]">Profile</span>
              </Link>
            </div>
          </aside>

          {/* DESKTOP TOP HEADER */}
          <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "circOut" }}
            className={`hidden lg:flex fixed left-64 right-0 top-0 h-24 z-50 transition-all duration-500 items-center px-12 ${
            isScrolled ? "bg-bg-base/95 border-b border-white/5 premium-blur" : "bg-transparent"
          }`}>
            <div className="flex-1 flex justify-center">
              <form onSubmit={handleSearch} className="w-full max-w-lg relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand transition-colors" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for movies, series, actors..." 
                  className="w-full bg-[#141414] border-none rounded-full py-3.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand/40 transition-all font-medium placeholder-gray-500 shadow-xl"
                />
              </form>
            </div>
            <div className="flex shrink-0 items-center gap-8">
              <Link to="/profile" className="hover:scale-110 transition-transform">
                 {user?.avatar ? (
                   <div className="relative p-0.5 rounded-full bg-gradient-to-tr from-brand to-transparent">
                      <img src={user.avatar || undefined} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-bg-base" loading="lazy" />
                   </div>
                 ) : (
                   <div className="w-10 h-10 bg-[#141414] rounded-full flex items-center justify-center text-white border-2 border-transparent hover:border-brand transition-all">
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
            transition={{ duration: 0.4, ease: "circOut" }}
            className={`lg:hidden fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
            isScrolled ? "bg-bg-base/95 premium-blur border-b border-white/5" : "bg-gradient-to-b from-bg-base/80 to-transparent"
          }`}>
            <div className="flex items-center justify-between px-fluid-sm pt-6 pb-2 gap-2">
              <Link to="/" className="flex flex-col shrink-0">
                 <div className="flex items-center gap-1.5">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand w-5 h-5">
                     <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
                   </svg>
                   <span className="text-xl font-black text-white tracking-tight">
                     Axis TV
                   </span>
                 </div>
                 <span className="text-[8px] font-black uppercase tracking-[0.15em] text-brand ml-6.5">
                   Your Movie Plug
                 </span>
              </Link>
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <Link to="/search" className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center text-gray-300 hover:text-brand transition-colors bg-white/5 rounded-full backdrop-blur-md">
                  <Search className="w-4.5 h-4.5 md:w-5 md:h-5" />
                </Link>
                <Link to="/profile" className="relative group">
                  {user?.avatar ? (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full p-[1px] bg-gradient-to-tr from-brand to-transparent">
                      <img src={user.avatar || undefined} alt="Profile" className="w-full h-full rounded-full object-cover border-2 border-black" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#141414] flex items-center justify-center text-white border border-white/20">
                      <UserIcon className="w-4.5 h-4.5 md:w-5 md:h-5" />
                    </div>
                  )}
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 md:w-3 md:h-3 bg-brand rounded-full border-2 border-bg-base" />
                </Link>
              </div>
            </div>

            {/* Mobile Tabs */}
            <div className="flex items-center gap-6 md:gap-8 px-fluid-sm overflow-x-auto hide-scrollbar pb-3">
               <Link to="/" className={`text-fluid-sm font-black pb-2 border-b-2 whitespace-nowrap uppercase tracking-tighter transition-all ${location.pathname === '/' ? 'text-white border-brand' : 'text-gray-500 border-transparent'}`}>Home</Link>
               <Link to="/movies" className={`text-fluid-sm font-black pb-2 border-b-2 whitespace-nowrap uppercase tracking-tighter transition-all ${location.pathname === '/movies' || location.search.includes('type=1') ? 'text-white border-brand' : 'text-gray-500 border-transparent'}`}>Movies</Link>
               <Link to="/series" className={`text-fluid-sm font-black pb-2 border-b-2 whitespace-nowrap uppercase tracking-tighter transition-all ${location.pathname === '/series' || location.search.includes('type=2') ? 'text-white border-brand' : 'text-gray-500 border-transparent'}`}>Series</Link>
               <Link to="/ranking" className={`text-fluid-sm font-black pb-2 border-b-2 whitespace-nowrap uppercase tracking-tighter transition-all ${location.pathname === '/ranking' ? 'text-white border-brand' : 'text-gray-500 border-transparent'}`}>Rank</Link>
            </div>
          </motion.header>
        </>
      )}
    </AnimatePresence>
  );
}

export default React.memo(Navbar);
