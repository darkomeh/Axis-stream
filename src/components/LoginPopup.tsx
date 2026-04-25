import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function LoginPopup() {
  const { isLoginPopupOpen, closeLoginPopup, loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
        showToast('Login successful', 'success');
      } else {
        await signupWithEmail(email, password, name);
        showToast('Signup successful', 'success');
      }
      closeLoginPopup();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      showToast('Login successful', 'success');
      closeLoginPopup();
    } catch (error: any) {
      console.error(error);
      showToast('Google login failed', 'error');
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
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#141414] border border-white/10 p-8 rounded-2xl w-full max-w-md shadow-2xl relative"
        >
          <button 
            onClick={closeLoginPopup}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1e1e1e] text-white p-3 pl-10 rounded-lg border border-transparent focus:border-brand outline-none transition"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1e1e1e] text-white p-3 pl-10 rounded-lg border border-transparent focus:border-brand outline-none transition"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-500" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1e1e1e] text-white p-3 pl-10 rounded-lg border border-transparent focus:border-brand outline-none transition"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-3 rounded-lg font-bold hover:bg-brand-hover transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-4">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-xs text-gray-500 uppercase">Or</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-bold hover:bg-gray-200 transition disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            Continue with Google
          </button>

          <p className="mt-6 text-center text-gray-400 text-sm">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
