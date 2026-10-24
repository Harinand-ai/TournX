import React from 'react';

interface PitchIllustration3DProps {
  className?: string;
  variant?: 'compact' | 'standard';
}

export const PitchIllustration3D: React.FC<PitchIllustration3DProps> = ({
  className = '',
  variant = 'standard'
}) => {
  const isCompact = variant === 'compact';

  return (
    <div 
      className={`relative w-full overflow-hidden rounded-2xl bg-[#0d1610] border border-[#1e3425] shadow-lg flex items-center justify-center select-none ${
        isCompact ? 'h-32' : 'h-44 sm:h-52'
      } ${className}`}
      style={{ perspective: '800px' }}
      aria-hidden="true"
    >
      {/* Stadium Floodlight Ambiance Glow */}
      <div className="absolute inset-0 bg-radial from-emerald-600/15 via-[#0e1d13]/60 to-[#09110c] pointer-events-none" />

      {/* 3D Angled Pitch Canvas */}
      <div 
        className="relative w-[92%] sm:w-[84%] h-[82%] rounded-xl overflow-hidden shadow-2xl border-2 border-emerald-500/30 transition-transform duration-700 ease-out hover:rotate-x-[26deg]"
        style={{
          transform: 'rotateX(30deg) translateZ(0)',
          transformOrigin: '50% 100%',
          background: 'linear-gradient(to bottom, #133a22 0%, #174d2c 50%, #123720 100%)',
        }}
      >
        {/* Alternating Pitch Grass Stripes */}
        <div className="absolute inset-0 flex flex-col opacity-25">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 ${i % 2 === 0 ? 'bg-black/25' : 'bg-white/10'}`} 
            />
          ))}
        </div>

        {/* Pitch Field Markings (SVG overlay) */}
        <svg 
          className="absolute inset-0 w-full h-full stroke-emerald-300/40 fill-none" 
          strokeWidth="1.5"
          viewBox="0 0 100 65" 
          preserveAspectRatio="none"
        >
          {/* Outer Boundary */}
          <rect x="3" y="3" width="94" height="59" rx="1" />

          {/* Halfway Line */}
          <line x1="50" y1="3" x2="50" y2="62" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="32.5" r="9" />
          <circle cx="50" cy="32.5" r="0.8" className="fill-emerald-300/60" />

          {/* Left Penalty Area & Goal Area */}
          <rect x="3" y="15" width="16" height="35" />
          <rect x="3" y="23" width="6" height="19" />
          <path d="M 19 26 A 7 7 0 0 1 19 39" />
          <circle cx="12" cy="32.5" r="0.6" className="fill-emerald-300/60" />

          {/* Right Penalty Area & Goal Area */}
          <rect x="81" y="15" width="16" height="35" />
          <rect x="91" y="23" width="6" height="19" />
          <path d="M 81 26 A 7 7 0 0 0 81 39" />
          <circle cx="88" cy="32.5" r="0.6" className="fill-emerald-300/60" />

          {/* Corner Arcs */}
          <path d="M 3 6 A 3 3 0 0 0 6 3" />
          <path d="M 3 59 A 3 3 0 0 1 6 62" />
          <path d="M 97 6 A 3 3 0 0 1 94 3" />
          <path d="M 97 59 A 3 3 0 0 0 94 62" />
        </svg>

        {/* Subtle Pitch Sunlight Highlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15 pointer-events-none" />
      </div>

      {/* Floating Tactical Depth Header */}
      <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[11px] text-emerald-300/90 font-sans tracking-wide">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Official Match Pitch
        </span>
        <span className="text-slate-400 text-[10px]">
          Fifa Standard 11v11 / 7v7 / 5v5 Geometry
        </span>
      </div>
    </div>
  );
};
