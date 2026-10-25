import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface TournXEmblem3DProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  className?: string;
  showAura?: boolean;
}

export const TournXEmblem3D: React.FC<TournXEmblem3DProps> = ({
  size = 'md',
  interactive = true,
  className = '',
  showAura = true,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  // Dimension mapping
  const sizeMap = {
    sm: { container: 'w-12 h-12', emblem: 48, scale: 0.5 },
    md: { container: 'w-20 h-20 sm:w-24 sm:h-24', emblem: 96, scale: 0.8 },
    lg: { container: 'w-28 h-28 sm:w-36 sm:h-36', emblem: 144, scale: 1.1 },
    xl: { container: 'w-40 h-40 sm:w-48 sm:h-48', emblem: 192, scale: 1.4 },
  };

  const currentSize = sizeMap[size];

  // Motion values for smooth interactive 3D rotation
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 200, mass: 0.5 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [18, -18]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-22, 22]), springConfig);
  const glareX = useTransform(mouseX, [-0.5, 0.5], ['0%', '100%']);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || shouldReduceMotion) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={cardRef}
      onPointerMove={handleMouseMove}
      onPointerLeave={handleMouseLeave}
      className={`relative select-none flex items-center justify-center ${currentSize.container} ${className}`}
      style={{ perspective: 1000 }}
    >
      {/* Dynamic Ambient Crimson & Burgundy Glow */}
      {showAura && (
        <div className="absolute inset-0 -m-3 sm:-m-4 bg-gradient-to-tr from-[#991B35]/25 via-[#F02D50]/20 to-transparent rounded-full blur-2xl pointer-events-none transition-opacity duration-500" />
      )}

      {/* 3D Rotating Crest Container */}
      <motion.div
        style={{
          rotateX: shouldReduceMotion ? 0 : rotateX,
          rotateY: shouldReduceMotion ? 0 : rotateY,
          transformStyle: 'preserve-3d',
        }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Layer 1: Back Drop Plate (Extrusion illusion) */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-[#09090C] border border-[#21191D]"
          style={{
            transform: 'translateZ(-14px)',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.85), 0 0 30px rgba(240, 45, 80,0.18)',
          }}
        />

        {/* Layer 2: Middle Burgundy Core Facet */}
        <div
          className="absolute inset-0.5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#2B1B22] via-[#1C171A] to-[#121216] border border-[#F02D50]/30"
          style={{
            transform: 'translateZ(-6px)',
          }}
        />

        {/* Layer 3: Front Architectural Crest Face with Chamfered Crimson Rim */}
        <div
          className="relative w-full h-full rounded-2xl sm:rounded-3xl p-2 sm:p-2.5 overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#1C1920] via-[#141419] to-[#0E0E12] border-2 border-[#F02D50]/60 shadow-[inset_0_1px_1px_rgba(240,233,231,0.25),inset_0_-2px_4px_rgba(0,0,0,0.8)]"
          style={{
            transform: 'translateZ(10px)',
          }}
        >
          {/* Subtle Football / Stadium Pitch Isogrid Texture */}
          <svg
            className="absolute inset-0 w-full h-full opacity-15 pointer-events-none stroke-[#F0E9E7]"
            strokeWidth="0.5"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="50" r="38" strokeDasharray="3 3" />
            <line x1="50" y1="12" x2="50" y2="88" strokeWidth="0.75" />
            <polygon points="50,22 66,34 66,56 50,68 34,56 34,34" />
          </svg>

          {/* Dynamic Light Specular Sweep */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay transition-opacity"
            style={{
              background: 'radial-gradient(circle at 40% 30%, rgba(240, 233, 231, 0.45) 0%, rgba(240, 45, 80, 0.15) 40%, transparent 70%)',
            }}
          />

          {/* The Distinctive TournX Monogram: 3D Interlocking "T" and Crimson "X" */}
          <svg
            viewBox="0 0 80 80"
            className="w-4/5 h-4/5 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Monogram T: Bold Soft Silver with Metallic Bevel */}
            <path
              d="M18 20 C18 17.8 19.8 16 22 16 H58 C60.2 16 62 17.8 62 20 V25 C62 26.1 61.1 27 60 27 H45 V60 C45 62.2 43.2 64 41 64 H35 C32.8 64 31 62.2 31 60 V27 H20 C18.9 27 18 26.1 18 25 Z"
              fill="url(#silverGradient)"
            />
            {/* T Top Bevel Highlight */}
            <path
              d="M20 18 H60 V22 H20 Z"
              fill="rgba(255, 255, 255, 0.35)"
            />

            {/* Aerodynamic Crimson "X": Intersecting with 3D Depth */}
            <g style={{ filter: 'drop-shadow(0 2px 6px rgba(240, 45, 80, 0.6))' }}>
              {/* Back stroke of X */}
              <path
                d="M40 32 L58 56 C59.2 57.6 61.5 58 63 56.8 L65 55.2 C66.2 54 66.2 52 65 50.5 L48 28 Z"
                fill="url(#crimsonDeepGradient)"
              />
              {/* Foreground stroke of X (Dominant Crimson Blade) */}
              <path
                d="M44 26 L66 54 C67.2 55.5 67 57.5 65.5 58.8 L63.5 60.5 C62 61.8 59.8 61.5 58.5 60 L36 32 C35 30.8 35.2 29 36.5 28 L39.5 25.5 C40.8 24.5 42.8 24.8 44 26 Z"
                fill="url(#crimsonBrightGradient)"
              />
              {/* Diamond Center Accent */}
              <polygon
                points="52,43 56,40 52,37 48,40"
                fill="#FFFFFF"
                opacity="0.8"
              />
            </g>

            {/* Gradients */}
            <defs>
              <linearGradient id="silverGradient" x1="18" y1="16" x2="62" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#F0E9E7" />
                <stop offset="100%" stopColor="#B3ACA9" />
              </linearGradient>

              <linearGradient id="crimsonBrightGradient" x1="36" y1="24" x2="67" y2="61" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FF4A6B" />
                <stop offset="50%" stopColor="#F02D50" />
                <stop offset="100%" stopColor="#991B35" />
              </linearGradient>

              <linearGradient id="crimsonDeepGradient" x1="40" y1="28" x2="66" y2="58" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#F02D50" />
                <stop offset="100%" stopColor="#6E0E22" />
              </linearGradient>
            </defs>
          </svg>

          {/* Hairline Rim Specular Glint */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#F0E9E7]/40 to-transparent" />
        </div>
      </motion.div>
    </div>
  );
};
