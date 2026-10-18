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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-slate-200 backdrop-blur-md px-2 py-1 safe-bottom shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          if (tab.isLiveLink) {
            return (
              <button
                key={tab.id}
                onClick={onOpenLiveWindow}
                className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 text-rose-600 active:scale-95 transition-transform cursor-pointer"
                title="Open Live Match Window"
              >
                <Icon className="w-4 h-4 animate-pulse" />
                <span className="text-[10px] font-bold mt-0.5 tracking-tight">
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
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
