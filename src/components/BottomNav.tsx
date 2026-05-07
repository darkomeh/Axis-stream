import { Link, useLocation } from "react-router-dom";
import { Home, Search, LayoutGrid, Trophy, User, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

export default function BottomNav() {
  const location = useLocation();
  const { previewId } = useMediaPreview();
  
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/browse", icon: LayoutGrid, label: "Browse" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/ranking", icon: Trophy, label: "Rank" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <AnimatePresence>
      {!previewId && (
        <motion.div 
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 z-[100] w-[92%] max-w-lg md:hidden"
        >
          <nav className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-3xl px-3 md:px-6 py-2.5 md:py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
            <div className="flex justify-between items-center relative">
              {navItems.map((item, idx) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={`${item.path}-${idx}`}
                    to={item.path}
                    className="relative flex flex-col items-center gap-1.5 transition-all outline-none py-1 px-3 group"
                  >
                    <div className={`transition-all duration-300 relative ${
                        isActive ? "scale-110" : "hover:scale-105"
                      }`}>
                      {isActive && (
                        <motion.div 
                          layoutId="bottomNavGlow"
                          className="absolute -inset-4 bg-brand/20 blur-xl rounded-full -z-10"
                        />
                      )}
                      <Icon className={`w-6 h-6 stroke-[2] transition-colors duration-300 ${
                        isActive ? "text-brand drop-shadow-[0_0_8px_rgba(255,45,45,0.6)]" : "text-gray-400 group-hover:text-gray-200"
                      }`} />
                    </div>
                    <span className={`text-[10px] md:text-[11px] font-black uppercase tracking-tighter transition-colors duration-300 ${
                      isActive ? "text-white" : "text-gray-500"
                    }`}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div 
                        layoutId="bottomNavDot"
                        className="absolute -bottom-1 w-1 h-1 bg-brand rounded-full shadow-[0_0_5px_rgba(255,45,45,0.5)]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
