import React from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { useAudioFeedback } from "../hooks/useAudioFeedback";

interface ShimmerButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  soundType?: 'click' | 'play' | 'success' | 'alert';
}

export const ShimmerButton = ({ children, className = "", onClick, soundType = 'click', ...props }: ShimmerButtonProps) => {
  const { playInteractionSound } = useAudioFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playInteractionSound(soundType);
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative overflow-hidden group ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </motion.button>
  );
};
