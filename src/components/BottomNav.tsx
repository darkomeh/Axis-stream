import { Link, useLocation } from "react-router-dom";
import { Home, Search, Compass, Radio, Trophy, Tv } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMediaPreview } from "../contexts/MediaPreviewContext";
import { useAuth } from "../contexts/AuthContext";

export default function BottomNav() {
  const location = useLocation();
  const { previewId } = useMediaPreview();
  const { user, preferences } = useAuth();
  
  // Dynamic user initial for the profile bubble, defaulting to 'G'
  const userInitial = user?.username 
    ? user.username[0].toUpperCase() 
    : user?.email 
      ? user.email[0].toUpperCase() 
      : "G";

  const navItems = preferences?.kidsMode ? [
    { path: "/", icon: Home, label: "Kids Home" },
    { path: "/toons", icon: Tv, label: "Cartoons" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/profile", label: "Profile", isProfile: true },
  ] : [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Explore" },
    { path: "/trails", icon: Compass, label: "Trails" },
    { path: "/ranking", icon: Trophy, label: "Ranking" },
    { path: "/live", icon: Radio, label: "Live TV" },
    { path: "/profile", label: "Profile", isProfile: true },
  ];

  return (
    <AnimatePresence>
      {!previewId && (
        <motion.div 
          initial={{ y: 100, x: "-50%", opacity: 0 }}
          animate={{ y: 0, x: "-50%", opacity: 1 }}
          exit={{ y: 100, x: "-50%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="fixed bottom-6 left-1/2 z-[100] w-[92%] max-w-[460px] lg:hidden"
        >
          <nav className="bg-[#18181a]/95 backdrop-blur-2xl px-5 py-2.5 rounded-[28px] border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex justify-between items-center">
              {navItems.map((item, idx) => {
                const isActive = location.pathname === item.path || 
                  (item.path === "/trails" && location.pathname.startsWith("/trails"));
                
                return (
                  <Link
                    key={`${item.label}-${idx}`}
                    to={item.path || "/profile"}
                    className="flex flex-col items-center justify-center gap-1.5 transition-all outline-none py-1 flex-1 group"
                  >
                    {item.isProfile ? (
                      <div className="relative">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-white text-[11px] transition-transform duration-300 group-hover:scale-105 overflow-hidden bg-brand/20 ${isActive ? "ring-2 ring-brand ring-offset-2 ring-offset-black" : ""}`}>
                          {user?.avatar ? (
                            <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            userInitial
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {item.icon && (
                          <item.icon 
                            className={`w-6 h-6 transition-colors duration-300 ${
                              isActive 
                                ? "text-brand" 
                                : "text-[#8e8e93] group-hover:text-zinc-200"
                            }`} 
                          />
                        )}
                      </div>
                    )}
                    
                    <span 
                      className={`text-[10px] font-medium tracking-tight transition-colors duration-300 select-none ${
                        isActive 
                          ? "text-brand font-semibold" 
                          : "text-[#8e8e93] group-hover:text-zinc-300"
                      }`}
                    >
                      {item.label}
                    </span>
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
