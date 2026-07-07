import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../services/firebaseService';

const GENRES = [
  { id: 'Action', name: 'Action', emoji: '💥' },
  { id: 'Sci-Fi', name: 'Sci-Fi', emoji: '👽' },
  { id: 'Drama', name: 'Drama', emoji: '🎭' },
  { id: 'Comedy', name: 'Comedy', emoji: '😂' },
  { id: 'Horror', name: 'Horror', emoji: '🔪' },
  { id: 'Romance', name: 'Romance', emoji: '❤️' },
  { id: 'Animation', name: 'Animation', emoji: '🎨' },
  { id: 'Fantasy', name: 'Fantasy', emoji: '🐉' },
  { id: 'Documentary', name: 'Documentary', emoji: '🎥' }
];

export const TasteProfiler = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const hasProfiled = localStorage.getItem(`taste_profile_${user.id}`);
    if (!hasProfiled) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    if (user) {
      localStorage.setItem(`taste_profile_${user.id}`, JSON.stringify(selectedGenres));
      try {
        await updateProfile({ tasteProfile: selectedGenres });
      } catch (err) {
        console.error("Failed to save taste profile to Firebase", err);
      }
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 to-transparent pointer-events-none" />
            
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>

            <div className="text-center space-y-4 mb-10 relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">What do you love?</h2>
              <p className="text-gray-400 text-sm md:text-base max-w-md mx-auto">
                Select your favorite genres to help us build your personalized recommendation engine.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-10 relative z-10">
              {GENRES.map(genre => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all duration-300 ${isSelected ? 'bg-brand/20 border-brand shadow-[0_0_20px_rgba(255,45,45,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'}`}
                  >
                    <span className="text-3xl">{genre.emoji}</span>
                    <span className={`font-semibold tracking-wide text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                      {genre.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center relative z-10">
              <button
                onClick={handleComplete}
                disabled={selectedGenres.length === 0}
                className={`px-10 py-4 rounded-full font-bold tracking-wide transition-all flex items-center gap-2 ${selectedGenres.length > 0 ? 'bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {selectedGenres.length > 0 ? (
                  <>
                    <Check className="w-5 h-5" />
                    Save My Profile
                  </>
                ) : (
                  'Select at least one'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
