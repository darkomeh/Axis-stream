import { motion } from "motion/react";

export default function PopcornLoader() {
 return (
 <div className="flex flex-col items-center justify-center gap-6">
 <div className="relative w-16 h-16">
 <motion.div 
 animate={{ rotate: 360 }}
 transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
 className="absolute inset-0 border-2 border-brand/20 rounded-full"
 />
 <motion.div 
 animate={{ rotate: 360 }}
 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
 className="absolute inset-0 border-t-2 border-brand rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"
 />
 </div>
 <motion.p 
 initial={{ opacity: 0 }}
 animate={{ opacity: [0.3, 1, 0.3] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="text-white/40 text-fluid-sm font-semibold tracking-[0.3em]"
 >
 Loading
 </motion.p>
 </div>
 );
}
