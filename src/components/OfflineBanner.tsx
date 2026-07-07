import React, { useState, useEffect } from 'react';
import { WifiOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineBanner = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isVisible, setIsVisible] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsVisible(false);
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-[90%] pointer-events-auto"
        >
          <div className="bg-[#1A1A1A]/80 backdrop-blur-xl border border-red-500/20 shadow-2xl shadow-red-500/10 rounded-2xl p-4 flex items-start gap-4">
            <div className="bg-red-500/10 p-2 rounded-full shrink-0">
              <WifiOff className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="text-white font-semibold text-sm mb-1">Connection Lost</h3>
              <p className="text-white/60 text-xs">
                You are currently offline. Check your internet connection. Some features may be unavailable.
              </p>
            </div>
            <button 
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors shrink-0 text-white/40 hover:text-white/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
