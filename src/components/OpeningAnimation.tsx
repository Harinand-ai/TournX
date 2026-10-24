import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Trophy, Sparkles } from 'lucide-react';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'entering' | 'presenting' | 'complete'>('entering');
  const completedRef = useRef(false);

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
    }, 280);
  }, [onComplete]);

  // Reduced motion detection
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      handleFinish();
      return;
    }

    // Phase 1 -> 2: 3D logo settles and subtitle reveals at 0.5s
    const tPresent = setTimeout(() => {
      setPhase('presenting');
    }, 500);

    // Phase 2 -> finish at 2.0s
    const tFinish = setTimeout(() => {
      handleFinish();
    }, 2100);

    return () => {
      clearTimeout(tPresent);
      clearTimeout(tFinish);
    };
  }, [handleFinish, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          key="tournx-3d-logo-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
          className="fixed inset-0 z-[99999] w-full h-full bg-[#09110c] text-[#faf9f5] overflow-hidden select-none flex flex-col justify-between"
          onClick={handleFinish}
        >
          {/* Subtle Ambient Stadium Floodlight Atmosphere */}
          <div className="absolute inset-0 bg-radial from-emerald-900/20 via-[#0d1610]/80 to-[#070d09] pointer-events-none" />

          {/* Top Bar with Skip */}
          <div className="relative z-30 pt-4 px-6 flex items-center justify-between max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>TournX</span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#142319] hover:bg-[#1a2f22] border border-[#233f2c] rounded-xl text-xs text-slate-300 hover:text-white transition cursor-pointer shadow-sm"
            >
              <span>Skip</span>
              <FastForward className="w-3.5 h-3.5 text-emerald-400" />
            </button>
          </div>

          {/* 3D Depth Emblem & Wordmark Centerpiece */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 -mt-8" style={{ perspective: '1000px' }}>
            
            {/* 3D Floating Trophy Emblem */}
            <motion.div
              initial={{ rotateX: 45, rotateY: -25, scale: 0.7, opacity: 0, y: -30 }}
              animate={{ 
                rotateX: phase === 'presenting' ? 0 : 15, 
                rotateY: phase === 'presenting' ? 0 : -8, 
                scale: 1, 
                opacity: 1, 
                y: 0 
              }}
              transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-[#1b432a] via-[#133220] to-[#0d2215] border-2 border-emerald-500/40 shadow-[0_16px_36px_rgba(0,0,0,0.6),0_0_24px_rgba(16,185,129,0.25)] flex items-center justify-center mb-5"
            >
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
            </motion.div>

            {/* Premium Typography Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#faf9f5]">
                Tourn<span className="text-emerald-400">X</span>
              </h1>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'presenting' ? 1 : 0, y: phase === 'presenting' ? 0 : 8 }}
                transition={{ duration: 0.4, delay: 0.35 }}
                className="mt-3 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#142319] border border-[#233f2c] text-emerald-300 text-xs font-medium tracking-wider lowercase shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>think • prompt • organise</span>
              </motion.div>
            </motion.div>

          </div>

          {/* Minimalist Progress Strip */}
          <div className="relative z-30 pb-6 px-6 max-w-xs w-full mx-auto">
            <div className="w-full bg-[#142319] border border-[#233f2c] h-1 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '10%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
