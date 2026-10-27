import React, { useState, useEffect } from 'react';
import { Task, isTaskOverdue } from '../types';
import { getRemainingTime, formatLocalWithPkt } from '../utils/dateUtils';
import { exportTasksToIcs } from '../utils/icsExport';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onSelect: (task: Task) => void;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onSelect,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const [countdown, setCountdown] = useState(() => getRemainingTime(task.deadline));

  useEffect(() => {
    if (!task.deadline) return;
    const timer = setInterval(() => {
      setCountdown(getRemainingTime(task.deadline));
    }, 1000);
    return () => clearInterval(timer);
  }, [task.deadline]);

  const overdue = isTaskOverdue(task);
  const isSubmitted = task.status === 'Submitted';
  const { pktString, localString, isDifferentTimezone } = formatLocalWithPkt(task.deadline);

  // Type styling
  const typeColors: Record<string, string> = {
    Assignment: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    Quiz: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    GDB: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Exam: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    Announcement: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Other: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  };

  // Urgency boundary styling
  let urgencyBorder = 'border-slate-800 hover:border-slate-700';
  let countdownColor = 'text-slate-300';

  if (isSubmitted) {
    urgencyBorder = 'border-emerald-500/30 bg-emerald-950/10';
    countdownColor = 'text-emerald-400';
  } else if (overdue) {
    urgencyBorder = 'border-rose-500/40 bg-rose-950/10';
    countdownColor = 'text-rose-400 font-bold';
  } else if (countdown.urgency === 'critical') {
    urgencyBorder = 'border-rose-500/50 bg-rose-950/15';
    countdownColor = 'text-rose-400 font-bold animate-pulse';
  } else if (countdown.urgency === 'urgent') {
    urgencyBorder = 'border-amber-500/40 bg-amber-950/10';
    countdownColor = 'text-amber-400 font-semibold';
  } else if (countdown.urgency === 'soon') {
    urgencyBorder = 'border-sky-500/30';
    countdownColor = 'text-sky-300';
  }

  return (
    <div
      className={`group relative rounded-2xl bg-[#0f172a] border ${urgencyBorder} p-4 sm:p-5 transition-all hover:shadow-xl hover:shadow-black/40 flex flex-col justify-between`}
    >
      <div>
        {/* Top Header: Unboxed metadata with typographic dots */}
        <div className="flex items-center justify-between gap-2 text-xs mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sky-400 text-sm tracking-wide">
              {task.courseCode}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                typeColors[task.type] || typeColors.Other
              }`}
            >
              {task.type}
            </span>
            {task.courseName && (
              <>
                <span className="text-slate-600 hidden sm:inline" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-400 text-[11px] truncate max-w-[140px] hidden sm:inline">
                  {task.courseName}
                </span>
              </>
            )}
          </div>

          {/* Status badge */}
          <div className="shrink-0">
            {isSubmitted ? (
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Submitted</span>
              </span>
            ) : overdue ? (
              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Overdue</span>
              </span>
            ) : task.status === 'InProgress' ? (
              <span className="text-[11px] font-semibold text-sky-400">In Progress</span>
            ) : (
              <span className="text-[11px] text-slate-400">Pending</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3
          onClick={() => onSelect(task)}
          className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors cursor-pointer line-clamp-2"
        >
          {task.title}
        </h3>

        {/* Instructions snippet */}
        {task.instructions && (
          <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
            {task.instructions}
          </p>
        )}

        {/* Marks / Grace Period */}
        {(task.totalMarks || task.gracePeriod) && (
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2.5">
            {task.totalMarks && (
              <span className="flex items-center gap-1 text-amber-400/90 font-mono">
                <Award className="w-3 h-3" />
                {task.totalMarks} Marks
              </span>
            )}
            {task.gracePeriod && (
              <span className="text-slate-400 truncate max-w-[200px]" title={task.gracePeriod}>
                · {task.gracePeriod}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Deadline & Live Countdown Ticker */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-mono text-[11px] sm:text-xs truncate">{pktString}</span>
          </div>

          {/* Overseas student local time tooltip/display if different timezone */}
          {isDifferentTimezone && (
            <div className="text-[10px] text-slate-400 font-mono pl-5 truncate">
              {localString}
            </div>
          )}

          {/* Live countdown */}
          <div className="flex items-center gap-1.5 mt-1">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className={`text-xs font-mono tabular-nums ${countdownColor}`}>
              {isSubmitted ? 'Completed' : countdown.formatted}
            </span>
          </div>
        </div>

        {/* Quick Card Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
          {/* Quick Mark Submitted / Reopen */}
          <button
            onClick={() => onToggleStatus(task)}
            title={isSubmitted ? 'Mark as In Progress' : 'Mark as Submitted'}
            className={`p-2 rounded-lg transition-colors ${
              isSubmitted
                ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>

          {/* Export to .ics calendar */}
          {task.deadline && (
            <button
              onClick={() => exportTasksToIcs([task], `${task.courseCode}_${task.type}.ics`)}
              title="Add to Google Calendar / Outlook (.ics)"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Edit */}
          <button
            onClick={() => onEdit(task)}
            title="Edit task"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Details */}
          <button
            onClick={() => onSelect(task)}
            title="View full details and notes"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(task)}
            title="Delete task (with 10s undo)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
