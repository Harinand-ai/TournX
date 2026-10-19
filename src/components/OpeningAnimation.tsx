import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { playArcadeBootChime, isArcadeAudioEnabled, setArcadeAudioEnabled } from '../utils/arcadeAudio';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  // Audio default ON
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isArcadeAudioEnabled());
  const [phase, setPhase] = useState<'falling' | 'impact' | 'typewriter' | 'complete'>('falling');
  const [typedText, setTypedText] = useState('');
  const completedRef = useRef(false);

  const fullTagline = 'think.prompt.organise';

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      localStorage.setItem('ftm_intro_seen', 'true');
      sessionStorage.setItem('ftm_dev_intro_played_session', 'true');
    } catch {}
    setPhase('complete');
    setTimeout(() => {
      onComplete();
    }, 350);
  }, [onComplete]);

  // Reduced motion detection
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      handleFinish();
      return;
    }

    // Play arcade sound chime immediately
    if (soundEnabled) {
      playArcadeBootChime();
    }

    // Phase 1 -> 2: Ball drops and smashes into pixel blocks at 0.5s
    const tImpact = setTimeout(() => {
      setPhase('impact');
      if (soundEnabled) {
        playArcadeBootChime();
      }
    }, 550);

    // Phase 2 -> 3: Wordmark locked, typewriter subtitle begins at 1.2s
    const tTypewriter = setTimeout(() => {
      setPhase('typewriter');
    }, 1150);

    // Phase 4: Smooth transition into app at 2.6s
    const tFinish = setTimeout(() => {
      handleFinish();
    }, 2650);

    return () => {
      clearTimeout(tImpact);
      clearTimeout(tTypewriter);
      clearTimeout(tFinish);
    };
  }, [handleFinish, prefersReducedMotion, soundEnabled]);

  // Typewriter effect for "think.prompt.organise"
  useEffect(() => {
    if (phase !== 'typewriter') return;

    let index = 0;
    const interval = setInterval(() => {
      index++;
      setTypedText(fullTagline.slice(0, index));
      if (index >= fullTagline.length) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phase]);

  // Handle first user interaction to unlock audio if browser prevented autoplay
  useEffect(() => {
    const unlockAudio = () => {
      if (!soundEnabled) {
        setSoundEnabled(true);
        setArcadeAudioEnabled(true);
        playArcadeBootChime();
      }
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [soundEnabled]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    setArcadeAudioEnabled(next);
    if (next) {
      playArcadeBootChime();
    }
  };

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          key="ftm-native-arcade-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeOut' } }}
          className="fixed inset-0 z-[99999] w-full h-full bg-[#050806] text-[#f1f5f9] overflow-hidden select-none flex flex-col justify-between"
          onClick={handleFinish}
        >
          {/* Authentic 3D Moving Retro Perspective Wireframe Grid */}
          <div className="retro-perspective-grid-container opacity-85 pointer-events-none">
            <div className="retro-horizon-glow" />
            <div className="retro-perspective-grid" />
          </div>

          {/* CRT Scanlines & Subtle Vignette */}
          <div className="absolute inset-0 pointer-events-none retro-scanlines opacity-25 z-20" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.85)] z-20" />

          {/* HUD Top Bar: Clean Minimal Skip Action */}
          <div className="relative z-30 pt-3 sm:pt-5 px-4 sm:px-6 flex items-center justify-between max-w-4xl w-full mx-auto">
            {/* Subtle Brand Tag */}
            <div className="flex items-center gap-2 text-xs text-slate-400 font-sans tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold text-slate-300">TournX</span>
            </div>

            {/* Skip Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827]/80 hover:bg-[#1f2937] border border-[#374151] rounded-lg text-xs font-sans text-slate-300 hover:text-white transition cursor-pointer shadow-sm backdrop-blur-xs"
            >
              <span>Skip</span>
              <FastForward className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          {/* Main Visual Centerpiece: Falling Pixels + Ball Smash + Glowing Wordmark */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 w-full max-w-lg mx-auto text-center -mt-6">

            {/* 1. Kinetic Falling Pixel Soccer Ball (Hits center at 0.55s) */}
            <AnimatePresence>
              {phase === 'falling' && (
                <motion.div
                  initial={{ y: -220, scale: 0.6, rotate: -90, opacity: 0 }}
                  animate={{ y: 0, scale: 1, rotate: 180, opacity: 1 }}
                  exit={{ scale: 1.6, opacity: 0, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.52, ease: [0.34, 1.56, 0.64, 1] }}
                  className="w-12 h-12 sm:w-14 sm:h-14 mb-4 relative flex items-center justify-center"
                >
                  <div className="w-full h-full rounded-full bg-emerald-500/10 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center justify-center">
                    <div className="w-3.5 h-3.5 bg-emerald-400 rounded-xs rotate-45 shadow-[0_0_6px_#10b981]" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 2. Expanding Impact Shockwaves upon Smash */}
            {phase !== 'falling' && (
              <motion.div
                initial={{ scale: 0.2, opacity: 0.8 }}
                animate={{ scale: 2.8, opacity: 0 }}
                transition={{ duration: 0.65, ease: 'easeOut' }}
                className="absolute w-32 h-32 rounded-full border-2 border-emerald-400 pointer-events-none shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              />
            )}

            {/* 3. Radial Pixel Sparks Burst */}
            <div className="relative w-48 h-16 flex items-center justify-center">
              {[...Array(18)].map((_, i) => {
                const angle = (i / 18) * Math.PI * 2;
                const distance = phase === 'falling' ? 0 : 70 + (i % 3) * 25;
                const targetX = Math.cos(angle) * distance;
                const targetY = Math.sin(angle) * distance;
                const isEmerald = i % 2 === 0;

                return (
                  <motion.div
                    key={i}
                    initial={{
                      x: (i % 6 - 2.5) * 24,
                      y: -120 + (i % 4) * 20,
                      opacity: 0,
                      scale: 0.5,
                    }}
                    animate={{
                      x: phase === 'falling' ? (i % 6 - 2.5) * 16 : targetX,
                      y: phase === 'falling' ? 0 : targetY,
                      opacity: phase === 'falling' ? 0.7 : [0.9, 1, 0],
                      scale: phase === 'impact' ? 1.4 : 1,
                    }}
                    transition={{
                      duration: phase === 'falling' ? 0.45 : 0.7,
                      ease: 'easeOut',
                    }}
                    className={`absolute w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] pointer-events-none ${
                      isEmerald
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                        : 'bg-white shadow-[0_0_6px_#ffffff]'
                    }`}
                  />
                );
              })}

              {/* 4. Assembled Wordmark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{
                  opacity: phase !== 'falling' ? 1 : 0,
                  scale: phase === 'impact' ? [1, 1.06, 1] : 1,
                  y: phase !== 'falling' ? 0 : 15,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative z-20"
              >
                <div className="text-4xl sm:text-6xl font-black font-pixel tracking-wider uppercase text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">
                  TOURN<span className="text-emerald-400 drop-shadow-[0_0_24px_rgba(16,185,129,0.8)]">X</span>
                </div>
              </motion.div>
            </div>

            {/* 5. Terminal Typewriter Subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: phase !== 'falling' ? 1 : 0,
                y: phase !== 'falling' ? 0 : 10,
              }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111827] border border-[#1f293d] text-emerald-400 font-mono text-xs sm:text-sm font-semibold tracking-wider lowercase shadow-sm min-w-[200px] justify-center">
                <span>{typedText || fullTagline}</span>
                <span className="w-1.5 h-3.5 bg-emerald-400 inline-block animate-pulse -ml-0.5" />
              </div>
            </motion.div>

          </div>

          {/* Bottom HUD: Progress Bar & Ready Indicator */}
          <div className="relative z-30 pb-4 sm:pb-6 px-4 sm:px-6 max-w-sm sm:max-w-md w-full mx-auto">
            <div className="w-full bg-[#111827] border border-[#1f2937] h-1.5 rounded-full overflow-hidden p-0.25 shadow-xs">
              <motion.div
                initial={{ width: '5%' }}
                animate={{ width: phase === 'typewriter' ? '100%' : '65%' }}
                transition={{ duration: 2.2, ease: 'easeInOut' }}
                className="h-full bg-emerald-500 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.6)]"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-sans text-slate-400 mt-1.5 px-1">
              <span>Initializing</span>
              <span>{phase === 'typewriter' ? '100%' : 'Loading'}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};



