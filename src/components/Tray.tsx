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
 className="fixed inset-0 bg-black/40 backdrop-blur-3xl z-40 backdrop-blur-sm"
 />
 <motion.div
 initial={{ y: "100%" }}
 animate={{ y: 0 }}
 exit={{ y: "100%" }}
 transition={{ type: "spring", damping: 25, stiffness: 200 }}
 className="fixed bottom-0 left-0 right-0 bg-transparent border-t border-white/10 rounded-t-3xl z-50 max-h-[85vh] flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.5)] overflow-hidden"
 >
 {/* Full Background for the whole Tray */}
 {backgroundImage && (
 <div className="absolute inset-0 z-0">
 <img 
 src={backgroundImage} 
 alt="" 
 className="w-full h-full object-cover opacity-20 blur-sm brightness-[0.3]" 
 referrerPolicy="no-referrer"
 loading="lazy"
 />
 <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90" />
 </div>
 )}

 {/* Sticky Header */}
 <div className={`sticky top-0 ${backgroundImage ? 'bg-transparent' : 'bg-transparent'} flex items-center justify-between p-fluid-sm border-b border-white/5 z-20 rounded-t-3xl backdrop-blur-md`}>
 <h3 className="text-fluid-lg font-semibold tracking-tight text-white/90">{title}</h3>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 onClose();
 }} 
 className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center text-white/90 hover:text-white transition-all bg-white/10 hover:bg-brand/40 rounded-full group cursor-pointer border border-white/10 hover:border-brand/40 shadow-xl active:scale-90 relative z-30"
 title="Close"
 >
 <X className="w-5 h-5 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
 </button>
 </div>
 <div className="flex-1 overflow-y-auto no-scrollbar">
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
