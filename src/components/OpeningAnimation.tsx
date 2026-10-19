import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { playArcadeBootChime, isArcadeAudioEnabled, setArcadeAudioEnabled } from '../utils/arcadeAudio';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'pixels' | 'assemble' | 'impact' | 'complete'>('pixels');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isArcadeAudioEnabled());
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      localStorage.setItem('ftm_intro_seen', 'true');
      sessionStorage.setItem('ftm_dev_intro_played_session', 'true');
    } catch {}
    onComplete();
  }, [onComplete]);

  // Reduced motion detection
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      handleFinish();
      return;
    }

    // Play synthesized arcade chime
    playArcadeBootChime();

    // Sequence timing
    // 0.35s: Pixels start assembling upward into wordmark
    const tAssemble = setTimeout(() => {
      setPhase('assemble');
    }, 350);

    // 1.25s: Logo completes with arcade visual impact
    const tImpact = setTimeout(() => {
      setPhase('impact');
    }, 1250);

    // 2.1s: Smooth exit into app
    const tEnd = setTimeout(() => {
      setPhase('complete');
      setTimeout(handleFinish, 300);
    }, 2100);

    return () => {
      clearTimeout(tAssemble);
      clearTimeout(tImpact);
      clearTimeout(tEnd);
    };
  }, [handleFinish, prefersReducedMotion]);

  const toggleSound = () => {
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
          key="ftm-arcade-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070a08] text-[#f1f5f9] overflow-hidden select-none"
        >
          {/* CRT Scanline & Grid Background */}
          <div className="absolute inset-0 pointer-events-none retro-scanlines opacity-40" />
          <div className="absolute inset-0 pointer-events-none retro-dot-grid opacity-30" />

          {/* Top Controls: Sound Toggle & Skip */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between max-w-2xl mx-auto px-2">
            <button
              type="button"
              onClick={toggleSound}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1411]/90 hover:bg-[#151e18] border border-[#24352b] rounded-lg text-xs font-mono text-slate-300 transition cursor-pointer shadow-xs"
              title={soundEnabled ? 'Mute arcade sound' : 'Enable arcade sound'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-[11px] text-lime-400 font-bold">Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[11px] text-slate-500">Muted</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f1411]/90 hover:bg-[#151e18] border border-[#24352b] hover:border-lime-700/60 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer shadow-xs"
            >
              <span className="text-[11px] font-bold">SKIP</span>
              <FastForward className="w-3.5 h-3.5 text-lime-400" />
            </button>
          </div>

          {/* Center Pixel Assembly Matrix */}
          <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-md w-full text-center">
            
            {/* Rising Pixel Particles (Rising from bottom) */}
            <div className="w-64 h-32 relative mb-2 flex items-center justify-center overflow-visible">
              {[...Array(24)].map((_, i) => {
                const delay = (i % 8) * 0.08;
                const posX = ((i % 6) - 2.5) * 36;
                const isLime = i % 3 === 0;

                return (
                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                      y: 120,
                      x: posX,
                      scale: 0.4,
                    }}
                    animate={{
                      opacity: phase === 'impact' ? [0.8, 1, 0] : [0, 0.9, 0.7],
                      y: phase === 'assemble' || phase === 'impact' ? 0 : 40,
                      scale: phase === 'impact' ? 1.4 : 1,
                    }}
                    transition={{
                      duration: 0.9,
                      delay,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className={`absolute w-3.5 h-3.5 rounded-[2px] ${
                      isLime ? 'bg-lime-400 shadow-[0_0_8px_#84cc16]' : 'bg-slate-200 shadow-[0_0_6px_#f1f5f9]'
                    }`}
                  />
                );
              })}

              {/* Main Assembled Wordmark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 15 }}
                animate={{
                  opacity: phase === 'assemble' || phase === 'impact' ? 1 : 0,
                  scale: phase === 'impact' ? [1, 1.08, 1] : 1,
                  y: 0,
                }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="relative z-10"
              >
                <div className="text-4xl sm:text-5xl font-black font-pixel tracking-wider uppercase text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                  TOURN<span className="text-lime-400 drop-shadow-[0_0_20px_rgba(132,204,22,0.8)]">X</span>
                </div>
              </motion.div>
            </div>

            {/* Impact Flash Shockwave */}
            {phase === 'impact' && (
              <motion.div
                initial={{ scale: 0.6, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute w-44 h-44 rounded-full border border-lime-400 pointer-events-none"
              />
            )}

            {/* Subtitle & Badge */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: phase === 'impact' ? 1 : 0,
                y: phase === 'impact' ? 0 : 8,
              }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="space-y-2 mt-1"
            >
              <div className="inline-block px-3.5 py-1 rounded-full bg-[#121c15] border border-lime-700/60 text-lime-400 font-mono text-xs font-bold tracking-widest lowercase">
                think.prompt.organise
              </div>

              <p className="text-[11px] font-mono text-slate-400 tracking-wider uppercase">
                RETRO ARCADE TOURNAMENT SYSTEM
              </p>
            </motion.div>

          </div>

          {/* Bottom Loading Bar indicator */}
          <div className="absolute bottom-6 left-0 right-0 max-w-xs mx-auto px-6">
            <div className="w-full bg-[#141d18] border border-[#233529] h-2 rounded-full overflow-hidden p-0.5">
              <motion.div
                initial={{ width: '5%' }}
                animate={{ width: phase === 'impact' ? '100%' : '65%' }}
                transition={{ duration: 1.8, ease: 'easeInOut' }}
                className="h-full bg-lime-400 rounded-full shadow-[0_0_8px_#84cc16]"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 mt-1.5">
              <span>SYSTEM READY</span>
              <span>100%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
