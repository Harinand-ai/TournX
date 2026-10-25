import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles, 
  CheckCircle2, 
  Users, 
  Trophy, 
  ShieldCheck, 
  Calendar, 
  MapPin 
} from 'lucide-react';

interface PromptGuidanceSectionProps {
  onApplySample?: (sampleText: string) => void;
}

export const PromptGuidanceSection: React.FC<PromptGuidanceSectionProps> = ({
  onApplySample
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const samplePrompt = 
`Team 1: FC Goa
Players:
- Player One — Goalkeeper
- Player Two — Defender
- Player Three — Midfielder
- Player Four — Forward

Team 2: Chennaiyin FC
Players:
- Player Five — Goalkeeper
- Player Six — Defender
- Player Seven — Midfielder
- Player Eight — Forward`;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(samplePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApplySample) {
      onApplySample(samplePrompt);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-3xl mb-4">
      <div className="rounded-2xl bg-[#19191F] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden transition-all">
        
        {/* Header Toggle Row */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition cursor-pointer group"
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] flex items-center justify-center shrink-0 shadow-sm">
              <HelpCircle className="w-4 h-4 text-[#F02D50]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-display text-[#F0E9E7] group-hover:text-white transition">
                  What to Include in Your Prompt
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-[#21191D] border border-[#F02D50]/30 text-[#F02D50] text-[10px] font-mono font-bold tracking-wider uppercase">
                  Suggested Guide
                </span>
              </div>
              <p className="text-xs text-[#A5A1A4] mt-0.5 font-sans hidden sm:block">
                Conventions for tournaments, teams, squads, and player positions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#A5A1A4] hidden md:inline">
              {isExpanded ? 'Hide Guide' : 'Show Guide'}
            </span>
            <div className="p-1 rounded-md text-[#A5A1A4] group-hover:text-white transition">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="px-4 pb-5 sm:px-6 sm:pb-6 space-y-4 border-t border-white/[0.06] pt-4 animate-in fade-in duration-200">
            
            {/* Guidance Items Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.08] flex items-start gap-2">
                <Trophy className="w-3.5 h-3.5 text-[#F02D50] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F0E9E7] block">Tournament Name</span>
                  <span className="text-[11px] text-[#A5A1A4]">e.g. Monsoon Trophy</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.08] flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F02D50] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F0E9E7] block">Format & Rules</span>
                  <span className="text-[11px] text-[#A5A1A4]">Knockout or Round-Robin</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.08] flex items-start gap-2">
                <Users className="w-3.5 h-3.5 text-[#F02D50] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F0E9E7] block">Team & Squads</span>
                  <span className="text-[11px] text-[#A5A1A4]">Team headings + player lists</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#101013] border border-white/[0.08] flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#F02D50] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-[#F0E9E7] block">Dates & Venue</span>
                  <span className="text-[11px] text-[#A5A1A4]">Date, time, and pitch</span>
                </div>
              </div>
            </div>

            {/* Checklist description */}
            <p className="text-xs text-[#A5A1A4] leading-relaxed font-sans">
              You can describe your tournament completely in ordinary natural English. However, grouping player names under explicit team headers with their positions ensures the parser recognizes squads without ambiguity.
            </p>

            {/* Realistic Example Card */}
            <div className="rounded-xl bg-[#101013] border border-white/10 p-3.5 sm:p-4 space-y-2.5 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="text-xs font-mono font-bold text-[#F02D50] flex items-center gap-1.5 uppercase tracking-wide">
                  <Sparkles className="w-3 h-3" /> Recommended Squad Format
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="text-[11px] text-[#A5A1A4] hover:text-[#F0E9E7] flex items-center gap-1 px-2.5 py-1 rounded bg-[#19191F] border border-white/10 transition cursor-pointer font-mono"
                  >
                    {copied ? <Check className="w-3 h-3 text-[#F02D50]" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy Example'}</span>
                  </button>

                  {onApplySample && (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="text-[11px] text-white hover:bg-[#FF3358] bg-[#F02D50] px-2.5 py-1 rounded font-bold transition cursor-pointer font-mono shadow-xs"
                    >
                      Use in Composer
                    </button>
                  )}
                </div>
              </div>

              <pre className="text-xs font-mono text-[#F0E9E7] whitespace-pre leading-relaxed overflow-x-auto p-3 rounded-lg bg-[#0B0B0E] border border-white/[0.06]">
                {samplePrompt}
              </pre>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#A5A1A4] font-sans pt-1">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#F02D50]" /> Positions separated by hyphens (—, -), colons (:), commas (,), or parentheses ((GK))
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#F02D50]" /> Captains, managers, and substitutes recognized automatically
                </span>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
