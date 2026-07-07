import { Link, useLocation } from "react-router-dom";
import { Home, Search, LayoutGrid, Trophy, User, Activity, Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMediaPreview } from "../contexts/MediaPreviewContext";

export default function BottomNav() {
 const location = useLocation();
 const { previewId } = useMediaPreview();
 
 const navItems = [
 { path: "/", icon: Home, label: "Home" },
 { path: "/trails", icon: Radio, label: "Trails" },
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
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 className="fixed bottom-6 left-1/2 z-[100] w-[90%] max-w-[400px] md:hidden"
 >
 <nav className="glass-panel px-4 py-3 glass-panel shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
 <div className="flex justify-between items-center relative">
 {navItems.map((item, idx) => {
 const isActive = location.pathname === item.path;
 const Icon = item.icon;
 
 return (
 <Link
 key={`${item.path}-${idx}`}
 to={item.path}
 className="relative flex flex-col items-center gap-1 transition-all outline-none py-1 px-3 group"
 >
 {isActive && (
 <motion.div 
 layoutId="bottomNavBackground"
 className="absolute inset-0 bg-white/20 rounded-[20px] -z-10 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
 transition={{ type: "spring", stiffness: 300, damping: 30 }}
 />
 )}
 <div className={`transition-all duration-300 relative z-10 ${ isActive ? "scale-100" : "hover:scale-105" }`}>
 <Icon className={`w-5.5 h-5.5 md:w-6 md:h-6 transition-colors duration-300 ${ isActive ? "text-white" : "text-white/40 group-hover:text-white/70" }`} />
 </div>
 {/* Only show label optionally or keep extremely subtle */}
 <span className={`font-semibold tracking-wider transition-colors duration-300 z-10 ${ isActive ? "text-white" : "text-transparent" } text-fluid-sm`}>
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
