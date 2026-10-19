import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FastForward, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { playArcadeBootChime, isArcadeAudioEnabled, setArcadeAudioEnabled } from '../utils/arcadeAudio';

interface OpeningAnimationProps {
  onComplete: () => void;
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({ onComplete }) => {
  // Default audio to ON
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [browserBlockedAudio, setBrowserBlockedAudio] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [nativePhase, setNativePhase] = useState<'pixels' | 'assemble' | 'impact'>('pixels');

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

    // Safety timeout: if video doesn't end within 11s, finish cleanly
    const safetyTimer = setTimeout(() => {
      handleFinish();
    }, 11000);

    // If video takes more than 1.5s to start, seamlessly switch to 60fps native arcade animation
    const loadTimeout = setTimeout(() => {
      if (!videoReady) {
        console.info('Switching to native high-fps retro arcade animation');
        setFallbackMode(true);
      }
    }, 1500);

    return () => {
      clearTimeout(safetyTimer);
      clearTimeout(loadTimeout);
    };
  }, [handleFinish, prefersReducedMotion, videoReady]);

  // Try playing with audio on load, with fallback if browser blocks unmuted autoplay
  useEffect(() => {
    setArcadeAudioEnabled(true);

    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const attemptPlay = async () => {
      try {
        await video.play();
        setBrowserBlockedAudio(false);
      } catch (err) {
        // Autoplay policy prevented unmuted playback: play muted temporarily and ask for 1 tap
        console.warn('Browser required user gesture for audio autoplay, muting initially:', err);
        video.muted = true;
        setBrowserBlockedAudio(true);
        video.play().catch(() => {});
      }
    };

    attemptPlay();

    // Listen for any user interaction anywhere on the window to immediately unmute audio
    const handleUserInteraction = () => {
      if (videoRef.current) {
        videoRef.current.muted = false;
        videoRef.current.volume = 1.0;
        setSoundEnabled(true);
        setBrowserBlockedAudio(false);
        setArcadeAudioEnabled(true);
      }
    };

    window.addEventListener('pointerdown', handleUserInteraction, { once: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  // Native fallback sequence if video is slow
  useEffect(() => {
    if (!fallbackMode) return;

    playArcadeBootChime();

    const tAssemble = setTimeout(() => setNativePhase('assemble'), 400);
    const tImpact = setTimeout(() => setNativePhase('impact'), 1300);
    const tEnd = setTimeout(() => handleFinish(), 2400);

    return () => {
      clearTimeout(tAssemble);
      clearTimeout(tImpact);
      clearTimeout(tEnd);
    };
  }, [fallbackMode, handleFinish]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    setSoundEnabled(next);
    setArcadeAudioEnabled(next);
    setBrowserBlockedAudio(false);
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
      const current = videoRef.current.currentTime;
      const total = videoRef.current.duration;
      const pct = (current / total) * 100;
      setVideoProgress(Math.min(100, Math.max(0, pct)));

      // If near end (within 0.25s), begin seamless exit so it never hangs or lags
      if (current >= total - 0.25) {
        handleFinish();
      }
    }
  };

  const handleVideoCanPlay = () => {
    setVideoReady(true);
  };

  return (
    <AnimatePresence>
      {!videoEnded && (
        <motion.div
          key="ftm-fullbleed-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
          className="fixed inset-0 z-[99999] w-full h-full bg-[#050806] text-[#f1f5f9] overflow-hidden select-none"
          onClick={() => {
            // Clicking anywhere unmutes if blocked, or can skip if double tapped
            if (browserBlockedAudio && videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.volume = 1.0;
              setBrowserBlockedAudio(false);
              setSoundEnabled(true);
            }
          }}
        >
          {/* Edge-to-Edge Video Player Integrated Directly in Web Canvas */}
          {!fallbackMode && (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden">
              {/* Subtle background glow/grid fill for portrait mobile phone aspect ratio */}
              <div className="absolute inset-0 retro-perspective-grid-container opacity-40 pointer-events-none sm:hidden">
                <div className="retro-horizon-glow" />
                <div className="retro-perspective-grid" />
              </div>

              <video
                ref={videoRef}
                src="/tournx-intro.mp4"
                preload="auto"
                autoPlay
                playsInline
                muted={!soundEnabled}
                onCanPlay={handleVideoCanPlay}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleFinish}
                onError={() => {
                  console.warn('Video error, falling back to native animation');
                  setFallbackMode(true);
                }}
                className="w-full h-full max-w-full max-h-full object-contain pointer-events-none relative z-10"
              />
            </div>
          )}

          {/* High-FPS Native 3D Retro Arcade Animation (Active if fallback triggered or video buffering) */}
          {(fallbackMode || !videoReady) && (
            <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-[#070a08] overflow-hidden px-4">
              {/* 3D Moving Perspective Wireframe Grid */}
              <div className="retro-perspective-grid-container opacity-90">
                <div className="retro-horizon-glow" />
                <div className="retro-perspective-grid" />
              </div>

              {/* Rising Arcade Pixels */}
              <div className="relative z-10 w-full max-w-xs h-28 sm:h-32 flex items-center justify-center">
                {[...Array(20)].map((_, i) => {
                  const delay = (i % 6) * 0.08;
                  const posX = ((i % 5) - 2) * 32;
                  const isLime = i % 3 === 0;

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 80, x: posX, scale: 0.4 }}
                      animate={{
                        opacity: nativePhase === 'impact' ? [0.8, 1, 0] : [0, 0.9, 0.7],
                        y: nativePhase === 'assemble' || nativePhase === 'impact' ? 0 : 30,
                        scale: nativePhase === 'impact' ? 1.3 : 1,
                      }}
                      transition={{ duration: 0.8, delay, ease: 'easeOut' }}
                      className={`absolute w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-[2px] ${
                        isLime ? 'bg-lime-400 shadow-[0_0_10px_#84cc16]' : 'bg-slate-100 shadow-[0_0_6px_#f1f5f9]'
                      }`}
                    />
                  );
                })}

                {/* Main Assembled Wordmark */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{
                    opacity: nativePhase === 'assemble' || nativePhase === 'impact' ? 1 : 0,
                    scale: nativePhase === 'impact' ? [1, 1.06, 1] : 1,
                    y: 0,
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="relative z-10 text-center"
                >
                  <div className="text-3xl sm:text-5xl md:text-6xl font-black font-pixel tracking-wider uppercase text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
                    TOURN<span className="text-lime-400 drop-shadow-[0_0_24px_rgba(132,204,22,0.9)]">X</span>
                  </div>
                </motion.div>
              </div>

              {/* Terminal Subtitle */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{
                  opacity: nativePhase === 'impact' ? 1 : 0,
                  y: nativePhase === 'impact' ? 0 : 6,
                }}
                className="relative z-10 mt-3 inline-block px-3 py-1 rounded-full bg-[#121c15] border border-lime-500/60 text-lime-400 font-mono text-[10px] sm:text-xs font-bold tracking-widest lowercase shadow-[0_0_12px_rgba(132,204,22,0.3)]"
              >
                think.prompt.organise
              </motion.div>
            </div>
          )}

          {/* CRT Scanline & Subtle Vignette across Entire Viewport */}
          <div className="absolute inset-0 pointer-events-none retro-scanlines opacity-25 z-20" />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] z-20" />

          {/* HUD Top Bar: Audio Default ON & Skip Button */}
          <div className="absolute top-3 sm:top-6 left-3 sm:left-8 right-3 sm:right-8 z-30 flex items-center justify-between">
            {/* Audio Toggle (Default ON) */}
            <button
              type="button"
              onClick={toggleSound}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.2 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-mono transition cursor-pointer shadow-lg backdrop-blur-md ${
                soundEnabled
                  ? 'bg-[#121c15]/90 border border-lime-500/70 text-lime-400 shadow-[0_0_12px_rgba(132,204,22,0.25)]'
                  : 'bg-[#0f1411]/90 border border-[#24352b] text-slate-400'
              }`}
              title={soundEnabled ? 'Arcade Audio is ON (Click to mute)' : 'Arcade Audio is Muted (Click to enable)'}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-lime-400 animate-pulse" />
                  <span className="font-bold tracking-wider">AUDIO ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" />
                  <span className="tracking-wider">MUTED</span>
                </>
              )}
            </button>

            {/* Click Anywhere to Unmute Hint (Only shown if browser blocked unmuted autoplay) */}
            {browserBlockedAudio && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-lime-950/80 border border-lime-500/60 rounded-full text-[11px] font-mono text-lime-300 animate-pulse cursor-pointer"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = 1.0;
                    setBrowserBlockedAudio(false);
                    setSoundEnabled(true);
                  }
                }}
              >
                <Sparkles className="w-3 h-3 text-lime-400" />
                <span>TAP ANYWHERE FOR SOUND</span>
              </motion.div>
            )}

            {/* SKIP Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleFinish();
              }}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.2 sm:py-1.5 bg-[#0f1411]/90 hover:bg-[#151e18] border border-[#24352b] hover:border-lime-500/60 rounded-lg text-[11px] sm:text-xs font-mono text-slate-200 hover:text-white transition cursor-pointer shadow-lg backdrop-blur-md"
            >
              <span className="font-bold tracking-wider">SKIP</span>
              <FastForward className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-lime-400" />
            </button>
          </div>

          {/* Bottom Sleek Integrated Progress Line */}
          <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 max-w-lg mx-auto z-30">
            <div className="w-full bg-[#141d18]/80 border border-[#233529] h-1.5 rounded-full overflow-hidden p-0.25 shadow-md">
              <div
                style={{ width: `${fallbackMode ? 100 : videoProgress}%` }}
                className="h-full bg-lime-400 rounded-full shadow-[0_0_8px_#84cc16] transition-all duration-150 ease-out"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 mt-1 px-1">
              <span>TOURNX // MOBILE OS</span>
              <span>{fallbackMode ? '100%' : `${Math.round(videoProgress)}%`}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


