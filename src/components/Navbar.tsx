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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled ? "bg-[#050505]/80 backdrop-blur-xl border-b border-white/5" : "bg-gradient-to-b from-black/80 to-transparent"
      }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Play className="w-5 h-5 text-black ml-1" fill="currentColor" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Λ𝗫𝗜𝗦 𝗦TREAM
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <Link to="/" className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors">Home</Link>
            <Link to="/browse" className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors">Browse</Link>
            <Link to="/anime" className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors">Anime</Link>
            <Link to="/toons" className="text-[15px] font-medium text-gray-400 hover:text-white transition-colors">Toons</Link>
          </nav>

          {/* Search & Mobile Toggle */}
          <div className="flex items-center gap-6">
            <button
              onClick={handleSurpriseMe}
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold hover:scale-105 transition-transform shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Surprise Me</span>
            </button>

            <button
              onClick={() => navigate("/search")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
              <span className="hidden md:block text-[15px] font-medium">Search</span>
            </button>

            <Link to="/downloads" className="hidden md:flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <Download className="w-5 h-5" />
            </Link>

            <Link to="/profile" className="hidden md:flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              {user ? (
                <img src={user.avatar} alt={user.username} className="w-8 h-8 rounded-full border border-white/20" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </Link>

            <button
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
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
            className="md:hidden bg-[#050505]/95 backdrop-blur-2xl border-t border-white/5"
          >
            <div className="px-6 pt-4 pb-8 space-y-2">
              <Link to="/" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link to="/browse" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Browse</Link>
              <Link to="/anime" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Anime</Link>
              <Link to="/toons" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Toons</Link>
              <button onClick={handleSurpriseMe} className="w-full text-left py-3 text-lg font-medium text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 hover:from-purple-300 hover:to-pink-300 transition-colors flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Surprise Me
              </button>
              <Link to="/downloads" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Downloads</Link>
              <Link to="/profile" className="block py-3 text-lg font-medium text-gray-400 hover:text-white transition-colors">Profile</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
