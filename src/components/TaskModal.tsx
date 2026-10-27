import React, { useState, useEffect } from 'react';
import { Task, ActivityType, TaskStatus, TaskSchema } from '../types';
import { pktToUtcIso, utcIsoToPktParts } from '../utils/dateUtils';
import { X, Save, Calendar, Clock, Award, FileText, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  initialTask?: Task | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [type, setType] = useState<ActivityType>('Assignment');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [hasDeadline, setHasDeadline] = useState(true);
  const [pktDate, setPktDate] = useState('');
  const [pktTime, setPktTime] = useState('23:59');
  const [totalMarks, setTotalMarks] = useState('');
  const [gracePeriod, setGracePeriod] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Pending');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTask) {
      setCourseCode(initialTask.courseCode);
      setCourseName(initialTask.courseName);
      setType(initialTask.type);
      setTitle(initialTask.title);
      setInstructions(initialTask.instructions);
      setTotalMarks(initialTask.totalMarks || '');
      setGracePeriod(initialTask.gracePeriod || '');
      setNotes(initialTask.notes || '');
      setStatus(initialTask.status);

      if (initialTask.deadline) {
        setHasDeadline(true);
        const { dateStr, timeStr } = utcIsoToPktParts(initialTask.deadline);
        setPktDate(dateStr);
        setPktTime(timeStr);
      } else {
        setHasDeadline(false);
        setPktDate('');
        setPktTime('23:59');
      }
    } else {
      // Defaults for new task: due 3 days from now at 23:59 PKT
      const defaultDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const year = defaultDate.getUTCFullYear();
      const month = String(defaultDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(defaultDate.getUTCDate()).padStart(2, '0');

      setCourseCode('');
      setCourseName('');
      setType('Assignment');
      setTitle('');
      setInstructions('');
      setHasDeadline(true);
      setPktDate(`${year}-${month}-${day}`);
      setPktTime('23:59');
      setTotalMarks('');
      setGracePeriod('');
      setNotes('');
      setStatus('Pending');
    }
    setValidationError(null);
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!courseCode.trim()) {
      setValidationError('Course code is required (e.g. CS504, ENG101).');
      return;
    }
    if (!title.trim()) {
      setValidationError('Task title is required (e.g. Assignment No. 1).');
      return;
    }

    let isoDeadline: string | null = null;
    if (hasDeadline) {
      if (!pktDate) {
        setValidationError('Please select a deadline date or check "Deadline unknown".');
        return;
      }
      isoDeadline = pktToUtcIso(pktDate, pktTime || '23:59');
    }

    const nowIso = new Date().toISOString();

    const candidateTask: Task = {
      id: initialTask?.id || crypto.randomUUID(),
      schemaVersion: 1,
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      type,
      title: title.trim(),
      instructions: instructions.trim(),
      openingDate: initialTask?.openingDate || null,
      deadline: isoDeadline,
      deadlineHasTime: hasDeadline && Boolean(pktTime),
      status,
      archived: initialTask?.archived || false,
      notes: notes.trim(),
      totalMarks: totalMarks.trim(),
      gracePeriod: gracePeriod.trim(),
      source: initialTask?.source || {
        fileName: 'Manual Entry',
        pageRef: 'N/A',
        importedAt: nowIso,
      },
      fieldConfidence: initialTask?.fieldConfidence || {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'Entered and verified by user.',
      },
      needsConfirmation: [],
      reminderState: initialTask?.reminderState || { mode: 'active' },
      createdAt: initialTask?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    // Validate with Zod
    const parseResult = TaskSchema.safeParse(candidateTask);
    if (!parseResult.success) {
      setValidationError(parseResult.error.issues[0].message);
      return;
    }

    onSave(parseResult.data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {initialTask ? 'Edit Academic Task' : 'Create New Academic Task'}
            </h2>
            <p className="text-xs text-slate-400">
              Virtual University LMS deadline tracker (Asia/Karachi UTC+5)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Course Code & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Course Code *
              </label>
              <input
                type="text"
                placeholder="e.g. CS504, MTH302"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 uppercase font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Course Name
              </label>
              <input
                type="text"
                placeholder="e.g. Software Engineering - I"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Activity Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Activity Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ActivityType)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Assignment">Assignment</option>
                <option value="Quiz">Quiz</option>
                <option value="GDB">GDB (Graded Discussion Board)</option>
                <option value="Exam">Exam (Mid / Final Term)</option>
                <option value="Announcement">Announcement</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Current Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Pending">Pending</option>
                <option value="InProgress">In Progress</option>
                <option value="Submitted">Submitted (Completed)</option>
                <option value="Missed">Missed</option>
              </select>
            </div>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Task Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Assignment No. 1 (Use Case & Class Diagrams)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
              required
            />
          </div>

          {/* Deadline in PKT */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Deadline (Pakistan Standard Time)</span>
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hasDeadline}
                  onChange={(e) => setHasDeadline(!e.target.checked)}
                  className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                />
                <span>Deadline unknown</span>
              </label>
            </div>

            {hasDeadline && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={pktDate}
                    onChange={(e) => setPktDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                    required={hasDeadline}
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Time (PKT, UTC+5)
                  </label>
                  <input
                    type="time"
                    value={pktTime}
                    onChange={(e) => setPktTime(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Total Marks & Grace Period */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Total Marks
              </label>
              <input
                type="text"
                placeholder="e.g. 20, 10, or 5"
                value={totalMarks}
                onChange={(e) => setTotalMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Grace Period
              </label>
              <input
                type="text"
                placeholder="e.g. 24 Hours Grace Period"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Instructions & Syllabus
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Upload .doc file only. Covers lectures 1 to 15. Dev-C++ code."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Personal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Personal Study Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Need to review lecture 12 before submitting."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-xs font-bold text-white shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>{initialTask ? 'Update Task' : 'Save Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
