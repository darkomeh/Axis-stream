import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { ShieldAlert, AlertTriangle, XCircle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SystemAlerts() {
  const { systemMessage, isMaintenance, isAdmin, isBanned } = useAuth();
  const location = useLocation();

  // Allow profile page (login) to be accessible during maintenance for admin log-in
  const isAuthPage = location.pathname === '/profile';

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="relative">
            <motion.div 
               animate={{ scale: [1, 1.1, 1] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="w-32 h-32 border-2 border-brand/20 rounded-full mx-auto flex items-center justify-center"
            >
               <XCircle className="w-16 h-16 text-brand" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">Account Suspended</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              Your access to the Λ𝗫𝗜𝗦 platform has been terminated by an administrator for violations of our community guidelines.
            </p>
          </div>
          <div className="pt-8">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-700">ErrorCode: AX_BAN_403</p>
          </div>
        </div>
      </div>
    );
  }

  if (isMaintenance && !isAdmin && !isAuthPage) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="relative">
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
               className="w-32 h-32 border-2 border-brand/20 rounded-full mx-auto flex items-center justify-center"
            >
               <AlertTriangle className="w-16 h-16 text-brand" />
            </motion.div>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-4">Under Maintenance</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              Λ𝗫𝗜𝗦 is currently undergoing critical system upgrades to improve your streaming experience. 
              We'll be back shortly.
            </p>
          </div>
          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <div className="w-2 h-2 bg-brand animate-pulse rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Lockdown Active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {systemMessage && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-48px)] max-w-2xl"
        >
          <div className="bg-brand/90 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-2xl shadow-brand/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
               <Info className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-0.5">Platform Broadcast</p>
               <p className="text-sm font-bold text-white leading-tight truncate">{systemMessage}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
