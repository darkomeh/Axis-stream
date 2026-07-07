import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function WhatsAppBubble() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Show premium tooltip briefly after site loads to nudge discovery
    const showTimer = setTimeout(() => {
      const dismissed = localStorage.getItem("axis_wa_dismissed");
      if (!dismissed) {
        setShowTooltip(true);
      }
    }, 4500);

    // Automatically hide tooltip 1 minute (60 seconds) after page mount
    const hideTimer = setTimeout(() => {
      setShowTooltip(false);
    }, 60000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Only display the floating bubble on the homepage
  if (location.pathname !== "/") {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowTooltip(false);
    setIsDismissed(true);
    localStorage.setItem("axis_wa_dismissed", "true");
  };

  const channelUrl = "https://whatsapp.com/channel/0029VbC0knY72WU0QUNAid3B";

  return (
    <div className="fixed bottom-26 md:bottom-8 right-6 z-[120] flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {showTooltip && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 5 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="pointer-events-auto relative mb-4 max-w-[260px] rounded-2xl border border-white/10 bg-[#0f0f0f]/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.9)] backdrop-blur-xl"
          >
            {/* Elegant top border accent line with a green-to-transparent fade */}
            <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#25D366]/40 to-transparent" />
            
            {/* Tiny arrow pointing down to the bubble */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 rotate-45 border-r border-b border-white/10 bg-[#0f0f0f]" />
            
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 text-white/35 hover:text-white/80 transition-colors duration-200"
              aria-label="Dismiss message"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="block font-mono text-[9px] uppercase tracking-widest text-[#25D366] font-bold">
                Λ𝗫𝗜𝗦 Labs Updates
              </span>
              <h4 className="text-xs font-bold text-white tracking-tight">
                Connect Directly on WhatsApp
              </h4>
              <p className="text-[11px] text-gray-400 font-medium leading-relaxed pr-2">
                Stay up to date with new site releases, request custom web builds, and get premium support.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium & Cool Floating Obsidion-Emerald Bubble Button */}
      <motion.a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Join our WhatsApp Channel"
        className="pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-[#111111] text-white border border-[#25D366]/30 shadow-[0_0_25px_rgba(0,0,0,0.85)] hover:border-[#25D366]/60 transition-all duration-500 group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {/* Soft, deep ambient pulsing green aura */}
        <span className="absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#25D366]/5 to-[#25D366]/15 opacity-75 blur-md group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Sleek rotating ring decoration on hover */}
        <div className="absolute inset-0 rounded-full border border-transparent group-hover:border-[#25D366]/20 group-hover:scale-110 transition-all duration-500" />

        {/* Small Active Premium Status Dot */}
        <span className="absolute top-0 right-0 flex h-3.5 w-3.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-40" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#25D366]" />
        </span>

        {/* High-fidelity WhatsApp Brand Icon */}
        <svg
          viewBox="0 0 24 24"
          className="w-6 h-6 text-[#25D366] fill-current transform transition-transform duration-300 group-hover:scale-110"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.593 1.45 5.416 1.451 5.452 0 9.886-4.437 9.89-9.894.002-2.643-1.018-5.127-2.87-6.985A9.785 9.785 0 0012.008 1.91c-5.46 0-9.902 4.444-9.905 9.903-.001 1.93.501 3.81 1.456 5.416l-.961 3.512 3.6-.945zm11.332-6.52c-.312-.156-1.848-.913-2.127-1.015-.279-.102-.483-.156-.687.156-.204.311-.788 1.016-.967 1.22-.177.204-.355.228-.668.072-1.3-.65-2.222-1.135-3.093-2.637-.23-.396.23-.367.659-1.22.072-.15.036-.282-.018-.39-.054-.108-.483-1.164-.662-1.597-.174-.419-.347-.362-.483-.369-.125-.006-.268-.007-.41-.007-.14 0-.368.052-.56.264-.192.211-.733.717-.733 1.748 0 1.03.75 2.029.855 2.17.105.14 1.474 2.249 3.571 3.152.993.428 1.77.685 2.378.878 1.002.319 1.914.275 2.636.167.804-.12 2.127-.87 2.427-1.71.3-.84.3-1.558.21-1.71-.09-.15-.332-.24-.644-.396z" />
        </svg>
      </motion.a>
    </div>
  );
}
