import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";

interface TrayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  backgroundImage?: string;
}

export default function Tray({ isOpen, onClose, title, children, backgroundImage }: TrayProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-2xl z-40"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl z-50 max-h-[85vh] flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            {/* Full Background for the whole Tray */}
            {backgroundImage && (
              <div className="absolute inset-0 z-0 overflow-hidden">
                <img 
                  src={backgroundImage} 
                  alt="" 
                  className="w-full h-full object-cover opacity-[0.25] blur-[15px] brightness-[0.18] saturate-150 scale-110" 
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/90 via-transparent to-[#0a0a0a]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a]" />
                
                {/* Cyberpunk neon ambient backlight sources */}
                <div className="absolute -top-[25%] -left-[15%] w-[70%] aspect-square bg-brand/15 rounded-full blur-[120px] pointer-events-none mix-blend-screen animate-pulse" />
                <div className="absolute -bottom-[25%] -right-[15%] w-[70%] aspect-square bg-blue-500/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
              </div>
            )}

            {/* Sticky Header */}
            <div className="sticky top-0 bg-transparent flex items-center justify-between p-fluid-sm border-b border-white/5 z-20 rounded-t-3xl backdrop-blur-xl bg-black/20">
              <h3 className="text-fluid-lg font-bold tracking-tight text-white/95">{title}</h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }} 
                className="w-10 h-10 md:w-11 h-11 flex items-center justify-center text-white/80 hover:text-white transition-all bg-white/5 hover:bg-brand rounded-full group cursor-pointer border border-white/10 hover:border-brand/40 shadow-xl active:scale-90 relative z-30"
                title="Close"
              >
                <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
              <div className="p-fluid-sm">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
