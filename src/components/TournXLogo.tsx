import React from 'react';

interface TournXLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const TournXLogo: React.FC<TournXLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const sizeStyles = {
    sm: {
      emblem: 'w-6 h-6',
      svg: 24,
      title: 'text-base',
      tagline: 'text-[9px] tracking-wider',
      gap: 'gap-2',
    },
    md: {
      emblem: 'w-8 h-8',
      svg: 32,
      title: 'text-xl',
      tagline: 'text-[10px] tracking-widest',
      gap: 'gap-2.5',
    },
    lg: {
      emblem: 'w-11 h-11',
      svg: 44,
      title: 'text-3xl sm:text-4xl',
      tagline: 'text-xs tracking-widest',
      gap: 'gap-3.5',
    },
  };

  const s = sizeStyles[size];

  return (
    <div className={`inline-flex items-center ${s.gap} select-none ${className}`}>
      {/* Precision Aerodynamic Emblem Mark */}
      <div className={`relative ${s.emblem} rounded-lg bg-gradient-to-br from-[#21191D] via-[#19191F] to-[#101013] border border-[#F02D50]/50 shadow-[0_2px_12px_rgba(240,45,80,0.35)] flex items-center justify-center shrink-0 overflow-hidden`}>
        {/* Subtle Specular Top Highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#F0E9E7]/50 to-transparent" />
        
        {/* Emblem Glyph */}
        <svg viewBox="0 0 40 40" className="w-3/4 h-3/4" fill="none">
          {/* T glyph */}
          <path
            d="M8 10 H32 V15 H23 V32 H17 V15 H8 Z"
            fill="#F0E9E7"
          />
          {/* Vivid Crimson X slash */}
          <path
            d="M21 16 L31 32 H26 L17 19 Z"
            fill="#F02D50"
            style={{ filter: 'drop-shadow(0 1px 4px rgba(240,45,80,0.75))' }}
          />
        </svg>
      </div>

      {/* Italicized Brand Wordmark & Restrained Sub-tag */}
      <div className="flex flex-col">
        <span className={`font-display font-black italic tracking-tight text-[#F0E9E7] leading-none ${s.title}`}>
          Tourn<span className="text-[#F02D50]">X</span>
        </span>
        {showTagline && (
          <span className={`font-mono text-[#A5A1A4] uppercase font-semibold mt-1 leading-none ${s.tagline}`}>
            think • prompt • organise
          </span>
        )}
      </div>
    </div>
  );
};
