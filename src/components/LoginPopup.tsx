import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPopup() {
  const { isLoginPopupOpen, closeLoginPopup, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Welcome back!', 'success');
      closeLoginPopup();
    } catch (error: any) {
      console.error(error);
      showToast('Google authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoginPopupOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-3xl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative glass-panel p-1 rounded-3xl w-full max-w-md shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] overflow-hidden"
        >
          {/* Animated Background Accent */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
          
          <div className="p-8 relative">
            <button 
              onClick={closeLoginPopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-8">
              <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center border border-brand/20 relative group">
                <div className="absolute inset-0 bg-brand/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <ShieldCheck className="w-8 h-8 text-brand relative" />
              </div>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-fluid-3xl font-semibold text-white tracking-tight mb-2">
                Join the Elite
              </h2>
              <p className="text-fluid-sm text-gray-400 font-medium max-w-[280px] mx-auto">
                Sign in with Google to access premium features.
              </p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Continue with Google
                </>
              )}
            </button>

            <div className="mt-8 text-center space-y-4">
              <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-center gap-1.5 text-fluid-xs text-gray-600 tracking-wide font-semibold">
                  <ShieldCheck className="w-3 h-3 text-brand" />
                  <span>Secured by AxisTV Identity</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
