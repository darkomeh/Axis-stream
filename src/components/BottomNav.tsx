import { Link, useLocation } from "react-router-dom";
import { Home, Search, LayoutGrid, ListPlus, User } from "lucide-react";
import { motion } from "motion/react";

export default function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/browse", icon: LayoutGrid, label: "Browse" },
    { path: "/profile", icon: ListPlus, label: "My List" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-bg-base/90 premium-blur border-t border-white/5 px-6 pb-[calc(1.2rem+env(safe-area-inset-bottom))] pt-4 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {navItems.map((item, idx) => {
          const isActive = location.pathname === item.path && (item.label !== "Profile" || location.pathname === "/profile");
          // Small logic adjustment: if it's the 4th item (My List) vs 5th item (Profile) both pointing to /profile
          // Let's just use the index for simplicity or check if it's the last one
          
          const Icon = item.icon;
          return (
            <Link
              key={`${item.path}-${idx}`}
              to={item.path}
              className="relative flex flex-col items-center gap-1.5 transition-all outline-none"
            >
              <div className={`transition-all duration-300 ${
                  isActive ? "text-brand scale-110" : "text-gray-500 hover:text-white"
                }`}>
                <Icon className={`w-6 h-6 ${isActive && item.label === "Home" ? "fill-current" : ""}`} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${
                isActive ? "text-brand" : "text-gray-500"
              }`}>
                {item.label}
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabDot"
                  className="absolute -bottom-2 w-1 h-1 bg-brand rounded-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
