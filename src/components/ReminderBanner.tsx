import React from 'react';
import { ActiveReminderAlert } from '../utils/reminderEngine';
import { formatInPKT } from '../utils/dateUtils';
import { BellRing, Clock, Check, X, Undo2 } from 'lucide-react';

interface ReminderBannerProps {
  alert: ActiveReminderAlert | null;
  onSnooze: (task: ActiveReminderAlert) => void;
  onAcknowledge: (task: ActiveReminderAlert) => void;
  onDismiss: () => void;
  undoToast: {
    message: string;
    onUndo: () => void;
    countdown: number;
  } | null;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  alert,
  onSnooze,
  onAcknowledge,
  onDismiss,
  undoToast,
}) => {
  return (
    <>
      {/* 10-Second Undo Toast */}
      {undoToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-sm w-full bg-slate-900/95 border border-sky-500/40 text-slate-100 rounded-xl p-3.5 shadow-2xl shadow-black/60 flex items-center justify-between gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium truncate">{undoToast.message}</p>
              <p className="text-[10px] text-slate-400 font-mono">
                Auto-dismissing in {undoToast.countdown}s
              </p>
            </div>
          </div>
          <button
            onClick={undoToast.onUndo}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* Active Most Urgent Reminder Banner */}
      {alert && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-500/30 p-4 sm:p-5 shadow-lg shadow-amber-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Alert Context */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {alert.task.courseCode}
                  </span>
                  <span className="text-xs font-semibold text-white">
                    {alert.thresholdLabel}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-amber-400/90 font-mono font-medium">
                    {formatInPKT(alert.task.deadline)}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-white mt-1">
                  {alert.task.title}
                </h4>
                {alert.task.instructions && (
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-1 max-w-xl">
                    {alert.task.instructions}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
              {/* Remind me later (snooze) */}
              {alert.canSnooze ? (
                <button
                  onClick={() => onSnooze(alert)}
                  title="Snooze until min(now + 24h, deadline - 1h)"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Remind me later</span>
                </button>
              ) : (
                <span className="text-[11px] text-rose-400 italic font-mono px-2 py-1 bg-rose-500/10 rounded border border-rose-500/20">
                  Under 1h left (snooze disabled)
                </span>
              )}

              {/* Thanks, got it (acknowledge) */}
              <button
                onClick={() => onAcknowledge(alert)}
                title="Acknowledge reminder and cancel further alerts for this task (with 10s undo)"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Thanks, got it</span>
              </button>

              {/* Dismiss */}
              <button
                onClick={onDismiss}
                title="Dismiss banner"
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
