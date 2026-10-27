import React, { useState } from 'react';
import { Task, isTaskOverdue } from '../types';
import { TaskCard } from './TaskCard';
import { CheckCircle2, AlertTriangle, Archive, RotateCcw, Trash2 } from 'lucide-react';

interface ArchiveScreenProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export const ArchiveScreen: React.FC<ArchiveScreenProps> = ({
  tasks,
  onSelectTask,
  onEditTask,
  onToggleStatus,
  onDeleteTask,
}) => {
  const [subTab, setSubTab] = useState<'completed' | 'missed' | 'all_archived'>('completed');

  const completedTasks = tasks.filter((t) => t.status === 'Submitted');
  const missedTasks = tasks.filter((t) => t.status === 'Missed' || isTaskOverdue(t));
  const archivedTasks = tasks.filter((t) => t.archived);

  const currentList =
    subTab === 'completed'
      ? completedTasks
      : subTab === 'missed'
      ? missedTasks
      : archivedTasks;

  return (
    <div className="max-w-6xl mx-auto py-6 px-4">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Academic Archive
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Past submissions, missed deadlines, and archived semester records.
          </p>
        </div>

        {/* Sub-tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setSubTab('completed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'completed'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completed ({completedTasks.length})</span>
          </button>

          <button
            onClick={() => setSubTab('missed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'missed'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Missed / Overdue ({missedTasks.length})</span>
          </button>

          <button
            onClick={() => setSubTab('all_archived')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              subTab === 'all_archived'
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Archived ({archivedTasks.length})</span>
          </button>
        </div>
      </div>

      {/* Grid or Empty State */}
      {currentList.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-[#0f172a]/60 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Archive className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            No {subTab === 'completed' ? 'Completed' : subTab === 'missed' ? 'Missed' : 'Archived'}{' '}
            Tasks
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {subTab === 'completed'
              ? 'When you mark assignments, quizzes, or GDBs as Submitted, they will appear here.'
              : subTab === 'missed'
              ? 'Great job! You have no overdue or missed academic deadlines.'
              : 'Archived semester tasks will be preserved here instead of being deleted permanently.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onSelect={onSelectTask}
              onEdit={onEditTask}
              onToggleStatus={onToggleStatus}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
};
