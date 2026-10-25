import React, { useState, useMemo } from 'react';
import { Ruler, Sparkles, Layers, Check, AlertCircle, RotateCcw, Info, Box } from 'lucide-react';
import { PitchCanvas3D } from '../three/PitchCanvas3D';

export type FootballPitchFormat =
  | '5-a-side'
  | '6-a-side'
  | '7-a-side'
  | '8-a-side'
  | '9-a-side'
  | '11-a-side';

export type FootballGroundFormat = FootballPitchFormat;

export interface GroundFormatSpec {
  format: FootballPitchFormat;
  label: string;
  source: string;
  isMandatoryStandard: boolean;
  standardLength: number; // in meters
  standardWidth: number; // in meters
  minLength: number;
  maxLength: number;
  minWidth: number;
  maxWidth: number;
  penaltyShape: 'SEMI_CIRCLE' | 'RECTANGLE';
  penaltyDepth: number; // meters from goal line
  penaltyWidth: number; // meters total width
  goalAreaDepth?: number;
  goalAreaWidth?: number;
  centerCircleRadius: number;
  penaltySpotDistance: number;
  hasPenaltyArc: boolean;
  goalWidthMeters: number;
  goalHeightMeters: number;
  notes: string;
}

export const GROUND_FORMAT_SPECS: Record<FootballPitchFormat, GroundFormatSpec> = {
  '5-a-side': {
    format: '5-a-side',
    label: '5-a-side (Small-Sided / Futsal)',
    source: 'The Football Association (The FA) Small-Sided Guide & Futsal Regulations',
    isMandatoryStandard: false,
    standardLength: 36.5,
    standardWidth: 27.5,
    minLength: 30.0,
    maxLength: 40.0,
    minWidth: 20.0,
    maxWidth: 30.0,
    penaltyShape: 'SEMI_CIRCLE',
    penaltyDepth: 6.0,
    penaltyWidth: 12.0,
    centerCircleRadius: 3.0,
    penaltySpotDistance: 6.0,
    hasPenaltyArc: false,
    goalWidthMeters: 3.66,
    goalHeightMeters: 1.22,
    notes: 'Semi-circular D-zone (6m radius). No offsides. Typical goalposts are 12ft × 4ft (3.66m × 1.22m) or 3m × 2m for international futsal.',
  },
  '6-a-side': {
    format: '6-a-side',
    label: '6-a-side Commercial & College League',
    source: 'The FA Small-Sided Guidelines & UK Commercial League Standards',
    isMandatoryStandard: false,
    standardLength: 45.0,
    standardWidth: 30.0,
    minLength: 40.0,
    maxLength: 50.0,
    minWidth: 25.0,
    maxWidth: 35.0,
    penaltyShape: 'SEMI_CIRCLE',
    penaltyDepth: 7.5,
    penaltyWidth: 15.0,
    centerCircleRadius: 4.5,
    penaltySpotDistance: 7.0,
    hasPenaltyArc: false,
    goalWidthMeters: 3.66,
    goalHeightMeters: 1.83,
    notes: 'Usually played with a 7.5m D-area or rectangular box. Goals are typically 12ft × 6ft.',
  },
  '7-a-side': {
    format: '7-a-side',
    label: '7-a-side (Mini-Soccer & Community League)',
    source: 'The Football Association (The FA) Pitch Guidance for 7v7',
    isMandatoryStandard: false,
    standardLength: 55.0,
    standardWidth: 37.0,
    minLength: 50.0,
    maxLength: 60.0,
    minWidth: 30.0,
    maxWidth: 40.0,
    penaltyShape: 'RECTANGLE',
    penaltyDepth: 9.0,
    penaltyWidth: 18.0,
    centerCircleRadius: 6.0,
    penaltySpotDistance: 7.0,
    hasPenaltyArc: false,
    goalWidthMeters: 3.66,
    goalHeightMeters: 1.83,
    notes: 'Rectangular penalty area 9m (10 yds) from goal line, 18m wide. Goals are 12ft × 6ft or 16ft × 6ft.',
  },
  '8-a-side': {
    format: '8-a-side',
    label: '8-a-side (Intermediate & Amateur League)',
    source: 'European Amateur Football & Regional College Regulations',
    isMandatoryStandard: false,
    standardLength: 64.0,
    standardWidth: 42.0,
    minLength: 60.0,
    maxLength: 70.0,
    minWidth: 38.0,
    maxWidth: 48.0,
    penaltyShape: 'RECTANGLE',
    penaltyDepth: 11.0,
    penaltyWidth: 22.0,
    centerCircleRadius: 7.0,
    penaltySpotDistance: 8.0,
    hasPenaltyArc: false,
    goalWidthMeters: 4.88,
    goalHeightMeters: 2.13,
    notes: 'Balanced mid-size ground. Rectangular box 11m deep. 16ft × 7ft goal frame.',
  },
  '9-a-side': {
    format: '9-a-side',
    label: '9-a-side (FA Youth & Junior Standard)',
    source: 'The FA Standard Code of Rules for Youth (9v9 U11/U12)',
    isMandatoryStandard: false,
    standardLength: 73.0,
    standardWidth: 46.0,
    minLength: 65.0,
    maxLength: 75.0,
    minWidth: 40.0,
    maxWidth: 50.0,
    penaltyShape: 'RECTANGLE',
    penaltyDepth: 13.0,
    penaltyWidth: 32.0,
    goalAreaDepth: 4.0,
    goalAreaWidth: 13.0,
    centerCircleRadius: 7.0,
    penaltySpotDistance: 9.0,
    hasPenaltyArc: false,
    goalWidthMeters: 4.88,
    goalHeightMeters: 2.13,
    notes: 'The FA specified youth format bridge between mini-soccer and full 11v11. Includes 13m penalty box and goal area.',
  },
  '11-a-side': {
    format: '11-a-side',
    label: '11-a-side (IFAB / FIFA Standard)',
    source: 'IFAB Laws of the Game (Law 1) & FIFA Stadium Technical Guidelines',
    isMandatoryStandard: true,
    standardLength: 105.0,
    standardWidth: 68.0,
    minLength: 90.0,
    maxLength: 120.0,
    minWidth: 45.0,
    maxWidth: 90.0,
    penaltyShape: 'RECTANGLE',
    penaltyDepth: 16.5, // 18 yards
    penaltyWidth: 40.32, // 44 yards
    goalAreaDepth: 5.5, // 6 yards
    goalAreaWidth: 18.32, // 20 yards
    centerCircleRadius: 9.15, // 10 yards
    penaltySpotDistance: 11.0, // 12 yards
    hasPenaltyArc: true,
    goalWidthMeters: 7.32, // 8 yards
    goalHeightMeters: 2.44, // 8 feet
    notes: 'FIFA International Match mandatory standard: 105m × 68m (344ft × 223ft). Standard range 90-120m by 45-90m. Features 18-yard penalty box, 6-yard goal box, and 9.15m D-arc.',
  },
};

