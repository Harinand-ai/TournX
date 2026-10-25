import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Sparkles } from 'lucide-react';
import { TournXEmblemCanvas3D } from './three/TournXEmblemCanvas3D';

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

    // Phase 1 -> 2: 3D emblem camera pushes in and stabilizes
    const tPresent = setTimeout(() => {
      setPhase('presenting');
    }, 450);

    // Phase 2 -> Finish at 1.9s (cinematic yet snappy, no forced waiting)
    const tFinish = setTimeout(() => {
      handleFinish();
    }, 1900);

    return () => {
      clearTimeout(tPresent);
      clearTimeout(tFinish);
    };
  }, [handleFinish, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {phase !== 'complete' && (
        <motion.div
          key="tournx-3d-cinematic-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
          className="fixed inset-0 z-[99999] w-full h-full bg-[#101013] text-[#F0E9E7] overflow-hidden select-none flex flex-col justify-between"
          onClick={handleFinish}
        >
          {/* Subtle Ambient Stadium Floodlight & Burgundy Depth Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(33,25,29,0.95)_0%,_rgba(25,25,31,0.85)_40%,_#101013_80%)] pointer-events-none" />

          {/* Crimson Horizon Atmosphere Ray */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[280px] bg-gradient-to-r from-transparent via-[#D72645]/15 to-transparent blur-3xl pointer-events-none" />

          {/* Minimalist Top Brand Bar (No skip button) */}
          <div className="relative z-30 pt-6 px-6 flex items-center justify-between max-w-4xl w-full mx-auto">
            <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#A5A1A4]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D72645] animate-pulse" />
              <span>TournX • 3D Football Engine</span>
            </div>
            <div className="text-[10px] font-mono tracking-widest text-[#A5A1A4]/60 uppercase">
              Initializing Experience
            </div>
          </div>

          {/* Real Three.js WebGL 3D Dimensional Centerpiece */}
          <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 -mt-6">
            <motion.div
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{
                scale: 1,
                opacity: 1,
              }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="mb-4 relative"
            >
              {/* Genuine WebGL Three.js Emblem Canvas */}
              <TournXEmblemCanvas3D
                size={210}
                autoRotate={true}
                interactive={true}
                glowColor="#D72645"
                rimColor="#991B35"
              />
            </motion.div>

            {/* Expressive Wordmark Treatment */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-black italic tracking-tight font-display text-[#F0E9E7]">
                Tourn<span className="text-[#D72645]">X</span>
              </h1>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: phase === 'presenting' ? 1 : 0, y: phase === 'presenting' ? 0 : 8 }}
                transition={{ duration: 0.35, delay: 0.3 }}
                className="mt-3.5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#19191F]/90 border border-white/10 text-[#F0E9E7] text-xs font-mono font-medium tracking-wider lowercase shadow-sm backdrop-blur-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D72645]" />
                <span>think • prompt • organise</span>
              </motion.div>
            </motion.div>
          </div>

          {/* Restrained Vivid Crimson Progress Bar */}
          <div className="relative z-30 pb-7 px-6 max-w-xs w-full mx-auto">
            <div className="w-full bg-[#19191F] border border-white/5 h-1 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '15%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                className="h-full bg-[#D72645] rounded-full shadow-[0_0_10px_rgba(215,38,69,0.9)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
