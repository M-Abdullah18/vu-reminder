import React from 'react';
import { Task, isTaskOverdue } from '../types';
import { formatLocalWithPkt, getRemainingTime } from '../utils/dateUtils';
import { exportTasksToIcs } from '../utils/icsExport';
import {
  X,
  Calendar,
  Clock,
  Download,
  Edit3,
  CheckCircle2,
  BellRing,
  RotateCcw,
  Award,
  FileText,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

interface TaskDetailsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onResumeReminders: (task: Task) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
  onResumeReminders,
}) => {
  if (!isOpen || !task) return null;

  const overdue = isTaskOverdue(task);
  const isSubmitted = task.status === 'Submitted';
  const countdown = getRemainingTime(task.deadline);
  const { pktString, localString, isDifferentTimezone } = formatLocalWithPkt(task.deadline);

  const isReminderAcknowledged = task.reminderState.mode === 'acknowledged';
  const isReminderSnoozed = task.reminderState.mode === 'snoozed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono font-bold text-sky-400 text-sm px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                {task.courseCode}
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs font-semibold text-slate-300">{task.type}</span>
              {task.courseName && (
                <>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-400">{task.courseName}</span>
                </>
              )}
            </div>
            <h2 className="text-lg font-bold text-white">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Status & Deadline Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Deadline (Asia/Karachi PKT)
              </span>
              <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{pktString}</span>
              </div>
              {isDifferentTimezone && (
                <div className="text-xs text-slate-400 font-mono mt-0.5 pl-6">{localString}</div>
              )}
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                Remaining Time / Status
              </span>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                <span
                  className={`text-sm font-bold font-mono tabular-nums ${
                    isSubmitted
                      ? 'text-emerald-400'
                      : overdue
                      ? 'text-rose-400'
                      : 'text-sky-300'
                  }`}
                >
                  {isSubmitted ? 'Submitted (Completed)' : countdown.formatted}
                </span>
              </div>
            </div>
          </div>

          {/* Marks & Grace Period if present */}
          {(task.totalMarks || task.gracePeriod) && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              {task.totalMarks && (
                <span className="flex items-center gap-1.5 text-amber-300 font-bold font-mono">
                  <Award className="w-4 h-4" />
                  Total Marks: {task.totalMarks}
                </span>
              )}
              {task.gracePeriod && (
                <span className="text-amber-200/90 font-medium">
                  {task.gracePeriod}
                </span>
              )}
            </div>
          )}

          {/* Reminder State & Resume Reminders */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  isReminderAcknowledged
                    ? 'bg-slate-800 text-slate-400'
                    : isReminderSnoozed
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-sky-500/20 text-sky-400'
                }`}
              >
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200">
                  Reminder State:{' '}
                  <span className="font-mono text-sky-400">
                    {task.reminderState.mode === 'active'
                      ? 'Active (Alerts enabled)'
                      : task.reminderState.mode === 'snoozed'
                      ? `Snoozed until ${new Date(task.reminderState.until).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Acknowledged (Alerts muted)'}
                  </span>
                </p>
                <p className="text-[11px] text-slate-400">
                  {isReminderAcknowledged
                    ? 'Alerts were stopped after "Thanks, got it". You can resume them at any time.'
                    : 'System will notify at configured thresholds.'}
                </p>
              </div>
            </div>

            {/* Resume Reminders Button */}
            {isReminderAcknowledged && (
              <button
                onClick={() => onResumeReminders(task)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resume Reminders</span>
              </button>
            )}
          </div>

          {/* Instructions */}
          {task.instructions && (
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Instructions & Syllabus
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {task.instructions}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                My Study Notes
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {task.notes}
              </div>
            </div>
          )}

          {/* Source Document Metadata & Confidence */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/60 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Source Document:</span>
              <span className="font-mono text-slate-300">{task.source.fileName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Document Location:</span>
              <span>{task.source.pageRef}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>AI Field Confidence:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {task.fieldConfidence.overall} Confidence
              </span>
            </div>
            {task.fieldConfidence.rationale && (
              <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
                "{task.fieldConfidence.rationale}"
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => exportTasksToIcs([task], `${task.courseCode}_deadline.ics`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export to Calendar (.ics)</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(task)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>

            <button
              onClick={() => onToggleStatus(task)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                isSubmitted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitted ? 'Reopen Task' : 'Mark as Submitted'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
