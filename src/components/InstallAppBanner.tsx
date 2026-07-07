import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Laptop, ArrowUpRight, Share, PlusSquare, Sparkles } from "lucide-react";

export function InstallAppBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop" | "other">("other");

  useEffect(() => {
    // 1. Don't show if already in standalone mode (installed web app)
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) return;

    // 2. Don't show if user dismissed it recently
    const dismissedAt = localStorage.getItem("axistv_install_dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      // If dismissed less than a week ago, keep it hidden
      if (Date.now() - dismissedTime < oneWeek) {
        return;
      }
    }

    // 3. Detect Platform
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // 4. Capture native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show the banner if the prompt is ready
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. If it's iOS or desktop, show the banner after a short delay (e.g., 5 seconds)
    // since beforeinstallprompt is only supported on Chromium-based browsers
    const timer = setTimeout(() => {
      if (platform === "ios" || !deferredPrompt) {
        setShowBanner(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [platform, deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Trigger the browser's install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Install choice outcome: ${outcome}`);
      setDeferredPrompt(null);
      setShowBanner(false);
    } else if (platform === "ios") {
      // iOS doesn't support beforeinstallprompt, instructions are displayed inline
    } else {
      // General fallbacks or instruction triggers
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("axistv_install_dismissed", Date.now().toString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[9999] rounded-3xl overflow-hidden border border-white/10 bg-black/70 backdrop-blur-3xl shadow-[0_20px_50px_rgba(255,69,58,0.25)]"
      >
        {/* Subtle Ambient Red Glow */}
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-[#FF453A]/10 rounded-full blur-[40px] pointer-events-none" />

        <div className="p-5 flex flex-col gap-4 relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* App Icon Mock */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c1c1e] to-black border border-white/10 flex items-center justify-center shrink-0 shadow-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[#FF453A]/10 animate-pulse" />
                <span className="text-white font-black text-lg tracking-tighter">ΛＸ</span>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-black text-white tracking-wide">Install AxisTV App</h4>
                  <span className="bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 px-1.5 py-0.5 rounded-full text-[8px] font-extrabold tracking-widest uppercase">PWA</span>
                </div>
                <p className="text-[11px] text-white/50 font-medium">Fast, immersive, buffer-free streaming</p>
              </div>
            </div>
            
            <button 
              onClick={handleDismiss}
              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description / Custom Instructions based on platform */}
          <div className="text-xs text-white/80 leading-relaxed bg-white/[0.02] border border-white/5 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-white font-bold text-[11px] uppercase tracking-wider text-[#FF9F0A]">
              <Sparkles className="w-3.5 h-3.5" />
              Ultimate View Experience
            </div>
            {platform === "ios" ? (
              <p className="text-white/70">
                To install, tap the <span className="font-extrabold text-white inline-flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded-md"><Share className="w-3 h-3 text-[#0A84FF] inline" /> share</span> icon in Safari, then scroll down and select <span className="font-extrabold text-white bg-white/10 px-1.5 py-0.5 rounded-md"><PlusSquare className="w-3 h-3 text-[#0A84FF] inline" /> Add to Home Screen</span>.
              </p>
            ) : platform === "desktop" && !deferredPrompt ? (
              <p className="text-white/70">
                Click the <span className="font-extrabold text-white">Install button</span> inside your browser address bar (top right) or add it from settings to view on the big screen!
              </p>
            ) : (
              <p className="text-white/70">
                Install AxisTV as an application directly on your device. Enjoy quick launcher access and smooth standalone cinematic players!
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 rounded-xl bg-white/[0.04] hover:bg-white/10 border border-white/5 text-white/70 hover:text-white text-xs font-bold transition-all text-center"
            >
              Maybe Later
            </button>

            {deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="flex-1 py-3 px-4 rounded-xl bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(255,255,255,0.15)]"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                Install Now
              </button>
            ) : platform === "ios" ? (
              <div className="flex-1 text-[10px] text-[#A1A1AA] font-black uppercase text-center border border-[#FF9F0A]/20 bg-[#FF9F0A]/5 py-3 rounded-xl tracking-wider">
                Safari Required
              </div>
            ) : (
              <button
                onClick={handleDismiss}
                className="flex-1 py-3 px-4 rounded-xl bg-[#FF453A] hover:bg-[#FF3B30] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_15px_rgba(255,69,58,0.3)]"
              >
                <Laptop className="w-3.5 h-3.5" />
                Understood
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
