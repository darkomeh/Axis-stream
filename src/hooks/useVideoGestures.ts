import { useRef, useState } from 'react';

interface GestureFeedback {
  type: 'forward' | 'backward' | 'volume' | 'brightness' | 'speed';
  value: string | number;
  side?: 'left' | 'right';
}

export function useVideoGestures({
  isLocked,
  videoRef,
  volume,
  setVolume,
  brightness,
  setBrightness,
  playbackSpeed,
  seek
}: {
  isLocked: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  volume: number;
  setVolume: (v: number) => void;
  brightness: number;
  setBrightness: (b: number) => void;
  playbackSpeed: number;
  seek: (seconds: number) => void;
}) {
  const [zoom, setZoom] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [gestureFeedback, setGestureFeedback] = useState<GestureFeedback | null>(null);

  const lastTapRef = useRef<number>(0);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialPinchDistanceRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };

    // Double Tap Detection
    const now = Date.now();
    const timesinceLastTap = now - lastTapRef.current;
    if (timesinceLastTap < 300) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      if (x < rect.width / 3) {
        seek(-10);
      } else if (x > (rect.width * 2) / 3) {
        seek(10);
      }
      lastTapRef.current = 0; // Reset
      return;
    }
    lastTapRef.current = now;

    // Long Press Detection
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPressing(true);
      if (videoRef.current) videoRef.current.playbackRate = 2;
      setGestureFeedback({ type: 'speed', value: '2x' });
    }, 500);

    // Pinch Detection
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isLocked || !touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Cancel long press if moved significantly
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    }

    // Swipe Gestures (Volume & Brightness)
    if (e.touches.length === 1 && !isLongPressing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = touchStartRef.current.x - rect.left;
      
      if (Math.abs(deltaY) > 20) {
        if (x < rect.width / 3) {
          // Left side: Brightness
          const newBrightness = Math.min(2, Math.max(0.1, brightness - deltaY / 200));
          setBrightness(newBrightness);
          setGestureFeedback({ type: 'brightness', value: Math.round(newBrightness * 50) });
        } else if (x > (rect.width * 2) / 3) {
          // Right side: Volume
          const newVolume = Math.min(1, Math.max(0, volume - deltaY / 200));
          setVolume(newVolume);
          if (videoRef.current) videoRef.current.volume = newVolume;
          setGestureFeedback({ type: 'volume', value: Math.round(newVolume * 100) });
        }
        // Update start point to make it feel continuous
        touchStartRef.current.y = touch.clientY;
      }
    }

    // Pinch Zoom
    if (e.touches.length === 2 && initialPinchDistanceRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / initialPinchDistanceRef.current;
      if (ratio > 1.2) setZoom('fill');
      if (ratio < 0.8) setZoom('contain');
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    if (isLongPressing) {
      setIsLongPressing(false);
      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
      setGestureFeedback(null);
    }
    touchStartRef.current = null;
    initialPinchDistanceRef.current = null;
    setTimeout(() => setGestureFeedback(null), 500);
  };

  return {
    zoom,
    setZoom,
    isLongPressing,
    gestureFeedback,
    setGestureFeedback,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}
