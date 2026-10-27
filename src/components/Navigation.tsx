import React from 'react';
import { LayoutDashboard, UploadCloud, CheckCircle2, Archive, Settings } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'upload' | 'tasks' | 'archive' | 'settings';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  pendingCount,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'upload' as ActiveTab,
      label: 'AI Extract',
      icon: UploadCloud,
      badge: 'Gemini',
    },
    {
      id: 'tasks' as ActiveTab,
      label: 'All Tasks',
      icon: CheckCircle2,
      badge: pendingCount > 0 ? String(pendingCount) : null,
    },
    {
      id: 'archive' as ActiveTab,
      label: 'Archive',
      icon: Archive,
      badge: null,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Settings',
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <>
      {/* Desktop Navigation Strip / Sidebar Tabs */}
      <nav className="hidden md:flex items-center gap-1 p-1.5 bg-slate-900/90 rounded-xl border border-slate-800 shadow-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/20 to-blue-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-sky-400/20 text-sky-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mobile Fixed Bottom Tab Bar (Thumb Zone) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#080d1a]/95 backdrop-blur-lg border-t border-slate-800 pb-safe">
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className="flex flex-col items-center justify-center min-h-[48px] py-1 text-center relative group"
              >
                <div
                  className={`p-1.5 rounded-lg transition-transform ${
                    isActive ? 'text-sky-400 scale-110' : 'text-slate-400 group-active:scale-95'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] tracking-tight leading-none mt-0.5 whitespace-nowrap ${
                    isActive ? 'font-bold text-sky-400' : 'text-slate-400 font-medium'
                  }`}
                >
                  {item.label}
                </span>
                {item.badge && item.badge !== 'Gemini' && (
                  <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-bold text-[9px] flex items-center justify-center font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
