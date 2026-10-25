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
      className={`relative w-full overflow-hidden rounded-2xl bg-[#141419] border border-white/10 shadow-2xl flex items-center justify-center select-none ${
        isCompact ? 'h-32' : 'h-44 sm:h-52'
      } ${className}`}
      style={{ perspective: '900px' }}
      aria-hidden="true"
    >
      {/* Stadium Atmosphere & Crimson Perimeter Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(33,25,29,0.8)_0%,_rgba(25,25,31,0.6)_50%,_#101013_100%)] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-[#F02D50]/15 to-transparent pointer-events-none" />

      {/* 3D Angled Pitch Canvas with Hardware-Accelerated Perspective Tilt */}
      <div 
        className="relative w-[92%] sm:w-[84%] h-[82%] rounded-xl overflow-hidden border border-[#F02D50]/35 shadow-[0_16px_36px_rgba(0,0,0,0.8),0_0_20px_rgba(240, 45, 80,0.15)] transition-transform duration-700 ease-out hover:rotate-x-[24deg]"
        style={{
          transform: 'rotateX(28deg) translateZ(0)',
          transformOrigin: '50% 100%',
          background: 'linear-gradient(to bottom, #1D1C22 0%, #17161C 50%, #121216 100%)',
        }}
      >
        {/* Alternating Architectural Pitch Mowing Stripes */}
        <div className="absolute inset-0 flex flex-col opacity-30">
          {Array.from({ length: 8 }).map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 ${i % 2 === 0 ? 'bg-black/35' : 'bg-white/5'}`} 
            />
          ))}
        </div>

        {/* Pitch Field Markings (SVG overlay with Soft Silver Lines) */}
        <svg 
          className="absolute inset-0 w-full h-full stroke-[#F0E9E7]/40 fill-none" 
          strokeWidth="1.25"
          viewBox="0 0 100 65" 
          preserveAspectRatio="none"
        >
          {/* Outer Boundary */}
          <rect x="3" y="3" width="94" height="59" rx="1" />

          {/* Halfway Line */}
          <line x1="50" y1="3" x2="50" y2="62" />

          {/* Center Circle & Spot */}
          <circle cx="50" cy="32.5" r="9" />
          <circle cx="50" cy="32.5" r="0.8" className="fill-[#F02D50]" stroke="none" />

          {/* Left Penalty Area & Goal Area */}
          <rect x="3" y="15" width="16" height="35" />
          <rect x="3" y="23" width="6" height="19" />
          <path d="M 19 26 A 7 7 0 0 1 19 39" />
          <circle cx="12" cy="32.5" r="0.6" className="fill-[#F0E9E7]/80" stroke="none" />

          {/* Right Penalty Area & Goal Area */}
          <rect x="81" y="15" width="16" height="35" />
          <rect x="91" y="23" width="6" height="19" />
          <path d="M 81 26 A 7 7 0 0 0 81 39" />
          <circle cx="88" cy="32.5" r="0.6" className="fill-[#F0E9E7]/80" stroke="none" />

          {/* Corner Arcs */}
          <path d="M 3 6 A 3 3 0 0 0 6 3" />
          <path d="M 3 59 A 3 3 0 0 1 6 62" />
          <path d="M 97 6 A 3 3 0 0 1 94 3" />
          <path d="M 97 59 A 3 3 0 0 0 94 62" />
        </svg>

        {/* Ambient Specular Glass Sheen */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#F0E9E7]/5 to-[#F02D50]/10 pointer-events-none" />
      </div>

      {/* Tactical Stadium Footnote */}
      <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[11px] text-[#A5A1A4] font-mono tracking-wide">
        <span className="flex items-center gap-1.5 text-[#F0E9E7]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#F02D50] animate-pulse" />
          Match Pitch Canvas
        </span>
        <span className="text-[#A5A1A4] text-[10px]">
          FIFA Standard 11v11 / 7v7 / 5v5 Geometry
        </span>
      </div>
    </div>
  );
};
