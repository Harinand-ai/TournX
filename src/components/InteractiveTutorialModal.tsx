import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Trophy, 
  FileText, 
  Users, 
  Key, 
  Activity, 
  Check, 
  Copy,
  Calendar,
  MapPin,
  Shield,
  Eye,
  CheckCircle2,
  UserCheck
} from 'lucide-react';

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryPrompt?: (examplePrompt: string) => void;
}

interface TutorialStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export const InteractiveTutorialModal: React.FC<InteractiveTutorialModalProps> = ({
  isOpen,
  onClose,
  onTryPrompt
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [copiedExample, setCopiedExample] = useState(false);

  const samplePrompt =
    `Team 1: FC Goa\nPlayers:\n- Player One — Goalkeeper\n- Player Two — Defender\n- Player Three — Midfielder\n- Player Four — Forward\n\nTeam 2: Chennaiyin FC\nPlayers:\n- Player Five — Goalkeeper\n- Player Six — Defender\n- Player Seven — Midfielder\n- Player Eight — Forward`;

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(samplePrompt);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const steps: TutorialStep[] = [
    // Step 1: Describing the tournament
    {
      title: 'Describing the Tournament',
      subtitle: 'Natural language setup in plain English',
      badge: 'Step 1 of 6',
      icon: <Trophy className="w-5 h-5 text-[#F02D50]" />,
      description:
        'Start by typing what tournament you want to organize. Specify the tournament name, competition format (knockout or round-robin), start date, kick-off time, venue, and match duration.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-3 shadow-md">
          <div className="flex items-center gap-2 text-xs text-[#F02D50] font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Core Tournament Parameters
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#A5A1A4] font-mono block">FORMAT</span>
              <span className="font-semibold text-[#F0E9E7]">Knockout / League</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#A5A1A4] font-mono block">STYLE</span>
              <span className="font-semibold text-[#F0E9E7]">5s, 7s, or 11-a-side</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#F02D50] shrink-0" />
              <span className="text-[#F0E9E7] truncate">Dates & Times</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#F02D50] shrink-0" />
              <span className="text-[#F0E9E7] truncate">Pitch / Stadium</span>
            </div>
          </div>
          <p className="text-[11px] text-[#A5A1A4] leading-relaxed">
            You can write a flowing paragraph or concise bullet points. TournX deterministically extracts dates, venues, points systems, and formats.
          </p>
        </div>
      )
    },

    // Step 2: Including team names and player lists
    {
      title: 'Including Team Names & Squad Lists',
      subtitle: 'Clear team blocks and explicit player sections',
      badge: 'Step 2 of 6',
      icon: <Users className="w-5 h-5 text-[#F02D50]" />,
      description:
        'To have TournX create teams and populate their rosters automatically, include distinct team headings (e.g. "Team 1: FC Goa" or "Team A: Chennaiyin FC") followed by a "Players:" section with names on separate lines.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-3 shadow-md">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#F02D50] font-mono font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Suggested Formatting
            </span>
            <button
              onClick={handleCopyPrompt}
              className="text-[11px] text-[#A5A1A4] hover:text-[#F0E9E7] flex items-center gap-1 px-2.5 py-1 rounded bg-[#19191F] border border-white/10 transition cursor-pointer"
            >
              {copiedExample ? <Check className="w-3 h-3 text-[#F02D50]" /> : <Copy className="w-3 h-3" />}
              <span>{copiedExample ? 'Copied!' : 'Copy Example'}</span>
            </button>
          </div>
          <div className="p-3 rounded-lg bg-[#101013] border border-white/10 text-xs font-mono text-[#F0E9E7] whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">
            {samplePrompt}
          </div>
          <p className="text-[11px] text-[#A5A1A4]">
            While natural descriptions work, separating each team and listing players under a "Players:" section ensures 100% squad association accuracy.
          </p>
        </div>
      )
    },

    // Step 3: Assigning players to teams and specifying positions
    {
      title: 'Assigning Positions, Captains & Managers',
      subtitle: 'Recognizing standard positions, abbreviations, and roles',
      badge: 'Step 3 of 6',
      icon: <UserCheck className="w-5 h-5 text-[#F02D50]" />,
      description:
        'Attach positions to players using hyphens, colons, commas, or parentheses (e.g. "Player A — Goalkeeper", "Player B (DEF)", "Player C, Midfielder"). Specify captains, managers, or substitutes explicitly.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-2.5 shadow-md text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#F02D50] font-mono font-bold block">GOALKEEPER</span>
              <span className="text-[#F0E9E7] font-mono">Goalkeeper, Keeper, GK</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#F02D50] font-mono font-bold block">DEFENDER</span>
              <span className="text-[#F0E9E7] font-mono">Defender, CB, LB, RB, DEF</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#F02D50] font-mono font-bold block">MIDFIELDER</span>
              <span className="text-[#F0E9E7] font-mono">Midfielder, CM, CDM, CAM, MID</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#F02D50] font-mono font-bold block">FORWARD</span>
              <span className="text-[#F0E9E7] font-mono">Forward, Striker, ST, FWD</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#21191D] border border-[#F02D50]/30 text-[#F0E9E7] font-mono text-[11px]">
            Roles: "Captain", "(C)", "Manager: John Doe", "Substitute", "Bench"
          </div>
        </div>
      )
    },

    // Step 4: Reviewing and correcting the parsed preview
    {
      title: 'Reviewing & Correcting the Preview',
      subtitle: 'Interactive inspection with full manual overrides',
      badge: 'Step 4 of 6',
      icon: <FileText className="w-5 h-5 text-[#F02D50]" />,
      description:
        'TournX displays an interactive preview of every parsed team, squad roster, and match configuration. If any player name, position, or team detail needs adjustment, edit it directly before confirming.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-3 shadow-md text-xs">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
            <span className="font-bold text-[#F0E9E7]">Coastal Super Cup (Parsed Preview)</span>
            <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] text-[10px] font-mono font-bold">Editable</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#A5A1A4] font-mono block">TEAMS DETECTED</span>
              <span className="font-semibold text-[#F0E9E7]">FC Goa, Chennaiyin FC</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#101013] border border-white/10">
              <span className="text-[10px] text-[#A5A1A4] font-mono block">SQUADS POPULATED</span>
              <span className="font-semibold text-[#F0E9E7]">8 Players Assigned</span>
            </div>
          </div>
          <div className="text-[11px] text-[#F02D50] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Manual edits override parsed values with 100% fidelity before fixtures generate.</span>
          </div>
        </div>
      )
    },

    // Step 5: Generating fixtures and managing the tournament
    {
      title: 'Generating Fixtures & Managing the Tournament',
      subtitle: 'Deterministic scheduling, ground overview, and standings',
      badge: 'Step 5 of 6',
      icon: <Shield className="w-5 h-5 text-[#F02D50]" />,
      description:
        'Upon confirmation, TournX generates balanced match rounds, top-down football ground diagrams for your selected format (5v5 to 11v11), and real-time standings with goal difference tie-breakers.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-2.5 shadow-md text-xs">
          <div className="flex items-center justify-between text-[11px] font-mono font-semibold text-[#A5A1A4]">
            <span>Round 1 Balanced Fixture</span>
            <span className="text-[#F02D50]">Match 1</span>
          </div>
          <div className="p-3 rounded-lg bg-[#101013] border border-white/10 flex items-center justify-between">
            <span className="font-bold text-[#F0E9E7]">FC Goa</span>
            <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#F02D50]/40 font-mono text-[#F02D50] text-xs font-bold">VS</span>
            <span className="font-bold text-[#F0E9E7]">Chennaiyin FC</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#A5A1A4] pt-1 font-mono">
            <span>Points: Win (3) • Draw (1) • Loss (0)</span>
            <span>Pitch: 5-a-side Official (40m x 20m)</span>
          </div>
        </div>
      )
    },

    // Step 6: Sharing access and updating matches
    {
      title: 'Sharing Access & Live Match Updates',
      subtitle: 'Spectator view, scorekeeper codes, and POTM honors',
      badge: 'Step 6 of 6',
      icon: <Activity className="w-5 h-5 text-[#F02D50]" />,
      description:
        'Share deep links or access codes for the public scoreboard view. Modifiers update match scores and log goal events live, with real-time Player of the Match awards and leaderboard updates.',
      content: (
        <div className="rounded-xl p-4 bg-[#141418] border border-white/10 space-y-3 shadow-md text-xs">
          <div className="p-3 rounded-lg bg-[#101013] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F0E9E7] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-[#F02D50]" /> Public Observer Experience
              </span>
              <span className="px-2 py-0.5 rounded bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] font-mono text-[10px]">Neo-Retro View</span>
            </div>
            <p className="text-[11px] text-[#A5A1A4] leading-tight">
              Instant access without registration. Clean block-style scorecards, standings, and squad sheets.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#101013] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#F0E9E7] flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Scorekeeper Modifier Code
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 font-mono text-[10px]">Restricted Role</span>
            </div>
            <p className="text-[11px] text-[#A5A1A4] leading-tight">
              Designated match officials can input live scores and goalscorers without touching tournament settings.
            </p>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#19191F] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#F0E9E7]">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#141418] border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] text-[11px] font-mono font-bold tracking-wider uppercase">
              {currentStepData.badge}
            </span>
            <span className="text-xs text-[#A5A1A4] font-medium hidden sm:inline">
              Interactive Guide
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#A5A1A4] hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-[#21191D] border border-[#F02D50]/40 text-[#F02D50] shrink-0">
              {currentStepData.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-[#F0E9E7]">
                {currentStepData.title}
              </h3>
              <p className="text-xs text-[#F02D50] font-medium mt-0.5">
                {currentStepData.subtitle}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#A5A1A4] font-sans leading-relaxed">
            {currentStepData.description}
          </p>

          {/* Interactive visual content */}
          <div className="pt-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                {currentStepData.content}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3.5 bg-[#141418] border-t border-white/[0.08] flex items-center justify-between gap-3">
          {/* Progress Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  currentStep === idx
                    ? 'w-6 bg-[#F02D50]'
                    : 'w-1.5 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls: Back, Skip, Next / Done */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-[#A5A1A4] hover:text-[#F0E9E7] hover:bg-white/5 transition cursor-pointer"
            >
              Skip
            </button>

            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="px-3 py-1.5 rounded-lg bg-[#19191F] hover:bg-[#202028] border border-white/10 text-xs text-[#F0E9E7] transition flex items-center gap-1 cursor-pointer font-medium"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
                className="px-4 py-1.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-bold transition flex items-center gap-1 shadow-md cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-[#F02D50] hover:bg-[#FF3358] text-white text-xs font-bold transition shadow-md cursor-pointer flex items-center gap-1"
              >
                <span>Got It</span>
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