const METERS_TO_FEET = 3.28084;

interface FootballGroundOverviewProps {
  initialFormat?: FootballPitchFormat;
  onDimensionsChanged?: (dimensions: { lengthMeters: number; widthMeters: number; format: string }) => void;
  className?: string;
}

export const FootballGroundOverview: React.FC<FootballGroundOverviewProps> = ({
  initialFormat = '11-a-side',
  onDimensionsChanged,
  className = '',
}) => {
  const [selectedFormat, setSelectedFormat] = useState<FootballPitchFormat>(initialFormat);
  const [unit, setUnit] = useState<'METERS' | 'FEET'>('METERS');
  const [viewMode, setViewMode] = useState<'2D_PLAN' | '3D_STADIUM'>('2D_PLAN');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const spec = GROUND_FORMAT_SPECS[selectedFormat];

  // Length and Width in meters
  const [lengthMeters, setLengthMeters] = useState<number>(spec.standardLength);
  const [widthMeters, setWidthMeters] = useState<number>(spec.standardWidth);
  const [validationError, setValidationError] = useState<string | null>(null);

  // When format changes, update defaults
  const handleFormatSelect = (fmt: FootballPitchFormat) => {
    setSelectedFormat(fmt);
    const newSpec = GROUND_FORMAT_SPECS[fmt];
    setLengthMeters(newSpec.standardLength);
    setWidthMeters(newSpec.standardWidth);
    setIsCustom(false);
    setValidationError(null);
    if (onDimensionsChanged) {
      onDimensionsChanged({
        lengthMeters: newSpec.standardLength,
        widthMeters: newSpec.standardWidth,
        format: fmt,
      });
    }
  };

  const handleResetToStandard = () => {
    setLengthMeters(spec.standardLength);
    setWidthMeters(spec.standardWidth);
    setIsCustom(false);
    setValidationError(null);
    if (onDimensionsChanged) {
      onDimensionsChanged({
        lengthMeters: spec.standardLength,
        widthMeters: spec.standardWidth,
        format: selectedFormat,
      });
    }
  };

  const handleLengthChange = (val: number) => {
    setIsCustom(true);
    setLengthMeters(val);
    if (val <= widthMeters) {
      setValidationError('Sensible pitch validation error: Pitch length must exceed width (touchline > goal line).');
    } else {
      setValidationError(null);
      if (onDimensionsChanged) {
        onDimensionsChanged({ lengthMeters: val, widthMeters, format: selectedFormat });
      }
    }
  };

  const handleWidthChange = (val: number) => {
    setIsCustom(true);
    setWidthMeters(val);
    if (lengthMeters <= val) {
      setValidationError('Sensible pitch validation error: Pitch length must exceed width (touchline > goal line).');
    } else {
      setValidationError(null);
      if (onDimensionsChanged) {
        onDimensionsChanged({ lengthMeters, widthMeters: val, format: selectedFormat });
      }
    }
  };

  // Convert for display
  const displayLength = unit === 'METERS' ? lengthMeters.toFixed(1) : (lengthMeters * METERS_TO_FEET).toFixed(1);
  const displayWidth = unit === 'METERS' ? widthMeters.toFixed(1) : (widthMeters * METERS_TO_FEET).toFixed(1);
  const unitLabel = unit === 'METERS' ? 'm' : 'ft';

  // Proportional SVG geometry calculation
  // We normalize to a virtual SVG canvas of 800 width (X) plus margins for dimension callouts
  const padX = 65;
  const padY = 55;
  const pitchW = 720; // SVG pixels for length (X axis)
  // Proportional pitch height based on exact aspect ratio
  const pitchH = Math.max(260, Math.min(540, Math.round(pitchW * (widthMeters / (lengthMeters || 105)))));
  const svgTotalW = pitchW + padX * 2;
  const svgTotalH = pitchH + padY * 2;

  // Scale factor: SVG units per meter
  const scale = pitchW / lengthMeters;

  // Markings in SVG coordinates
  const pDepth = spec.penaltyDepth * scale;
  const pWidth = spec.penaltyWidth * scale;
  const cRadius = spec.centerCircleRadius * scale;
  const pSpot = spec.penaltySpotDistance * scale;
  const gWidth = spec.goalWidthMeters * scale;

  return (
    <div className={`p-5 sm:p-6 bg-[#141419] border border-white/10 rounded-2xl shadow-2xl text-[#F0E9E7] space-y-5 ${className}`}>
      
      {/* Header Bar: Title, Format Pills, View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F02D50] animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F02D50] font-bold">
              Technical Ground Overview & Proportional Geometry
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black font-display italic tracking-tight text-[#F0E9E7] mt-0.5">
            Pitch Dimensions & Markings
          </h2>
          <p className="text-xs text-[#A5A1A4] font-sans mt-0.5">
            Governing-body technical ground plans with responsive aspect-ratio scaling
          </p>
        </div>

        {/* View Mode & Unit Toggles */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Unit Toggle */}
          <div className="flex items-center rounded-xl bg-[#101013] border border-white/10 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setUnit('METERS')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                unit === 'METERS' ? 'bg-[#F02D50] text-white shadow-sm' : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
              }`}
            >
              Meters (m)
            </button>
            <button
              type="button"
              onClick={() => setUnit('FEET')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-bold ${
                unit === 'FEET' ? 'bg-[#F02D50] text-white shadow-sm' : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
              }`}
            >
              Feet (ft)
            </button>
          </div>

          {/* 2D Plan vs 3D Perspective Toggle */}
          <div className="flex items-center rounded-xl bg-[#101013] border border-white/10 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('2D_PLAN')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold ${
                viewMode === '2D_PLAN' ? 'bg-[#21191D] border border-[#F02D50]/50 text-[#F02D50]' : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Technical 2D Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('3D_STADIUM')}
              className={`px-3 py-1 rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold ${
                viewMode === '3D_STADIUM' ? 'bg-[#F02D50] text-white shadow-lg shadow-[#F02D50]/30' : 'text-[#A5A1A4] hover:text-[#F0E9E7]'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>3D Stadium WebGL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Format Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-[#A5A1A4] uppercase mr-1">Format:</span>
        {(Object.keys(GROUND_FORMAT_SPECS) as FootballPitchFormat[]).map(fmt => {
          const isSelected = selectedFormat === fmt;
          return (
            <button
              key={fmt}
              type="button"
              onClick={() => handleFormatSelect(fmt)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#F02D50] text-white shadow-lg shadow-[#F02D50]/20 scale-102'
                  : 'bg-[#101013] hover:bg-[#1f1f27] text-[#A5A1A4] hover:text-[#F0E9E7] border border-white/10'
              }`}
            >
              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              <span>{fmt}</span>
            </button>
          );
        })}
      </div>

      {/* Format Specification Banner */}
      <div className="p-3.5 rounded-xl bg-[#101013] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[#F0E9E7]">{spec.label}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              spec.isMandatoryStandard
                ? 'bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50]'
                : 'bg-white/5 border border-white/10 text-[#A5A1A4]'
            }`}>
              {spec.isMandatoryStandard ? 'Official Standard' : 'Recommended Range'}
            </span>
            {isCustom && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-950/60 border border-amber-700/50 text-amber-300">
                Customized
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#A5A1A4] font-sans">
            <span className="font-semibold text-slate-300">Source:</span> {spec.source}
          </p>
          <p className="text-[11px] text-[#A5A1A4] font-sans">
            {spec.notes}
          </p>
        </div>

        {isCustom && (
          <button
            type="button"
            onClick={handleResetToStandard}
            className="px-3 py-1.5 rounded-lg bg-[#21191D] hover:bg-white/5 border border-white/10 text-xs font-mono text-[#F02D50] flex items-center gap-1.5 transition cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard</span>
          </button>
        )}
      </div>

      {/* Dimension Controls & Sensible Validation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#101013] border border-white/10">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono font-bold uppercase text-[#A5A1A4]">
              Pitch Length (Touchline)
            </label>
            <span className="text-xs font-mono font-bold text-[#F02D50]">
              {displayLength} {unitLabel} {isCustom ? '' : '(Standard)'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={spec.minLength}
              max={spec.maxLength}
              step={0.5}
              value={lengthMeters}
              onChange={e => handleLengthChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#F02D50] cursor-pointer"
            />
            <input
              type="number"
              min={spec.minLength}
              max={spec.maxLength}
              step={0.5}
              value={unit === 'METERS' ? lengthMeters : parseFloat((lengthMeters * METERS_TO_FEET).toFixed(1))}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                handleLengthChange(unit === 'METERS' ? val : val / METERS_TO_FEET);
              }}
              className="w-20 px-2 py-1 bg-[#19191F] border border-white/10 rounded-lg text-xs font-mono text-center text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-[#A5A1A4] font-mono block mt-1">
            Permissible Range: {spec.minLength}m – {spec.maxLength}m ({Math.round(spec.minLength * METERS_TO_FEET)}ft – {Math.round(spec.maxLength * METERS_TO_FEET)}ft)
          </span>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono font-bold uppercase text-[#A5A1A4]">
              Pitch Width (Goal Line)
            </label>
            <span className="text-xs font-mono font-bold text-[#F02D50]">
              {displayWidth} {unitLabel} {isCustom ? '' : '(Standard)'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={spec.minWidth}
              max={spec.maxWidth}
              step={0.5}
              value={widthMeters}
              onChange={e => handleWidthChange(parseFloat(e.target.value))}
              className="flex-1 accent-[#F02D50] cursor-pointer"
            />
            <input
              type="number"
              min={spec.minWidth}
              max={spec.maxWidth}
              step={0.5}
              value={unit === 'METERS' ? widthMeters : parseFloat((widthMeters * METERS_TO_FEET).toFixed(1))}
              onChange={e => {
                const val = parseFloat(e.target.value) || 0;
                handleWidthChange(unit === 'METERS' ? val : val / METERS_TO_FEET);
              }}
              className="w-20 px-2 py-1 bg-[#19191F] border border-white/10 rounded-lg text-xs font-mono text-center text-[#F0E9E7] focus:border-[#F02D50] focus:outline-none"
            />
          </div>
          <span className="text-[10px] text-[#A5A1A4] font-mono block mt-1">
            Permissible Range: {spec.minWidth}m – {spec.maxWidth}m ({Math.round(spec.minWidth * METERS_TO_FEET)}ft – {Math.round(spec.maxWidth * METERS_TO_FEET)}ft)
          </span>
        </div>
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Main Ground Visualization: 2D Plan OR 3D Stadium */}
      {viewMode === '3D_STADIUM' ? (
        <PitchCanvas3D
          lengthMeters={lengthMeters}
          widthMeters={widthMeters}
          format={selectedFormat}
        />
      ) : (
        /* Top-Down Technical 2D Football Ground Plan with Exact Dimension Lines */
        <div className="relative w-full rounded-2xl bg-[#0e0e11] border border-white/10 p-3 sm:p-5 overflow-hidden flex flex-col items-center">
          
          {/* Subtle Ambient Turf Lighting & Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(240,45,80,0.06)_0%,_transparent_75%)] pointer-events-none" />

          {/* Pitch Container with exact aspect ratio scaling */}
          <div className="w-full max-w-3xl relative">
            <svg
              viewBox={`0 0 ${svgTotalW} ${svgTotalH}`}
              className="w-full h-auto drop-shadow-2xl"
              style={{ maxHeight: '460px' }}
            >
              <defs>
                {/* Arrow markers for dimension callout lines */}
                <marker id="dim-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 10 1 L 0 5 L 10 9 z" fill="#F02D50" />
                </marker>
                <marker id="dim-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#F02D50" />
                </marker>
                
                {/* Turf Grass Alternating Stripe Pattern */}
                <pattern id="turf-stripes" width={pitchW / 8} height={pitchH} patternUnits="userSpaceOnUse">
                  <rect x="0" y="0" width={pitchW / 16} height={pitchH} fill="#14181b" />
                  <rect x={pitchW / 16} y="0" width={pitchW / 16} height={pitchH} fill="#111417" />
                </pattern>
              </defs>

              {/* PITCH TURF BASE */}
              <rect
                x={padX}
                y={padY}
                width={pitchW}
                height={pitchH}
                fill="url(#turf-stripes)"
                stroke="#F0E9E7"
                strokeWidth="2.2"
                rx="4"
              />

              {/* HALFWAY LINE */}
              <line
                x1={padX + pitchW / 2}
                y1={padY}
                x2={padX + pitchW / 2}
                y2={padY + pitchH}
                stroke="#F0E9E7"
                strokeWidth="2"
              />

              {/* CENTER CIRCLE */}
              <circle
                cx={padX + pitchW / 2}
                cy={padY + pitchH / 2}
                r={cRadius}
                fill="none"
                stroke="#F0E9E7"
                strokeWidth="2"
              />

              {/* CENTER SPOT */}
              <circle
                cx={padX + pitchW / 2}
                cy={padY + pitchH / 2}
                r="3.5"
                fill="#F02D50"
              />

              {/* CORNER ARCS */}
              <path d={`M ${padX} ${padY + 12} A 12 12 0 0 0 ${padX + 12} ${padY}`} fill="none" stroke="#F0E9E7" strokeWidth="1.5" />
              <path d={`M ${padX + pitchW} ${padY + 12} A 12 12 0 0 1 ${padX + pitchW - 12} ${padY}`} fill="none" stroke="#F0E9E7" strokeWidth="1.5" />
              <path d={`M ${padX} ${padY + pitchH - 12} A 12 12 0 0 1 ${padX + 12} ${padY + pitchH}`} fill="none" stroke="#F0E9E7" strokeWidth="1.5" />
              <path d={`M ${padX + pitchW} ${padY + pitchH - 12} A 12 12 0 0 0 ${padX + pitchW - 12} ${padY + pitchH}`} fill="none" stroke="#F0E9E7" strokeWidth="1.5" />

              {/* PENALTY AREAS: Either Semi-Circular (5s/6s) or Rectangular Box (7s-11s) */}
              {spec.penaltyShape === 'SEMI_CIRCLE' ? (
                <>
                  {/* Left Semi-Circle D Arc */}
                  <path
                    d={`M ${padX} ${padY + pitchH / 2 - pDepth} A ${pDepth} ${pDepth} 0 0 1 ${padX} ${padY + pitchH / 2 + pDepth}`}
                    fill="none"
                    stroke="#F0E9E7"
                    strokeWidth="2"
                  />
                  {/* Right Semi-Circle D Arc */}
                  <path
                    d={`M ${padX + pitchW} ${padY + pitchH / 2 - pDepth} A ${pDepth} ${pDepth} 0 0 0 ${padX + pitchW} ${padY + pitchH / 2 + pDepth}`}
                    fill="none"
                    stroke="#F0E9E7"
                    strokeWidth="2"
                  />
                </>
              ) : (
                <>
                  {/* Left Rectangular Penalty Box */}
                  <rect
                    x={padX}
                    y={padY + (pitchH - pWidth) / 2}
                    width={pDepth}
                    height={pWidth}
                    fill="none"
                    stroke="#F0E9E7"
                    strokeWidth="2"
                  />
                  {/* Right Rectangular Penalty Box */}
                  <rect
                    x={padX + pitchW - pDepth}
                    y={padY + (pitchH - pWidth) / 2}
                    width={pDepth}
                    height={pWidth}
                    fill="none"
                    stroke="#F0E9E7"
                    strokeWidth="2"
                  />

                  {/* Goal Area (6-yard / 4m box for 9s and 11s) */}
                  {spec.goalAreaDepth && spec.goalAreaWidth && (
                    <>
                      <rect
                        x={padX}
                        y={padY + (pitchH - spec.goalAreaWidth * scale) / 2}
                        width={spec.goalAreaDepth * scale}
                        height={spec.goalAreaWidth * scale}
                        fill="none"
                        stroke="#F0E9E7"
                        strokeWidth="1.5"
                      />
                      <rect
                        x={padX + pitchW - spec.goalAreaDepth * scale}
                        y={padY + (pitchH - spec.goalAreaWidth * scale) / 2}
                        width={spec.goalAreaDepth * scale}
                        height={spec.goalAreaWidth * scale}
                        fill="none"
                        stroke="#F0E9E7"
                        strokeWidth="1.5"
                      />
                    </>
                  )}

                  {/* Penalty Arc (D-arc for 11-a-side) */}
                  {spec.hasPenaltyArc && (
                    <>
                      <path
                        d={`M ${padX + pDepth} ${padY + pitchH / 2 - 28} A ${cRadius} ${cRadius} 0 0 1 ${padX + pDepth} ${padY + pitchH / 2 + 28}`}
                        fill="none"
                        stroke="#F0E9E7"
                        strokeWidth="1.8"
                      />
                      <path
                        d={`M ${padX + pitchW - pDepth} ${padY + pitchH / 2 - 28} A ${cRadius} ${cRadius} 0 0 0 ${padX + pitchW - pDepth} ${padY + pitchH / 2 + 28}`}
                        fill="none"
                        stroke="#F0E9E7"
                        strokeWidth="1.8"
                      />
                    </>
                  )}
                </>
              )}

              {/* PENALTY SPOTS */}
              <circle cx={padX + pSpot} cy={padY + pitchH / 2} r="2.8" fill="#F02D50" />
              <circle cx={padX + pitchW - pSpot} cy={padY + pitchH / 2} r="2.8" fill="#F02D50" />

              {/* PHYSICAL GOALS (Extending outside touchline) */}
              <rect
                x={padX - 16}
                y={padY + (pitchH - gWidth) / 2}
                width="16"
                height={gWidth}
                fill="#21191D"
                stroke="#F0E9E7"
                strokeWidth="2"
              />
              <rect
                x={padX + pitchW}
                y={padY + (pitchH - gWidth) / 2}
                width="16"
                height={gWidth}
                fill="#21191D"
                stroke="#F0E9E7"
                strokeWidth="2"
              />

              {/* ======================================================== */}
              {/* TOP DIMENSION LINE: PITCH LENGTH (Touchline)             */}
              {/* ======================================================== */}
              <line
                x1={padX}
                y1={padY - 26}
                x2={padX + pitchW}
                y2={padY - 26}
                stroke="#F02D50"
                strokeWidth="1.5"
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              {/* Extension lines */}
              <line x1={padX} y1={padY - 32} x2={padX} y2={padY - 4} stroke="#F02D50" strokeWidth="1" strokeDasharray="2,2" />
              <line x1={padX + pitchW} y1={padY - 32} x2={padX + pitchW} y2={padY - 4} stroke="#F02D50" strokeWidth="1" strokeDasharray="2,2" />
              {/* Dimension label */}
              <text
                x={padX + pitchW / 2}
                y={padY - 32}
                textAnchor="middle"
                fill="#F0E9E7"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="800"
              >
                TOUCHLINE LENGTH: {displayLength} {unitLabel}
              </text>

              {/* ======================================================== */}
              {/* RIGHT DIMENSION LINE: PITCH WIDTH (Goal Line)            */}
              {/* ======================================================== */}
              <line
                x1={padX + pitchW + 36}
                y1={padY}
                x2={padX + pitchW + 36}
                y2={padY + pitchH}
                stroke="#F02D50"
                strokeWidth="1.5"
                markerStart="url(#dim-arrow-start)"
                markerEnd="url(#dim-arrow-end)"
              />
              {/* Extension lines */}
              <line x1={padX + pitchW + 4} y1={padY} x2={padX + pitchW + 44} y2={padY} stroke="#F02D50" strokeWidth="1" strokeDasharray="2,2" />
              <line x1={padX + pitchW + 4} y1={padY + pitchH} x2={padX + pitchW + 44} y2={padY + pitchH} stroke="#F02D50" strokeWidth="1" strokeDasharray="2,2" />
              {/* Vertical dimension label rotated 90deg */}
              <text
                x={padX + pitchW + 52}
                y={padY + pitchH / 2}
                textAnchor="middle"
                fill="#F0E9E7"
                fontSize="13"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="800"
                transform={`rotate(90, ${padX + pitchW + 52}, ${padY + pitchH / 2})`}
              >
                WIDTH: {displayWidth} {unitLabel}
              </text>

              {/* Bottom Specification Badge */}
              <text
                x={padX + pitchW / 2}
                y={padY + pitchH + 28}
                textAnchor="middle"
                fill="#A5A1A4"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {spec.label.toUpperCase()} • RATIO {(lengthMeters / widthMeters).toFixed(2)}:1 • GOAL: {(spec.goalWidthMeters * (unit === 'METERS' ? 1 : METERS_TO_FEET)).toFixed(1)}{unitLabel} × {(spec.goalHeightMeters * (unit === 'METERS' ? 1 : METERS_TO_FEET)).toFixed(1)}{unitLabel}
              </text>
            </svg>
          </div>
        </div>
      )}

    </div>
  );
};
