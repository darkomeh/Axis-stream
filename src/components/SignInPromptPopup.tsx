import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, LogIn, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface Props {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
}

export default function SignInPromptPopup({ isOpen, onClose, onConfirm }: Props) {
 const navigate = useNavigate();
 const { loginAsGuest } = useAuth();

 if (!isOpen) return null;

 return (
 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl"
 onClick={onClose}
 >
 <motion.div
 initial={{ scale: 0.9, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0.9, opacity: 0 }}
 className="w-full max-w-md glass-panel rounded-2xl p-8 relative shadow-2xl"
 onClick={(e) => e.stopPropagation()}
 >
 <button
 onClick={onClose}
 className="absolute top-4 right-4 text-white/50 hover:text-white"
 >
 <X size={24} />
 </button>

 <div className="text-center">
 <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center mx-auto mb-6">
 <LogIn className="w-8 h-8 text-brand" />
 </div>
 <h2 className="text-fluid-2xl font-semibold tracking-tight text-white mb-2">
 Unlock Premium Access
 </h2>
 <p className="text-white/60 text-fluid-sm font-medium mb-8">
 Join Axis TV now to unlock unlimited, ad-free streaming and high-speed downloads. Your personal entertainment hub awaits—completely free.
 </p>
 
 <div className="flex flex-col gap-3">
 <button
 onClick={onConfirm}
 className="w-full py-4 bg-brand text-white rounded-lg font-semibold tracking-wide text-fluid-sm hover:bg-brand-hover transition-all shadow-[0_0_20px_rgba(229,9,20,0.3)]"
 >
 Create Your Account
 </button>
 <button
 onClick={() => { loginAsGuest(); onClose(); }}
 className="w-full py-3 text-white/50 hover:text-white text-fluid-xs font-bold tracking-wide transition-colors"
 >
 Continue as Guest
 </button>
 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 );
}
