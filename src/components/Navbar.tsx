import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Search, Bell, Home, Film, Tv, ListPlus, Radio, 
  LayoutGrid, Grid2X2, Settings, User as UserIcon
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, siteConfig } = useAuth();
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
    { label: 'Movies', path: '/browse?type=1', icon: Film, isActive: location.search.includes('type=1') },
    { label: 'Series', path: '/browse?type=2', icon: Tv, isActive: location.search.includes('type=2') },
    { label: 'My List', path: '/profile', icon: ListPlus, isActive: location.pathname === '/profile' },
    { label: 'Live TV', path: '/live', icon: Radio, isActive: location.pathname === '/live' },
    { label: 'Browse', path: '/browse', icon: LayoutGrid, isActive: location.pathname === '/browse' && !location.search },
    { label: 'Categories', path: '/categories', icon: Grid2X2, isActive: location.pathname === '/categories' },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-[#050505] border-r border-white/5 flex-col z-[100]">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-1.5 group">
            <div className="relative">
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand">
                 <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
               </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-widest text-white group-hover:text-brand transition-colors duration-500 uppercase">
                AXIS TV
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-6 space-y-1 overflow-y-auto hide-scrollbar">
          {SIDEBAR_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.label}
                to={link.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  link.isActive
                    ? "text-brand bg-brand/10 pb-3"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 space-y-1 mb-2">
          <Link to="/settings" className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 font-medium">
            <Settings className="w-5 h-5" />
            <span className="text-sm">Settings</span>
          </Link>
          <Link to="/profile" className="flex items-center gap-4 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-300 font-medium">
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <UserIcon className="w-5 h-5" />
            )}
            <span className="text-sm">Profile</span>
          </Link>
        </div>
      </aside>

      {/* DESKTOP TOP HEADER */}
      <header className={`hidden lg:flex fixed left-64 right-0 top-0 h-24 z-50 transition-all duration-300 items-center px-10 ${
        isScrolled ? "bg-black/95 border-b border-white/5 backdrop-blur-md" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}>
        <div className="flex-1 flex justify-center">
          <form onSubmit={handleSearch} className="w-full max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for movies, series, actors..." 
              className="w-full bg-[#1A1A1A] border-none rounded-full py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all font-medium placeholder-gray-500"
            />
          </form>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <button className="relative text-white hover:scale-110 transition-transform">
             <Bell className="w-6 h-6" />
             <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black" />
          </button>
          <Link to="/profile">
             {user?.avatar ? (
               <img src={user.avatar} alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-transparent hover:border-white transition-colors" />
             ) : (
               <div className="w-10 h-10 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white border-2 border-transparent hover:border-white transition-colors">
                 <UserIcon className="w-5 h-5" />
               </div>
             )}
          </Link>
        </div>
      </header>

      {/* MOBILE HEADER */}
      <header className={`lg:hidden fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/95 backdrop-blur-md border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}>
        <div className="flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-1">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand">
               <path d="M12 2L22 20H2L12 2Z" fill="currentColor"/>
             </svg>
            <span className="text-xl font-black tracking-widest text-white uppercase">
              AXIS TV
            </span>
          </Link>
          <div className="flex items-center gap-5">
            <Link to="/search" className="text-white hover:text-brand transition-colors">
              <Search className="w-5 h-5" />
            </Link>
            <Link to="/profile" className="relative group">
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center text-white">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-brand rounded-full border-2 border-black" />
            </Link>
          </div>
        </div>

        {/* Mobile Tabs Container */}
        <div className="flex items-center justify-between px-6 overflow-x-auto hide-scrollbar gap-6 pb-2">
           <Link to="/" className={`text-[13px] font-bold pb-2 border-b-2 whitespace-nowrap transition-colors ${location.pathname === '/' ? 'text-white border-brand' : 'text-gray-400 border-transparent hover:text-white'}`}>Home</Link>
           <Link to="/browse?type=1" className={`text-[13px] font-bold pb-2 border-b-2 whitespace-nowrap transition-colors ${location.search.includes('type=1') ? 'text-white border-brand' : 'text-gray-400 border-transparent hover:text-white'}`}>Movies</Link>
           <Link to="/browse?type=2" className={`text-[13px] font-bold pb-2 border-b-2 whitespace-nowrap transition-colors ${location.search.includes('type=2') ? 'text-white border-brand' : 'text-gray-400 border-transparent hover:text-white'}`}>Series</Link>
           <Link to="/profile" className={`text-[13px] font-bold pb-2 border-b-2 whitespace-nowrap transition-colors ${location.pathname === '/profile' ? 'text-white border-brand' : 'text-gray-400 border-transparent hover:text-white'}`}>My List</Link>
        </div>
      </header>
    </>
  );
}
