import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Volume2, VolumeX } from 'lucide-react';
import { isArcadeAudioEnabled, setArcadeAudioEnabled } from '../utils/arcadeAudio';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => isArcadeAudioEnabled());
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      localStorage.setItem('ftm_intro_seen', 'true');
      sessionStorage.setItem('ftm_dev_intro_played_session', 'true');
    } catch {}
    setVideoEnded(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  // Reduced motion detection
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (prefersReducedMotion) {
      handleFinish();
      return;
    }

    // Safety timeout: if video fails to report ended after 12s, automatically finish
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 12000);

    return () => clearTimeout(safetyTimer);
  }, [handleFinish, prefersReducedMotion]);

  // Handle sound toggle
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    setArcadeAudioEnabled(next);
    if (videoRef.current) {
      videoRef.current.muted = !next;
      if (next) {
        videoRef.current.volume = 1.0;
        videoRef.current.play().catch(() => {});
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setVideoProgress(Math.min(100, Math.max(0, pct)));
    }
  };

  const handleVideoCanPlay = () => {
    setHasStarted(true);
    if (videoRef.current) {
      videoRef.current.muted = !soundEnabled;
      videoRef.current.play().catch((err) => {
        console.warn('Autoplay with sound prevented, muting:', err);
        if (videoRef.current) {
          videoRef.current.muted = true;
          setSoundEnabled(false);
          videoRef.current.play().catch(() => {});
        }
      });
    }
  };

  return (
    <AnimatePresence>
      {!videoEnded && (
        <motion.div
          key="ftm-gemini-video-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#050806] text-[#f1f5f9] overflow-hidden select-none"
        >
          {/* CRT Scanline & Grid Background */}
          <div className="absolute inset-0 pointer-events-none retro-scanlines opacity-30 z-20" />
          <div className="absolute inset-0 pointer-events-none retro-dot-grid opacity-20 z-20" />

          {/* Top Controls: Sound Toggle & Skip */}
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between max-w-4xl mx-auto px-2">
            <button
              type="button"
              onClick={toggleSound}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1411]/90 hover:bg-[#151e18] border border-[#24352b] rounded-lg text-xs font-mono text-slate-300 transition cursor-pointer shadow-lg backdrop-blur-xs"
              title={soundEnabled ? 'Mute arcade sound' : 'Enable arcade sound'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-[11px] text-lime-400 font-bold">Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] text-slate-400">Unmute Sound</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#0f1411]/80 border border-[#24352b] rounded-full text-[11px] font-mono text-lime-400/80">
              <span className="inline-block w-2 h-2 rounded-full bg-lime-400 animate-pulse" />
              <span>TOURNX // INTRO SEQUENCE</span>
            </div>

            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0f1411]/90 hover:bg-[#151e18] border border-[#24352b] hover:border-lime-500/60 rounded-lg text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer shadow-lg backdrop-blur-xs"
            >
              <span className="text-[11px] font-bold">SKIP</span>
              <FastForward className="w-3.5 h-3.5 text-lime-400" />
            </button>
          </div>

          {/* Center Video Container */}
          <div className="relative z-10 w-full max-w-4xl h-full max-h-[85vh] flex items-center justify-center p-2 sm:p-6">
            {!videoError ? (
              <div className="relative w-full h-full flex items-center justify-center rounded-2xl overflow-hidden border border-lime-900/40 shadow-[0_0_50px_rgba(34,197,94,0.15)] bg-black">
                <video
                  ref={videoRef}
                  src="/tournx-intro.mp4"
                  autoPlay
                  playsInline
                  muted={!soundEnabled}
                  onCanPlay={handleVideoCanPlay}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleFinish}
                  onError={() => {
                    console.warn('Video failed to load, falling back...');
                    setVideoError(true);
                    setTimeout(handleFinish, 2000);
                  }}
                  className="w-full h-full object-contain max-h-[80vh]"
                />

                {/* Subtle edge vignette */}
                <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.8)]" />
              </div>
            ) : (
              /* Fallback in case video format is unsupported on client */
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="text-4xl font-black font-pixel tracking-wider uppercase text-white mb-3">
                  TOURN<span className="text-lime-400">X</span>
                </div>
                <div className="text-xs font-mono text-lime-400 tracking-widest uppercase">
                  think.prompt.organise
                </div>
              </div>
            )}
          </div>

          {/* Bottom Loading / Progress Bar */}
          <div className="absolute bottom-5 left-0 right-0 max-w-md mx-auto px-6 z-30">
            <div className="w-full bg-[#141d18]/90 border border-[#233529] h-2 rounded-full overflow-hidden p-0.5 shadow-md">
              <div
                style={{ width: `${videoProgress}%` }}
                className="h-full bg-lime-400 rounded-full shadow-[0_0_10px_#84cc16] transition-all duration-150 ease-out"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1.5 px-0.5">
              <span>INITIALIZING TOURNX OS</span>
              <span>{Math.round(videoProgress)}%</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

