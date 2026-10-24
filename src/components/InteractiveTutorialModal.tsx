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
  CheckCircle2
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
    "Create a six-team football tournament called Kerala Champions Cup. Use single round-robin, starting November 15, at Kannur Municipal Stadium. Six teams: Kerala Blasters, Bengaluru FC, Chennaiyin FC, Mumbai City FC, FC Goa, Hyderabad FC.";

  const handleCopyPrompt = () => {
    navigator.clipboard?.writeText(samplePrompt);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 2000);
  };

  const steps: TutorialStep[] = [
    {
      title: 'Welcome to TournX',
      subtitle: 'Natural-language football tournament management',
      badge: 'Step 1 of 6',
      icon: <Trophy className="w-6 h-6 text-emerald-400" />,
      description:
        'TournX replaces rigid spreadsheets and complicated forms with a conversational master prompt. Simply describe your tournament in plain English, and our deterministic engine creates schedules, squads, and scoreboards automatically.',
      content: (
        <div className="rounded-xl p-5 bg-[#121c15] border border-[#233c2a] text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#162e20] border border-[#2c5339] text-emerald-400 flex items-center justify-center mx-auto shadow-md">
            <Trophy className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#1b3a28] text-emerald-300 border border-[#2d5c40]">
              think • prompt • organise
            </span>
            <h4 className="text-base font-bold text-[#faf9f5] mt-3">From Description to Matchday in Seconds</h4>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-sm mx-auto">
              Organizers get complete control over matches, rules, and squad rosters. Participants get live match updates without needing to create accounts.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Describe Your Tournament',
      subtitle: 'Write in ordinary English — no rigid templates',
      badge: 'Step 2 of 6',
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      description:
        'Tell TournX your tournament name, dates, venue, teams, format, and rules. The parser understands natural paragraphs, bullet points, multi-word club names, and points rules.',
      content: (
        <div className="rounded-xl p-4 bg-[#121c15] border border-[#233c2a] space-y-3 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Example Prompt
            </span>
            <button
              onClick={handleCopyPrompt}
              className="text-[11px] text-slate-300 hover:text-white flex items-center gap-1 px-2 py-1 rounded bg-[#1a2f22] border border-[#2d523a] transition cursor-pointer"
            >
              {copiedExample ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedExample ? 'Copied!' : 'Copy Prompt'}</span>
            </button>
          </div>
          <div className="p-3.5 rounded-lg bg-[#0b130e] border border-[#1e3425] text-xs font-sans text-slate-200 leading-relaxed italic">
            "{samplePrompt}"
          </div>
          <p className="text-[11px] text-slate-400">
            Tip: You can also specify player rosters, managers, captains, 5-a-side or 7-a-side formats, and tie-breaker rules in the prompt!
          </p>
        </div>
      )
    },
    {
      title: 'Review the Generated Preview',
      subtitle: 'Deterministic extraction with full manual editing',
      badge: 'Step 3 of 6',
      icon: <FileText className="w-6 h-6 text-emerald-400" />,
      description:
        'TournX extracts key data into an interactive preview card. If any club name, kick-off time, or date needs correction, simply click and edit before generating final fixtures.',
      content: (
        <div className="rounded-xl p-4 bg-[#121c15] border border-[#233c2a] space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#233c2a] pb-2 text-xs">
            <span className="font-bold text-[#faf9f5]">Kerala Champions Cup (Preview)</span>
            <span className="px-2 py-0.5 rounded bg-[#1a3826] text-emerald-300 text-[10px] font-semibold">Ready to Confirm</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#0b130e] border border-[#1e3425]">
              <span className="text-[10px] text-slate-400 block">FORMAT</span>
              <span className="font-semibold text-slate-200">Single Round-Robin</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0b130e] border border-[#1e3425]">
              <span className="text-[10px] text-slate-400 block">TEAMS</span>
              <span className="font-semibold text-slate-200">6 Clubs (15 Fixtures)</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0b130e] border border-[#1e3425] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-200 truncate">Nov 15, 2026</span>
            </div>
            <div className="p-2.5 rounded-lg bg-[#0b130e] border border-[#1e3425] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-slate-200 truncate">Kannur Stadium</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Manual edits in preview override parsed text with 100% fidelity.</span>
          </div>
        </div>
      )
    },
    {
      title: 'Generate Fixtures & Manage Teams',
      subtitle: 'Deterministic scheduling and automatic league tables',
      badge: 'Step 4 of 6',
      icon: <Users className="w-6 h-6 text-emerald-400" />,
      description:
        'Once confirmed, TournX applies the Berger circle rotation algorithm to generate balanced home-and-away round pairings. Standings calculate instantly based on win, draw, and goal difference rules.',
      content: (
        <div className="rounded-xl p-4 bg-[#121c15] border border-[#233c2a] space-y-2.5 shadow-sm text-xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span>Round 1 Sample Match</span>
            <span className="text-emerald-400">Match 1</span>
          </div>
          <div className="p-3 rounded-lg bg-[#0b130e] border border-[#1e3425] flex items-center justify-between">
            <span className="font-bold text-slate-100">Kerala Blasters</span>
            <span className="px-2 py-0.5 rounded bg-[#16291d] font-mono text-emerald-400 text-xs font-bold">VS</span>
            <span className="font-bold text-slate-100">Bengaluru FC</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Points: Win (3) • Draw (1) • Loss (0)</span>
            <span>Tie-breakers: Goal Diff &rarr; Goals For</span>
          </div>
        </div>
      )
    },
    {
      title: 'Invite Participants & Share Access',
      subtitle: 'Instant public viewing and restricted modifier roles',
      badge: 'Step 5 of 6',
      icon: <Key className="w-6 h-6 text-emerald-400" />,
      description:
        'Every tournament includes a unique shareable link and access code. Public spectators and players can view fixtures and standings without registering an account. Modifiers with a score code can update scores only.',
      content: (
        <div className="rounded-xl p-4 bg-[#121c15] border border-[#233c2a] space-y-3 shadow-sm text-xs">
          <div className="p-3 rounded-lg bg-[#0b130e] border border-[#1e3425] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-400" /> Public Viewer Access
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-mono text-[10px]">Read Only</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Shareable link or 6-digit code. Cannot edit matches, players, or settings.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-[#0b130e] border border-[#1e3425] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" /> Matchday Score Modifier
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-mono text-[10px]">Score Only</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Restricted to inputting match scores, goalscorers, and Player of the Match awards.
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Update Matches & Track Leaders',
      subtitle: 'Upcoming, Live, and Completed statuses with POTM voting',
      badge: 'Step 6 of 6',
      icon: <Activity className="w-6 h-6 text-emerald-400" />,
      description:
        'During the tournament, update match statuses, record goals and assists with exact match minutes, and designate Player of the Match honors. Leaderboards update in real-time.',
      content: (
        <div className="rounded-xl p-4 bg-[#121c15] border border-[#233c2a] space-y-3 shadow-sm text-xs">
          <div className="p-3 rounded-lg bg-[#0b130e] border border-[#1e3425] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> LIVE • 42'
              </span>
              <p className="font-bold text-slate-100 mt-0.5">Kerala Blasters vs Bengaluru FC</p>
            </div>
            <div className="text-right">
              <span className="font-mono text-base font-extrabold text-emerald-400">2 - 1</span>
              <span className="block text-[10px] text-slate-400">Kannur Stadium</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-300 px-1">
            <span>Goalscorers: Rohan Krishna (18'), Abin Thomas (34')</span>
            <span className="text-emerald-400 font-semibold">POTM Active</span>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f1712] border border-[#233c2a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#233c2a] bg-[#121c15] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#162e20] border border-[#2c5339] flex items-center justify-center">
              {currentStepData.icon}
            </div>
            <div>
              <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400">
                {currentStepData.badge}
              </span>
              <h3 className="text-sm font-bold text-[#faf9f5]">
                {currentStepData.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1a2e22] transition cursor-pointer"
            aria-label="Close tutorial"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-slate-300 leading-relaxed">
            {currentStepData.description}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
            >
              {currentStepData.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer controls & Progress */}
        <div className="px-5 py-3.5 border-t border-[#233c2a] bg-[#121c15] flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-medium text-slate-400 hover:text-white transition cursor-pointer"
          >
            Skip Tutorial
          </button>

          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentStep
                    ? 'w-6 bg-emerald-400'
                    : 'bg-[#25422f] hover:bg-[#345c41]'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                className="px-3 py-1.5 rounded-lg bg-[#18281d] hover:bg-[#203627] text-slate-200 text-xs font-semibold flex items-center gap-1 border border-[#2b4b34] transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  if (onTryPrompt) {
                    onTryPrompt(samplePrompt);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition cursor-pointer"
              >
                <span>Get Started</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
