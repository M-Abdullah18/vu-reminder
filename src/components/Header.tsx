import React, { useState, useEffect } from 'react';
import { getCurrentPktTimeString } from '../utils/dateUtils';
import { Clock, ShieldAlert, Sparkles, TestTube } from 'lucide-react';

interface HeaderProps {
  urgentCount: number;
  onOpenTestModal: () => void;
  onOpenNewTask: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  urgentCount,
  onOpenTestModal,
  onOpenNewTask,
}) => {
  const [pktTime, setPktTime] = useState<string>(getCurrentPktTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setPktTime(getCurrentPktTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-[#080d1a]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 font-bold text-sm tracking-wider">
            VU
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap">
                Smart Deadline Manager
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block truncate max-w-xs md:max-w-md">
              Virtual University of Pakistan Academic Tracker
            </p>
          </div>
        </div>

        {/* Center / Utility Zone: Live PKT Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono tabular-nums">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>PKT: {pktTime}</span>
          <span className="text-[10px] text-slate-500 font-sans">(UTC+5)</span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {urgentCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              <span>{urgentCount} Urgent</span>
            </div>
          )}

          <button
            onClick={onOpenTestModal}
            title="Run automated unit test suite"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            <TestTube className="w-3.5 h-3.5 text-emerald-400" />
            <span>Unit Tests</span>
          </button>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-xs font-semibold text-white shadow-md shadow-sky-500/20 active:scale-95 transition-all whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ New Task</span>
          </button>
        </div>
      </div>
    </header>
  );
};
