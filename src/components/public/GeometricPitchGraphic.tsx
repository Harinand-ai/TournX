import React from 'react';

interface GeometricPitchGraphicProps {
  homeTeamName?: string;
  awayTeamName?: string;
  format?: string;
  venue?: string;
  className?: string;
}

export const GeometricPitchGraphic: React.FC<GeometricPitchGraphicProps> = ({
  homeTeamName = 'HOME',
  awayTeamName = 'AWAY',
  format = 'Standard',
  venue,
  className = '',
}) => {
  return (
    <div className={`relative w-full overflow-hidden border-2 border-[#2F384C] bg-[#12151D] shadow-[3px_3px_0px_#0A0D14] p-3 ${className}`}>
      {/* Retro Header Strip */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b-2 border-[#222938] text-[10px] font-pixel text-[#94A3B8]">
        <div className="flex items-center gap-1.5 text-[#38B264]">
          <span className="w-2 h-2 bg-[#38B264] inline-block shadow-[1px_1px_0px_#000]" />
          <span className="tracking-wider uppercase">PITCH GEOMETRY • {format}</span>
        </div>
        {venue && (
          <div className="text-[#64748B] truncate max-w-[200px]">
            [LOC: {venue}]
          </div>
        )}
      </div>

      {/* The Block Retro Pitch */}
      <div className="relative w-full aspect-[2/1] min-h-[160px] max-h-[220px] bg-[#193322] border-2 border-[#38B264]/60 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Subtle Voxel/Block Grass Striping */}
        <div className="absolute inset-0 flex">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-full ${i % 2 === 0 ? 'bg-[#1D3B27]/90' : 'bg-[#183221]/90'}`}
            />
          ))}
        </div>

        {/* Pitch Markings (SVG overlay with geometric 2px pixel strokes) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 600 300"
          preserveAspectRatio="none"
        >
          {/* Outer Boundary */}
          <rect
            x="20"
            y="15"
            width="560"
            height="270"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.75"
          />

          {/* Halfway Line */}
          <line
            x1="300"
            y1="15"
            x2="300"
            y2="285"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.75"
          />

          {/* Center Circle */}
          <circle
            cx="300"
            cy="150"
            r="48"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.75"
          />
          {/* Center Spot */}
          <rect x="298" y="148" width="4" height="4" fill="#4ADE80" />

          {/* Left Penalty Area */}
          <rect
            x="20"
            y="65"
            width="90"
            height="170"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.75"
          />
          {/* Left Goal Area */}
          <rect
            x="20"
            y="105"
            width="35"
            height="90"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.6"
          />
          {/* Left Penalty Spot */}
          <rect x="75" y="148" width="4" height="4" fill="#4ADE80" />
          {/* Left Goal Cage Bracket */}
          <rect
            x="8"
            y="118"
            width="12"
            height="64"
            fill="#122417"
            stroke="#E2E8F0"
            strokeWidth="2"
          />

          {/* Right Penalty Area */}
          <rect
            x="490"
            y="65"
            width="90"
            height="170"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.75"
          />
          {/* Right Goal Area */}
          <rect
            x="545"
            y="105"
            width="35"
            height="90"
            fill="none"
            stroke="#4ADE80"
            strokeWidth="2"
            strokeOpacity="0.6"
          />
          {/* Right Penalty Spot */}
          <rect x="521" y="148" width="4" height="4" fill="#4ADE80" />
          {/* Right Goal Cage Bracket */}
          <rect
            x="580"
            y="118"
            width="12"
            height="64"
            fill="#122417"
            stroke="#E2E8F0"
            strokeWidth="2"
          />
        </svg>

        {/* Team Half Banners inside the Pitch */}
        <div className="absolute inset-0 flex items-center justify-between px-8 sm:px-14 z-10 pointer-events-none">
          {/* Home Team Token */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0F172A] border-2 border-[#38B264] flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <span className="font-pixel text-[11px] sm:text-xs text-[#38B264] font-bold">H</span>
            </div>
            <span className="font-pixel text-[9px] sm:text-[10px] text-white bg-[#0A0D14]/80 px-1.5 py-0.5 border border-[#38B264]/40 shadow-xs max-w-[110px] truncate text-center">
              {homeTeamName}
            </span>
          </div>

          {/* Away Team Token */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0F172A] border-2 border-[#FFC700] flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <span className="font-pixel text-[11px] sm:text-xs text-[#FFC700] font-bold">A</span>
            </div>
            <span className="font-pixel text-[9px] sm:text-[10px] text-white bg-[#0A0D14]/80 px-1.5 py-0.5 border border-[#FFC700]/40 shadow-xs max-w-[110px] truncate text-center">
              {awayTeamName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
