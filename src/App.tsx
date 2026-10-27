import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Task,
  AppSettings,
  ExtractionResponse,
  ExtractedTask,
  ReminderMode,
  isTaskOverdue,
} from './types';
import { StorageRepository, DEFAULT_SETTINGS } from './storage/db';
import { getActiveReminders, ActiveReminderAlert } from './utils/reminderEngine';
import { playReminderChime } from './utils/audioAlert';
import { getDeveloperSeedTasks } from './utils/devSeedData';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { ReminderBanner } from './components/ReminderBanner';
import { Dashboard } from './components/Dashboard';
import { UploadScreen } from './components/UploadScreen';
import { AIReviewScreen } from './components/AIReviewScreen';
import { ArchiveScreen } from './components/ArchiveScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { TaskModal } from './components/TaskModal';
import { TaskDetailsModal } from './components/TaskDetailsModal';
import { TestRunnerModal } from './components/TestRunnerModal';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // AI Extraction Review state
  const [reviewData, setReviewData] = useState<{
    tasks: ExtractedTask[];
    fileName: string;
  } | null>(null);

  // Active Reminder Alert state
  const [activeAlert, setActiveAlert] = useState<ActiveReminderAlert | null>(null);
  const [dismissedAlertTaskId, setDismissedAlertTaskId] = useState<string | null>(null);

  // 10-Second Undo Toast state
  const [undoToast, setUndoToast] = useState<{
    message: string;
    countdown: number;
    onUndo: () => void;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Load from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        const [savedTasks, savedSettings] = await Promise.all([
          StorageRepository.getAllTasks(),
          StorageRepository.getSettings(),
        ]);
        setTasks(savedTasks);
        setSettings(savedSettings);
      } catch (err) {
        console.error('Failed to load initial storage:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Reminder Engine Ticker
  useEffect(() => {
    function evaluateReminders() {
      const alerts = getActiveReminders(tasks, settings.reminderThresholds);
      if (alerts.length > 0) {
        const topAlert = alerts[0];
        // If not dismissed in this session
        if (topAlert.task.id !== dismissedAlertTaskId) {
          setActiveAlert(topAlert);
          // Play optional sound if enabled
          if (settings.soundEnabled) {
            playReminderChime(settings.soundVolume);
          }
          return;
        }
      }
      setActiveAlert(null);
    }

    evaluateReminders();
    const interval = setInterval(evaluateReminders, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [tasks, settings, dismissedAlertTaskId]);

  // Handle Snooze ("Remind me later")
  const handleSnooze = async (alert: ActiveReminderAlert) => {
    if (!alert.snoozeUntilIso) return;

    const updatedTask: Task = {
      ...alert.task,
      reminderState: {
        mode: 'snoozed',
        until: alert.snoozeUntilIso,
      },
      updatedAt: new Date().toISOString(),
    };

    await StorageRepository.saveTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setActiveAlert(null);
    setDismissedAlertTaskId(alert.task.id);
  };

  // Handle Acknowledge ("Thanks, got it") with 10-Second Undo Toast
  const handleAcknowledge = async (alert: ActiveReminderAlert) => {
    const priorState = alert.task.reminderState;

    const updatedTask: Task = {
      ...alert.task,
      reminderState: { mode: 'acknowledged' },
      updatedAt: new Date().toISOString(),
    };

    await StorageRepository.saveTask(updatedTask);
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    setActiveAlert(null);

    // Trigger 10-second Undo toast
    triggerUndoToast('Reminder acknowledged (alerts cancelled)', async () => {
      // Undo callback
      const restoredTask: Task = {
        ...updatedTask,
        reminderState: priorState,
        updatedAt: new Date().toISOString(),
      };
      await StorageRepository.saveTask(restoredTask);
      setTasks((prev) => prev.map((t) => (t.id === restoredTask.id ? restoredTask : t)));
    });
  };

  // Helper for 10-second Undo Toast
  const triggerUndoToast = (message: string, onUndoCallback: () => void) => {
    if (undoTimerRef.current) clearInterval(undoTimerRef.current);

    let remaining = 10;
    setUndoToast({
      message,
      countdown: remaining,
      onUndo: () => {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        setUndoToast(null);
        onUndoCallback();
      },
    });

    undoTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (undoTimerRef.current) clearInterval(undoTimerRef.current);
        setUndoToast(null);
      } else {
        setUndoToast((prev) => (prev ? { ...prev, countdown: remaining } : null));
      }
    }, 1000);
  };

  // Resume Reminders from Task Details
  const handleResumeReminders = async (task: Task) => {
    const updated: Task = {
      ...task,
      reminderState: { mode: 'active' },
      updatedAt: new Date().toISOString(),
    };
    await StorageRepository.saveTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTaskDetails?.id === task.id) {
      setSelectedTaskDetails(updated);
    }
  };

  // Toggle Task Status (Pending / InProgress -> Submitted)
  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'Submitted' ? 'Pending' : 'Submitted';
    const updated: Task = {
      ...task,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    await StorageRepository.saveTask(updated);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (selectedTaskDetails?.id === task.id) {
      setSelectedTaskDetails(updated);
    }
  };

  // Save / Update Task from Modal
  const handleSaveTask = async (task: Task) => {
    await StorageRepository.saveTask(task);
    setTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === task.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = task;
        return copy;
      }
      return [task, ...prev];
    });
    setEditingTask(null);
    setIsTaskModalOpen(false);
  };

  // Delete Task with 10-Second Undo Toast
  const handleDeleteTask = async (task: Task) => {
    await StorageRepository.deleteTask(task.id);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (selectedTaskDetails?.id === task.id) {
      setSelectedTaskDetails(null);
    }

    triggerUndoToast(`Deleted task "${task.title}"`, async () => {
      await StorageRepository.saveTask(task);
      setTasks((prev) => [task, ...prev]);
    });
  };

  // Settings Updates
  const handleUpdateSettings = async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await StorageRepository.saveSettings(newSettings);
  };

  // Developer Seed Data Toggle
  const handleToggleDevSeed = async (enabled: boolean) => {
    const updated = { ...settings, devSeedEnabled: enabled };
    setSettings(updated);
    await StorageRepository.saveSettings(updated);

    if (enabled) {
      const seedTasks = getDeveloperSeedTasks();
      await StorageRepository.saveTasksBatch(seedTasks);
      setTasks((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        seedTasks.forEach((s) => map.set(s.id, s));
        return Array.from(map.values());
      });
    } else {
      // Remove seed tasks
      const seedIds = new Set(getDeveloperSeedTasks().map((s) => s.id));
      for (const id of seedIds) {
        await StorageRepository.deleteTask(id);
      }
      setTasks((prev) => prev.filter((t) => !seedIds.has(t.id)));
    }
  };

  // Reset Settings
  const handleResetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    await StorageRepository.saveSettings(DEFAULT_SETTINGS);
  };

  // Erase All Data
  const handleEraseAllData = async () => {
    await StorageRepository.clearAllData();
    setTasks([]);
    setSettings(DEFAULT_SETTINGS);
    setActiveAlert(null);
    setUndoToast(null);
  };

  // Restore Backup
  const handleRestoreBackup = async (importedTasks: Task[], importedSettings: AppSettings) => {
    await StorageRepository.saveTasksBatch(importedTasks);
    await StorageRepository.saveSettings(importedSettings);
    setTasks(importedTasks);
    setSettings(importedSettings);
  };

  // AI Review Ingestion
  const handleExtractionSuccess = (data: ExtractionResponse, fileName: string) => {
    setReviewData({
      tasks: data.tasks,
      fileName,
    });
  };

  const handleImportCompleted = async (finalTasks: Task[]) => {
    await StorageRepository.saveTasksBatch(finalTasks);
    setTasks((prev) => {
      const map = new Map(prev.map((t) => [t.id, t]));
      finalTasks.forEach((t) => map.set(t.id, t));
      return Array.from(map.values());
    });
    setReviewData(null);
    setActiveTab('dashboard');
  };

  // Urgent deadlines count for header
  const urgentCount = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      if (t.status === 'Submitted' || t.archived || !t.deadline) return false;
      const diffHours = (new Date(t.deadline).getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 24;
    }).length;
  }, [tasks]);

  const activePendingCount = useMemo(() => {
    return tasks.filter((t) => t.status !== 'Submitted' && !t.archived).length;
  }, [tasks]);

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans selection:bg-sky-500 selection:text-slate-950 flex flex-col pb-20 md:pb-8">
      {/* Top Header */}
      <Header
        urgentCount={urgentCount}
        onOpenTestModal={() => setIsTestModalOpen(true)}
        onOpenNewTask={() => {
          setEditingTask(null);
          setIsTaskModalOpen(true);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
        {/* Most Urgent Reminder Banner */}
        <ReminderBanner
          alert={activeAlert}
          onSnooze={handleSnooze}
          onAcknowledge={handleAcknowledge}
          onDismiss={() => {
            if (activeAlert) setDismissedAlertTaskId(activeAlert.task.id);
            setActiveAlert(null);
          }}
          undoToast={undoToast}
        />

        {/* Desktop Navigation Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <Navigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setReviewData(null);
              setActiveTab(tab);
            }}
            pendingCount={activePendingCount}
          />
        </div>

        {/* View Routing */}
        {reviewData ? (
          <AIReviewScreen
            extractedTasks={reviewData.tasks}
            fileName={reviewData.fileName}
            existingTasks={tasks}
            onImportCompleted={handleImportCompleted}
            onCancel={() => setReviewData(null)}
          />
        ) : activeTab === 'dashboard' || activeTab === 'tasks' ? (
          <Dashboard
            tasks={tasks}
            onSelectTask={(task) => setSelectedTaskDetails(task)}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDeleteTask={handleDeleteTask}
            onOpenNewTask={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
          />
        ) : activeTab === 'upload' ? (
          <UploadScreen
            onExtractionSuccess={handleExtractionSuccess}
            hasAgreedPrivacy={settings.hasAgreedPrivacy}
            onAgreePrivacy={() => handleUpdateSettings({ ...settings, hasAgreedPrivacy: true })}
          />
        ) : activeTab === 'archive' ? (
          <ArchiveScreen
            tasks={tasks}
            onSelectTask={(task) => setSelectedTaskDetails(task)}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onToggleStatus={handleToggleStatus}
            onDeleteTask={handleDeleteTask}
          />
        ) : activeTab === 'settings' ? (
          <SettingsScreen
            settings={settings}
            tasks={tasks}
            onUpdateSettings={handleUpdateSettings}
            onRestoreBackup={handleRestoreBackup}
            onResetSettings={handleResetSettings}
            onEraseAllData={handleEraseAllData}
            onToggleDevSeed={handleToggleDevSeed}
          />
        ) : null}
      </main>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialTask={editingTask}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={Boolean(selectedTaskDetails)}
        task={selectedTaskDetails}
        onClose={() => setSelectedTaskDetails(null)}
        onEdit={(task) => {
          setSelectedTaskDetails(null);
          setEditingTask(task);
          setIsTaskModalOpen(true);
        }}
        onToggleStatus={handleToggleStatus}
        onResumeReminders={handleResumeReminders}
      />

      {/* Automated Unit Test Runner Modal */}
      <TestRunnerModal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
      />

      {/* Disclaimer in Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 text-center text-xs text-slate-500 px-4">
        <p>
          VU Smart Deadline Manager is an independent academic productivity utility.
          <br className="hidden sm:inline" /> Not officially affiliated with or endorsed by Virtual
          University of Pakistan.
        </p>
      </footer>
    </div>
  );
}
