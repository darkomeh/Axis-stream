import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, Play, User, Download, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleSurpriseMe = async () => {
    try {
      const { movieService } = await import("../services/movieService");
      const trending = await movieService.getTrending();
      if (trending && trending.length > 0) {
        const randomItem = trending[Math.floor(Math.random() * trending.length)];
        navigate(`/details/${randomItem.id}`);
      }
    } catch (error) {
      console.error("Failed to fetch surprise me item", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${
        isScrolled ? "glass-nav py-3" : "bg-gradient-to-b from-black/90 via-black/40 to-transparent py-5"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shadow-[0_0_20px_rgba(229,9,20,0.3)] group-hover:shadow-[0_0_30px_rgba(229,9,20,0.5)] transition-all duration-500"
            >
              <Play className="w-5 h-5 text-white ml-1" fill="currentColor" />
            </motion.div>
            <span className="text-xl md:text-2xl font-black tracking-tighter text-white group-hover:text-brand transition-colors duration-500">
              Λ𝗫𝗜𝗦 𝗦TREAM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-10">
            {['Home', 'Browse', 'Anime', 'Toons'].map((item) => (
              <Link 
                key={item}
                to={item === 'Home' ? '/' : `/${item.toLowerCase()}`} 
                className="relative text-[13px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-[0.2em] group"
              >
                {item}
                <span className="absolute -bottom-2 left-0 w-0 h-0.5 bg-brand transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Search & Actions */}
          <div className="flex items-center gap-4 md:gap-8">
            <button
              onClick={handleSurpriseMe}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-brand border border-white/10 hover:border-brand rounded-full text-white font-bold transition-all duration-500 hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] group"
            >
              <Sparkles className="w-4 h-4 text-brand group-hover:text-white transition-colors" />
              <span className="text-[11px] uppercase tracking-[0.15em]">Surprise Me</span>
            </button>

            <div className="flex items-center gap-2 md:gap-6">
              <button
                onClick={() => navigate("/search")}
                className="p-2 text-gray-400 hover:text-white hover:scale-110 transition-all duration-300"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>

              <Link to="/downloads" className="hidden sm:flex p-2 text-gray-400 hover:text-white hover:scale-110 transition-all duration-300">
                <Download className="w-5 h-5" />
              </Link>

              <Link to="/profile" className="flex items-center gap-3 group">
                <div className="relative">
                  {user ? (
                    <img src={user.avatar} alt={user.username} className="w-9 h-9 rounded-full border-2 border-white/10 group-hover:border-brand transition-all duration-500 object-cover" loading="lazy" />
                  ) : (
                    <div className="w-9 h-9 rounded-full border-2 border-white/10 group-hover:border-brand flex items-center justify-center text-gray-400 group-hover:text-white transition-all duration-500">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
                </div>
              </Link>

              <button
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/95 backdrop-blur-2xl border-t border-white/5"
          >
            <div className="px-6 pt-4 pb-8 space-y-2">
              <Link to="/" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Home</Link>
              <Link to="/browse" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Browse</Link>
              <Link to="/anime" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Anime</Link>
              <Link to="/toons" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Toons</Link>
              <button onClick={handleSurpriseMe} className="w-full text-left py-3 text-lg font-medium text-brand hover:text-brand-hover transition-colors flex items-center gap-2 uppercase tracking-widest">
                <Sparkles className="w-5 h-5" /> Surprise Me
              </button>
              <Link to="/downloads" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Downloads</Link>
              <Link to="/profile" className="block py-3 text-lg font-medium text-gray-300 hover:text-white transition-colors uppercase tracking-widest">Profile</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
