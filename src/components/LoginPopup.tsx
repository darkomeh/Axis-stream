import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, User, LogIn, Sparkles, AlertCircle, ArrowRight, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPopup() {
  const { isLoginPopupOpen, closeLoginPopup, signupWithEmail, loginWithGoogle, sendMagicLink } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Only for signup
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'signin') {
        // Only use Magic Link for Sign In as requested
        await sendMagicLink(email);
        showToast('Magic link sent to your email! Check your inbox to sign in instantly.', 'success');
        closeLoginPopup();
      } else if (mode === 'signup') {
        await signupWithEmail(email, password, name);
        showToast('Account created successfully!', 'success');
        closeLoginPopup();
      }
    } catch (error: any) {
      console.error(error);
      let errorMessage = 'Authentication failed. Please try again.';
      
      // Handle the specific "invalid-credential" error
      if (error.code === 'auth/invalid-credential' || error.message?.includes('invalid-credential')) {
        errorMessage = 'No account found with these details. Would you like to create a new account or double-check your email?';
        setMode('signup');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-[#0d0d0d] border border-white/5 p-1 rounded-3xl w-full max-w-md shadow-[0_0_50px_-12px_rgba(255,255,255,0.1)] overflow-hidden"
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
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">
                {mode === 'signin' ? 'Welcome Back' : 'Join the Elite'}
              </h2>
              <p className="text-sm text-gray-400 font-medium max-w-[280px] mx-auto">
                {mode === 'signin' 
                  ? "We use passwordless magic links for maximum security." 
                  : "Create your account to unlock premium features."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="relative group">
                      <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors" />
                      <input
                        type="text"
                        placeholder="Public Display Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#161616] text-white p-3.5 pl-10 rounded-xl border border-white/5 focus:border-brand/50 focus:bg-brand/5 outline-none transition-all"
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors" />
                <input
                  type="email"
                  placeholder="Gmail Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#161616] text-white p-3.5 pl-10 rounded-xl border border-white/5 focus:border-brand/50 focus:bg-brand/5 outline-none transition-all"
                  required
                />
              </div>

              {mode === 'signup' && (
                <div className="relative group">
                  <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500 group-focus-within:text-brand transition-colors" />
                  <input
                    type="password"
                    placeholder="Secure Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#161616] text-white p-3.5 pl-10 rounded-xl border border-white/5 focus:border-brand/50 focus:bg-brand/5 outline-none transition-all"
                    required
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-brand-hover shadow-lg shadow-brand/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'signin' ? 'Send Magic Link' : 'Initialize Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-white/5 flex-1" />
              <span className="text-[10px] text-gray-600 uppercase font-black tracking-widest">Digital ID Verification</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="mt-6 w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <LogIn className="w-5 h-5" />
              Sync with Google
            </button>

            <div className="mt-8 text-center space-y-4">
              <p className="text-xs text-gray-500 font-medium">
                {mode === 'signin' ? "First time here?" : "Already have an ID?"}{' '}
                <button
                  onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                  className="text-brand font-bold hover:text-brand-hover transition-colors"
                >
                  {mode === 'signin' ? 'Create New Account' : 'Sign In with Link'}
                </button>
              </p>
              
              {mode === 'signin' && (
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-600 uppercase tracking-widest font-bold">
                  <Sparkles className="w-3 h-3 text-brand" />
                  <span>Passwordless Experience</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
