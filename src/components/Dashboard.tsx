import React, { useState, useMemo } from 'react';
import { Task, ActivityType, isTaskOverdue } from '../types';
import { TaskCard } from './TaskCard';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Calendar,
} from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onToggleStatus: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onOpenNewTask: () => void;
}

export type DashboardTab =
  | 'all'
  | 'Assignment'
  | 'Quiz'
  | 'GDB'
  | 'Exam'
  | 'Announcement'
  | 'completed'
  | 'overdue';

export const Dashboard: React.FC<DashboardProps> = ({
  tasks,
  onSelectTask,
  onEditTask,
  onToggleStatus,
  onDeleteTask,
  onOpenNewTask,
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline_asc' | 'deadline_desc' | 'course' | 'newest'>(
    'deadline_asc'
  );

  // Compute metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const activeTasks = tasks.filter((t) => t.status !== 'Submitted' && !t.archived);
    const overdue = tasks.filter((t) => isTaskOverdue(t, now));
    const completed = tasks.filter((t) => t.status === 'Submitted');

    const dueIn24h = activeTasks.filter((t) => {
      if (!t.deadline) return false;
      const diffHours = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    });

    const dueThisWeek = activeTasks.filter((t) => {
      if (!t.deadline) return false;
      const diffHours = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 168; // 7 days
    });

    return {
      activeCount: activeTasks.length,
      dueIn24hCount: dueIn24h.length,
      dueThisWeekCount: dueThisWeek.length,
      overdueCount: overdue.length,
      completedCount: completed.length,
    };
  }, [tasks]);

  // Unique course codes for filter dropdown
  const uniqueCourses = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.courseCode) set.add(t.courseCode.toUpperCase());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    const now = new Date();

    return tasks
      .filter((task) => {
        // Tab filtering
        if (activeTab === 'completed') {
          if (task.status !== 'Submitted') return false;
        } else if (activeTab === 'overdue') {
          if (!isTaskOverdue(task, now)) return false;
        } else if (activeTab !== 'all') {
          if (task.type !== activeTab) return false;
          // Don't clutter with submitted unless in completed view
          if (task.status === 'Submitted') return false;
        } else {
          // In "all", hide submitted so active tasks take priority
          if (task.status === 'Submitted') return false;
        }

        // Course filter
        if (selectedCourse !== 'all' && task.courseCode.toUpperCase() !== selectedCourse) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchCourse = task.courseCode.toLowerCase().includes(q);
          const matchTitle = task.title.toLowerCase().includes(q);
          const matchName = task.courseName?.toLowerCase().includes(q);
          const matchInstructions = task.instructions?.toLowerCase().includes(q);
          if (!matchCourse && !matchTitle && !matchName && !matchInstructions) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline_asc') {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        if (sortBy === 'deadline_desc') {
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        }
        if (sortBy === 'course') {
          return a.courseCode.localeCompare(b.courseCode);
        }
        // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [tasks, activeTab, selectedCourse, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* KPI Overview Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Active Tasks
            </span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums">
              {metrics.activeCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Due within 24h
            </span>
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {metrics.dueIn24hCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Overdue
            </span>
            <span className="text-2xl font-bold text-rose-400 font-mono tabular-nums">
              {metrics.overdueCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Completed
            </span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {metrics.completedCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all' as const, label: 'All Active' },
          { id: 'Assignment' as const, label: 'Assignments' },
          { id: 'Quiz' as const, label: 'Quizzes' },
          { id: 'GDB' as const, label: 'GDBs' },
          { id: 'Exam' as const, label: 'Exams' },
          { id: 'Announcement' as const, label: 'Announcements' },
          { id: 'overdue' as const, label: `Overdue (${metrics.overdueCount})` },
          { id: 'completed' as const, label: `Completed (${metrics.completedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-sky-500 text-slate-950 font-bold shadow-md shadow-sky-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search, Course Filter, and Sort Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0f172a] border border-slate-800">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by course code, title, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Course filter */}
          {uniqueCourses.length > 0 && (
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="all">All Courses</option>
              {uniqueCourses.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="deadline_asc">Due Date (Earliest first)</option>
            <option value="deadline_desc">Due Date (Latest first)</option>
            <option value="course">Course Code (A-Z)</option>
            <option value="newest">Recently Added</option>
          </select>

          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Task Cards Grid or Empty State */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-[#0f172a]/60 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Academic Tasks Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
            {searchQuery
              ? 'No tasks matched your current search criteria.'
              : 'You have no deadlines under this view. Upload an LMS screenshot or create one manually.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onOpenNewTask}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
            >
              + Create Manual Task
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map((task) => (
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
