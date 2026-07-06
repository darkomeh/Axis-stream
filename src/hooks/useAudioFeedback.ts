import { useCallback } from 'react';

// Create a single AudioContext for the application
let audioCtx: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const useAudioFeedback = () => {
  const playInteractionSound = useCallback((type: 'click' | 'play' | 'success' | 'alert') => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      // Low-pass filter for high-end subtle sound
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'click') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.exponentialRampToValueAtTime(300, now + 0.05);
        filter.frequency.setValueAtTime(2000, now);
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
      } else if (type === 'play') {
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        filter.frequency.setValueAtTime(3000, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        oscillator.start(now);
        oscillator.stop(now + 0.15);
      } else if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.setValueAtTime(600, now + 0.1);
        filter.frequency.setValueAtTime(1500, now);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        oscillator.start(now);
        oscillator.stop(now + 0.3);
      } else if (type === 'alert') {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(300, now);
        filter.frequency.setValueAtTime(800, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
      }
    } catch (err) {
      console.warn("Audio feedback failed", err);
    }
  }, []);

  return { playInteractionSound };
};
