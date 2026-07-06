import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gamepad2, Smile, Sparkles, RefreshCw, Trophy, Zap, ArrowLeft, Star } from "lucide-react";

// Web Audio API synthesizer for instant audio feedback without asset dependencies
const playSound = (type: "flip" | "match" | "win" | "fail" | "pop" | "tick") => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "flip") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === "match") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === "win") {
      osc.type = "sine";
      const notes = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50];
      notes.forEach((freq, idx) => {
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.06);
      });
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } else if (type === "fail") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === "pop") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } else if (type === "tick") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    }
  } catch (e) {
    // Fail silently if browser blocks autoplay or audio context
  }
};

interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export default function KidsGameHub() {
  const [activeGame, setActiveGame] = useState<"menu" | "memory" | "pop">("menu");

  // Memory Game State
  const [memoryCards, setMemoryCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [memoryHighScore, setMemoryHighScore] = useState(() => {
    return parseInt(localStorage.getItem("kids_memory_high") || "0", 10);
  });
  const [memoryWon, setMemoryWon] = useState(false);

  // Pop Game State
  const [popActiveCell, setPopActiveCell] = useState<number | null>(null);
  const [popScore, setPopScore] = useState(0);
  const [popHighScore, setPopHighScore] = useState(() => {
    return parseInt(localStorage.getItem("kids_pop_high") || "0", 10);
  });
  const [popTimeLeft, setPopTimeLeft] = useState(0);
  const [popPlaying, setPopPlaying] = useState(false);
  const popTimerRef = useRef<NodeJS.Timeout | null>(null);
  const popMoleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memory Game Initializer
  const initMemoryGame = () => {
    const emojis = ["🦄", "🐼", "🦖", "🦁", "🐯", "🐸", "🐙", "🦊"];
    const deck = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));
    setMemoryCards(deck);
    setFlippedIndices([]);
    setMemoryMoves(0);
    setMemoryWon(false);
    playSound("win");
  };

  // Memory Card Click Handler
  const handleCardClick = (index: number) => {
    if (flippedIndices.length >= 2 || memoryCards[index].isFlipped || memoryCards[index].isMatched) return;

    playSound("flip");
    const updatedCards = [...memoryCards];
    updatedCards[index].isFlipped = true;
    setMemoryCards(updatedCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMemoryMoves((prev) => prev + 1);
      const [firstIdx, secondIdx] = newFlipped;

      if (memoryCards[firstIdx].emoji === memoryCards[secondIdx].emoji) {
        // Match!
        setTimeout(() => {
          playSound("match");
          const matchedCards = updatedCards.map((card, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...card, isMatched: true };
            }
            return card;
          });
          setMemoryCards(matchedCards);
          setFlippedIndices([]);

          // Check Win Condition
          if (matchedCards.every((card) => card.isMatched)) {
            setMemoryWon(true);
            playSound("win");
            const finalScore = Math.max(10, 100 - memoryMoves * 4);
            if (finalScore > memoryHighScore || memoryHighScore === 0) {
              localStorage.setItem("kids_memory_high", String(finalScore));
              setMemoryHighScore(finalScore);
            }
          }
        }, 500);
      } else {
        // Fail mismatch
        setTimeout(() => {
          playSound("fail");
          const revertedCards = updatedCards.map((card, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...card, isFlipped: false };
            }
            return card;
          });
          setMemoryCards(revertedCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  // Pop Game Start
  const startPopGame = () => {
    setPopScore(0);
    setPopTimeLeft(30);
    setPopPlaying(true);
    setPopActiveCell(Math.floor(Math.random() * 9));
    playSound("win");
  };

  // Pop Game Loop & Timers
  useEffect(() => {
    if (popPlaying && popTimeLeft > 0) {
      popTimerRef.current = setTimeout(() => {
        setPopTimeLeft((prev) => {
          if (prev <= 1) {
            setPopPlaying(false);
            setPopActiveCell(null);
            playSound("win");
            if (popScore > popHighScore) {
              localStorage.setItem("kids_pop_high", String(popScore));
              setPopHighScore(popScore);
            }
            return 0;
          }
          if (prev < 6) playSound("tick");
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (popTimerRef.current) clearTimeout(popTimerRef.current);
    };
  }, [popPlaying, popTimeLeft, popScore, popHighScore]);

  // Star pop-up movement speed
  useEffect(() => {
    if (popPlaying) {
      const interval = Math.max(400, 1000 - popScore * 30); // Speeds up as score increases!
      popMoleTimerRef.current = setInterval(() => {
        setPopActiveCell((current) => {
          let next;
          do {
            next = Math.floor(Math.random() * 9);
          } while (next === current);
          return next;
        });
      }, interval);
    }

    return () => {
      if (popMoleTimerRef.current) clearInterval(popMoleTimerRef.current);
    };
  }, [popPlaying, popScore]);

  const handlePopClick = (idx: number) => {
    if (!popPlaying) return;
    if (idx === popActiveCell) {
      playSound("pop");
      setPopScore((prev) => prev + 1);
      setPopActiveCell(null); // Instantly clear and wait for next interval or force immediate next
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-[30px] border border-white/10 rounded-3xl p-6 relative overflow-hidden" id="kids-game-hub">
      {/* Decorative background stars */}
      <div className="absolute top-4 right-4 text-[#FF3B30]/10 pointer-events-none animate-pulse">
        <Star className="w-16 h-16 fill-current" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-[#FF3B30] animate-bounce" />
          <div>
            <h3 className="text-base font-bold text-[#F5F5F7] tracking-tight">
              AxisKids Play Arena
            </h3>
            <p className="text-[11px] text-gray-400">
              The ultimate fun zone for kids!
            </p>
          </div>
        </div>
        {activeGame !== "menu" && (
          <button
            onClick={() => {
              setActiveGame("menu");
              playSound("flip");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#FF3B30]" /> Back
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeGame === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {/* Game 1 Banner: Memory Matching */}
            <div
              onClick={() => {
                setActiveGame("memory");
                initMemoryGame();
              }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-purple-900/30 via-white/[0.02] to-black/30 p-5 hover:border-purple-500/40 transition-all flex flex-col justify-between h-[150px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  🦄
                </div>
                {memoryHighScore > 0 && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" /> Best: {memoryHighScore}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">
                  Cartoon Match-Up
                </h4>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Flip and find pairs of cute magical cartoon animals!
                </p>
              </div>
            </div>

            {/* Game 2 Banner: Star Popper */}
            <div
              onClick={() => {
                setActiveGame("pop");
                startPopGame();
              }}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-[#FF3B30]/10 via-white/[0.02] to-black/30 p-5 hover:border-[#FF3B30]/40 transition-all flex flex-col justify-between h-[150px]"
            >
              <div className="flex justify-between items-start">
                <div className="p-2.5 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-red-400">
                  🌟
                </div>
                {popHighScore > 0 && (
                  <span className="text-[10px] bg-[#FF3B30]/20 text-[#FF3B30] font-bold px-2 py-0.5 rounded-full border border-[#FF3B30]/30 flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-400" /> Best: {popHighScore}
                  </span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1 group-hover:text-[#FF3B30] transition-colors">
                  Star Popper
                </h4>
                <p className="text-[10px] text-gray-400 leading-tight">
                  Catch the bouncing stars as fast as you can before time runs out!
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* MEMORY CARD GAME INTERFACE */}
        {activeGame === "memory" && (
          <motion.div
            key="memory"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-xs font-semibold px-1 text-gray-300">
              <span>Moves: <strong className="text-white">{memoryMoves}</strong></span>
              <button
                onClick={initMemoryGame}
                className="flex items-center gap-1 text-[#FF3B30] hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Restart Game
              </button>
            </div>

            {!memoryWon ? (
              <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-[320px] mx-auto">
                {memoryCards.map((card, idx) => (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(idx)}
                    className="aspect-square rounded-xl cursor-pointer perspective-1000 relative select-none"
                  >
                    <div
                      className={`w-full h-full duration-300 transform-style-3d relative transition-transform ${
                        card.isFlipped || card.isMatched ? "rotate-y-180" : ""
                      }`}
                    >
                      {/* Card Back */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-lg font-bold text-[#FF3B30] hover:bg-white/10 transition-colors">
                        🎈
                      </div>
                      {/* Card Front */}
                      <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border border-[#FF3B30]/30 bg-[#FF3B30]/5 flex items-center justify-center text-2xl select-none">
                        {card.emoji}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/30 rounded-full flex items-center justify-center mx-auto text-yellow-400">
                  <Trophy className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Magical Match Completed!</h4>
                  <p className="text-xs text-gray-400">
                    You finished in only <strong>{memoryMoves}</strong> moves. Stellar job!
                  </p>
                </div>
                <button
                  onClick={initMemoryGame}
                  className="px-6 py-2.5 bg-[#FF3B30] text-white rounded-full text-xs font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  Play Again
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* STAR POPPER GAME INTERFACE */}
        {activeGame === "pop" && (
          <motion.div
            key="pop"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-xs font-semibold px-1 text-gray-300">
              <span className="flex items-center gap-1">
                Score: <strong className="text-white text-sm">{popScore}</strong>
                <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
              </span>
              <span className="text-right">
                Time: <strong className={`text-sm ${popTimeLeft < 6 ? "text-[#FF3B30] animate-pulse" : "text-white"}`}>{popTimeLeft}s</strong>
              </span>
            </div>

            {popPlaying ? (
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                {Array.from({ length: 9 }).map((_, idx) => (
                  <div
                    key={idx}
                    onClick={() => handlePopClick(idx)}
                    className="aspect-square rounded-2xl border border-white/5 bg-white/[0.02] flex items-center justify-center relative cursor-pointer select-none overflow-hidden hover:bg-white/[0.04]"
                  >
                    {popActiveCell === idx && (
                      <motion.div
                        initial={{ scale: 0, y: 15 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        className="text-3xl select-none"
                      >
                        🌟
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 bg-[#FF3B30]/10 border border-[#FF3B30]/30 rounded-full flex items-center justify-center mx-auto text-[#FF3B30]">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white mb-1">Time's Up! ⏰</h4>
                  <p className="text-xs text-gray-400">
                    You caught <strong>{popScore}</strong> stars! Best effort!
                  </p>
                </div>
                <button
                  onClick={startPopGame}
                  className="px-6 py-2.5 bg-[#FF3B30] text-white rounded-full text-xs font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all"
                >
                  Play Again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
