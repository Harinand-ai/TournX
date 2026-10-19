import React from 'react';
import { Home, Calendar, Shield, BarChart3, Radio } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  onOpenLiveWindow?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onNavigate,
  onOpenLiveWindow,
}) => {
  const tabs = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'public-tournament', label: 'Hub', icon: Calendar },
    {
      id: 'live',
      label: 'Live',
      icon: Radio,
      isLiveLink: true,
    },
    { id: 'teams', label: 'Clubs', icon: Shield },
    { id: 'workspace', label: 'Organize', icon: BarChart3 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c120e]/95 border-t border-[#1f2e26] backdrop-blur-md px-2 py-1 safe-bottom shadow-2xl">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isLiveLink) {
            return (
              <button
                key={tab.id}
                onClick={onOpenLiveWindow}
                className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-rose-400 active:scale-95 transition-transform cursor-pointer"
                title="Open Live Match Window"
              >
                <Icon className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-mono font-bold mt-0.5 tracking-tight">
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 transition-colors cursor-pointer ${
                isActive
                  ? 'text-lime-400 font-bold'
                  : 'text-slate-400 hover:text-white font-medium'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-mono mt-0.5 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
