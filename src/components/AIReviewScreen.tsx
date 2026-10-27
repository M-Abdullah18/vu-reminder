import React, { useState } from 'react';
import {
  ExtractedTask,
  Task,
  ActivityType,
  ActivityTypeEnum,
} from '../types';
import { checkDuplicate } from '../utils/duplicateDetector';
import { pktToUtcIso, utcIsoToPktParts, formatInPKT } from '../utils/dateUtils';
import {
  Check,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  Info,
  ShieldCheck,
  Award,
} from 'lucide-react';

interface AIReviewScreenProps {
  extractedTasks: ExtractedTask[];
  fileName: string;
  existingTasks: Task[];
  onImportCompleted: (finalTasks: Task[]) => void;
  onCancel: () => void;
}

interface EditableExtractedTask extends ExtractedTask {
  id: string;
  selected: boolean;
  userConfirmedAmbiguities: boolean;
  duplicateResolution?: 'merge' | 'keep_both' | 'skip';
  editedCourseCode: string;
  editedCourseName: string;
  editedType: ActivityType;
  editedTitle: string;
  editedInstructions: string;
  hasDeadline: boolean;
  editedPktDate: string;
  editedPktTime: string;
  editedTotalMarks: string;
  editedGracePeriod: string;
}

export const AIReviewScreen: React.FC<AIReviewScreenProps> = ({
  extractedTasks,
  fileName,
  existingTasks,
  onImportCompleted,
  onCancel,
}) => {
  const [tasks, setTasks] = useState<EditableExtractedTask[]>(() => {
    return extractedTasks.map((t, idx) => {
      const hasIso = Boolean(t.isoDeadline);
      const { dateStr, timeStr } = utcIsoToPktParts(t.isoDeadline || null);
      const requiresConfirmation =
        t.deadlineStatus === 'ambiguous' || t.ambiguityFlags.length > 0;

      return {
        ...t,
        id: `extracted-${idx}-${Date.now()}`,
        selected: true,
        userConfirmedAmbiguities: !requiresConfirmation, // if not ambiguous, auto-confirmed
        editedCourseCode: t.courseCode || 'CS504',
        editedCourseName: t.courseName || '',
        editedType: (ActivityTypeEnum.options.includes(t.activityType as any)
          ? t.activityType
          : 'Assignment') as ActivityType,
        editedTitle: t.title || 'Untitled Academic Task',
        editedInstructions: t.instructions || '',
        hasDeadline: hasIso && t.deadlineStatus !== 'unknown',
        editedPktDate: dateStr,
        editedPktTime: timeStr || '23:59',
        editedTotalMarks: t.totalMarks || '',
        editedGracePeriod: t.gracePeriod || '',
      };
    });
  });

  // Check which tasks require confirmation
  const unconfirmedCount = tasks.filter(
    (t) => t.selected && (t.ambiguityFlags.length > 0 || t.deadlineStatus === 'ambiguous') && !t.userConfirmedAmbiguities
  ).length;

  const handleFieldChange = (id: string, field: keyof EditableExtractedTask, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, [field]: value };
      })
    );
  };

  const handleToggleConfirmAmbiguity = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        return { ...t, userConfirmedAmbiguities: !t.userConfirmedAmbiguities };
      })
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImportAll = () => {
    const finalTasksToSave: Task[] = [];
    const nowIso = new Date().toISOString();

    for (const t of tasks) {
      if (!t.selected) continue;
      if (t.duplicateResolution === 'skip') continue;

      let isoDeadline: string | null = null;
      if (t.hasDeadline && t.editedPktDate) {
        isoDeadline = pktToUtcIso(t.editedPktDate, t.editedPktTime || '23:59');
      }

      // Check if duplicate resolution is merge
      const dupCheck = checkDuplicate(t, existingTasks);
      const isMerge = t.duplicateResolution === 'merge' && dupCheck.matchedTask;

      const taskToSave: Task = {
        id: isMerge ? dupCheck.matchedTask!.id : crypto.randomUUID(),
        schemaVersion: 1,
        courseCode: t.editedCourseCode.trim().toUpperCase(),
        courseName: t.editedCourseName.trim(),
        type: t.editedType,
        title: t.editedTitle.trim(),
        instructions: t.editedInstructions.trim(),
        openingDate: t.isoOpeningDate || null,
        deadline: isoDeadline,
        deadlineHasTime: t.hasDeadline && Boolean(t.editedPktTime),
        status: isMerge ? dupCheck.matchedTask!.status : 'Pending',
        archived: false,
        notes: isMerge
          ? `${dupCheck.matchedTask!.notes || ''}\n[Updated from ${fileName}]`.trim()
          : '',
        totalMarks: t.editedTotalMarks.trim(),
        gracePeriod: t.editedGracePeriod.trim(),
        source: {
          fileName,
          pageRef: t.sourceReference || 'Page 1',
          importedAt: nowIso,
        },
        fieldConfidence: t.confidence,
        needsConfirmation: [],
        reminderState: { mode: 'active' },
        createdAt: isMerge ? dupCheck.matchedTask!.createdAt : nowIso,
        updatedAt: nowIso,
      };

      finalTasksToSave.push(taskToSave);
    }

    onImportCompleted(finalTasksToSave);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-sky-400 font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI EXTRACTION REVIEW · {fileName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Review & Correct Extracted Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verify deadlines, resolve flagged ambiguities, and confirm duplicate handling before saving.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleImportAll}
            disabled={unconfirmedCount > 0 || tasks.length === 0}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
              unconfirmedCount > 0 || tasks.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {unconfirmedCount > 0
                ? `Confirm ${unconfirmedCount} Flagged Item${unconfirmedCount > 1 ? 's' : ''}`
                : `Import ${tasks.filter((t) => t.selected).length} Task${
                    tasks.filter((t) => t.selected).length !== 1 ? 's' : ''
                  }`}
            </span>
          </button>
        </div>
      </div>

      {/* Unconfirmed Alert Gate Notice */}
      {unconfirmedCount > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <span>
              <strong>Action Required:</strong> {unconfirmedCount} task(s) contain ambiguous dates or
              inferred times. Please review and check the confirmation box on each flagged task before
              importing.
            </span>
          </div>
        </div>
      )}

      {/* Task Review Cards List */}
      <div className="space-y-6">
        {tasks.map((task, idx) => {
          const dupResult = checkDuplicate(task, existingTasks);
          const hasAmbiguities =
            task.ambiguityFlags.length > 0 || task.deadlineStatus === 'ambiguous';

          return (
            <div
              key={task.id}
              className={`rounded-2xl bg-[#0f172a] border p-5 transition-all ${
                hasAmbiguities && !task.userConfirmedAmbiguities
                  ? 'border-amber-500/50 shadow-lg shadow-amber-950/20'
                  : 'border-slate-800'
              }`}
            >
              {/* Task Card Header */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 text-xs font-mono font-bold flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Confidence:</span>
                    <span
                      className={`font-semibold flex items-center gap-1 ${
                        task.confidence.overall === 'High'
                          ? 'text-emerald-400'
                          : task.confidence.overall === 'Medium'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {task.confidence.overall}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteTask(task.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Remove from import"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Duplicate Detection Warning */}
              {dupResult.isDuplicate && (
                <div className="mb-4 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs">
                  <div className="flex items-start gap-2 text-purple-300 mb-2">
                    <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <p>
                      <strong>Potential Duplicate Detected:</strong> {dupResult.reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <button
                      onClick={() => handleFieldChange(task.id, 'duplicateResolution', 'merge')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        task.duplicateResolution === 'merge'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                      }`}
                    >
                      Merge with Existing
                    </button>
                    <button
                      onClick={() =>
                        handleFieldChange(task.id, 'duplicateResolution', 'keep_both')
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        task.duplicateResolution === 'keep_both'
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                      }`}
                    >
                      Keep Both
                    </button>
                    <button
                      onClick={() => handleFieldChange(task.id, 'duplicateResolution', 'skip')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        task.duplicateResolution === 'skip'
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      Skip This Task
                    </button>
                  </div>
                </div>
              )}

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Course Code *
                  </label>
                  <input
                    type="text"
                    value={task.editedCourseCode}
                    onChange={(e) =>
                      handleFieldChange(task.id, 'editedCourseCode', e.target.value)
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={task.editedCourseName}
                    onChange={(e) =>
                      handleFieldChange(task.id, 'editedCourseName', e.target.value)
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Activity Type
                  </label>
                  <select
                    value={task.editedType}
                    onChange={(e) =>
                      handleFieldChange(task.id, 'editedType', e.target.value as ActivityType)
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Quiz">Quiz</option>
                    <option value="GDB">GDB</option>
                    <option value="Exam">Exam</option>
                    <option value="Announcement">Announcement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="mb-3">
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  value={task.editedTitle}
                  onChange={(e) => handleFieldChange(task.id, 'editedTitle', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-medium focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Deadline & Ambiguity Controls */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Pakistan Standard Time Deadline</span>
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!task.hasDeadline}
                      onChange={(e) =>
                        handleFieldChange(task.id, 'hasDeadline', !e.target.checked)
                      }
                      className="rounded border-slate-700 text-sky-500"
                    />
                    <span>Deadline unknown</span>
                  </label>
                </div>

                {task.hasDeadline && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Date</label>
                      <input
                        type="date"
                        value={task.editedPktDate}
                        onChange={(e) =>
                          handleFieldChange(task.id, 'editedPktDate', e.target.value)
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Time (PKT, UTC+5)
                      </label>
                      <input
                        type="time"
                        value={task.editedPktTime}
                        onChange={(e) =>
                          handleFieldChange(task.id, 'editedPktTime', e.target.value)
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Verbatim text found in document */}
                {task.rawDeadlineText && (
                  <p className="text-[11px] text-slate-400 font-mono italic">
                    Raw text detected: "{task.rawDeadlineText}"
                  </p>
                )}
              </div>

              {/* Ambiguity Flags & Required Confirmation Checkbox */}
              {hasAmbiguities && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 mb-3">
                  <div className="flex items-start gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Ambiguities Detected:</p>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-amber-200/90 text-[11px]">
                        {task.ambiguityFlags.map((flag, fIdx) => (
                          <li key={fIdx}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-semibold text-white pt-2 border-t border-amber-500/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={task.userConfirmedAmbiguities}
                      onChange={() => handleToggleConfirmAmbiguity(task.id)}
                      className="rounded border-amber-400 text-sky-500 focus:ring-sky-500 w-4 h-4"
                    />
                    <span>I have reviewed and confirmed this deadline information.</span>
                  </label>
                </div>
              )}

              {/* Instructions */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Instructions
                </label>
                <textarea
                  rows={2}
                  value={task.editedInstructions}
                  onChange={(e) =>
                    handleFieldChange(task.id, 'editedInstructions', e.target.value)
                  }
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 resize-none focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
