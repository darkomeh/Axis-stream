import { Link, useLocation } from "react-router-dom";
import { Home, Search, Compass, Download, User } from "lucide-react";
import { motion } from "motion/react";

export default function BottomNav() {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/browse", icon: Compass, label: "Browse" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/downloads", icon: Download, label: "Downloads" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50 md:hidden pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-16 h-full group"
            >
              <motion.div
                animate={{
                  scale: isActive ? 1.1 : 1,
                  y: isActive ? -2 : 0,
                }}
                className={`transition-colors duration-300 ${
                  isActive ? "text-brand" : "text-gray-500 group-hover:text-gray-300"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
              </motion.div>
              <span className={`text-[10px] font-medium uppercase tracking-wider transition-colors duration-300 ${
                isActive ? "text-brand" : "text-gray-500"
              }`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-1 w-8 h-1 bg-brand rounded-full"
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
