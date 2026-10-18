import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEMO_TEAMS } from '../data/syntheticData';
import { TeamBadge } from './TeamBadge';
import { FastForward } from 'lucide-react';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'ball' | 'title' | 'teams'>('ball');
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      sessionStorage.setItem('ftm_dev_intro_played_session', 'true');
    } catch {}
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    // 1.2s: Reveal Title
    const tTitle = setTimeout(() => {
      setPhase('title');
    }, 1200);

    // 2.4s: Show teams
    const tTeams = setTimeout(() => {
      setPhase('teams');
    }, 2400);

    // 4.2s: Transition into home page
    const tEnd = setTimeout(() => {
      handleFinish();
    }, 4200);

    return () => {
      clearTimeout(tTitle);
      clearTimeout(tTeams);
      clearTimeout(tEnd);
    };
  }, [handleFinish]);

  return (
    <AnimatePresence>
      <motion.div
        key="ftm-intro-sequence"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070b10] text-slate-100 overflow-hidden select-none"
      >
        {/* Pitch overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center p-4">
          <svg
            className="w-full h-full max-w-sm max-h-[85vh] stroke-white/35"
            viewBox="0 0 300 500"
            fill="none"
          >
            <rect x="20" y="20" width="260" height="460" rx="4" strokeWidth="1.5" />
            <line x1="20" y1="250" x2="280" y2="250" strokeWidth="1.5" />
            <circle cx="150" cy="250" r="45" strokeWidth="1.5" />
            <circle cx="150" cy="250" r="3.5" fill="white" />
            <rect x="75" y="20" width="150" height="75" strokeWidth="1.5" />
            <rect x="75" y="405" width="150" height="75" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Skip button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleFinish}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer"
          >
            <span>Skip</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center content */}
        <div className="relative z-10 w-full max-w-xs px-4 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {phase === 'ball' && (
              <motion.div
                key="vertical-ball-phase"
                initial={{ scale: 0.3, opacity: 0, rotate: -180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.8, opacity: 0, transition: { duration: 0.25 } }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-center select-none"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-900 text-slate-100 shadow-2xl flex items-center justify-center text-4xl sm:text-5xl rounded-2xl border border-slate-700">
                  ⚽
                </div>
              </motion.div>
            )}

            {phase === 'title' && (
              <motion.div
                key="vertical-title-phase"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, transition: { duration: 0.25 } }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="flex flex-col items-center justify-center space-y-2 select-none"
              >
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase leading-tight">
                  Tourn<span className="text-emerald-400">X</span>
                </h1>

                <div className="inline-block px-3 py-1 bg-emerald-950/80 text-emerald-300 font-semibold text-xs sm:text-sm tracking-wider rounded-full border border-emerald-500/30 lowercase">
                  think.prompt.organise
                </div>
              </motion.div>
            )}

            {phase === 'teams' && (
              <motion.div
                key="vertical-teams-phase"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ duration: 0.35 }}
                className="w-full flex flex-col items-center space-y-1.5 select-none max-w-[260px]"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5 block">
                  DEMO TOURNAMENT CLUBS
                </span>

                <div className="w-full flex flex-col space-y-1.5">
                  {DEMO_TEAMS.map((team, idx) => (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06, duration: 0.25 }}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-left"
                    >
                      <TeamBadge team={team} size="xs" />
                      <span className="font-bold text-xs text-white uppercase tracking-wide truncate">
                        {team.name}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
