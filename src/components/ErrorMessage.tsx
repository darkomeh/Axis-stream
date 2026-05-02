import React from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ErrorMessageProps {
  message?: string;
  onRetry?: () => void;
  variant?: 'full' | 'inline';
}

export function ErrorMessage({ 
  message = "Something went wrong. Please check your connection.", 
  onRetry,
  variant = 'full'
}: ErrorMessageProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3 p-4 bg-brand/10 border border-brand/20 rounded-xl text-brand">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
        <button 
          onClick={handleRetry}
          className="ml-auto p-2 hover:bg-brand/20 rounded-full transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className="w-20 h-20 bg-brand/10 rounded-full flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-brand" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-3">Connection Lost</h3>
      <p className="text-gray-400 max-w-md mb-8">
        {message}
      </p>
      <button 
        onClick={handleRetry}
        className="flex items-center gap-2 px-8 py-3 bg-brand hover:bg-brand-hover text-white font-bold rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(229,9,20,0.4)]"
      >
        <RefreshCw className="w-5 h-5" />
        Reload Application
      </button>
    </motion.div>
  );
}
