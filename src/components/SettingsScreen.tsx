import React, { useState, useRef } from 'react';
import { AppSettings, Task, BackupData, ReminderThresholds } from '../types';
import { playReminderChime } from '../utils/audioAlert';
import { validateBackup, mergeTasks } from '../utils/backupValidation';
import { exportTasksToIcs } from '../utils/icsExport';
import { runAllUnitTests, TestResult } from '../utils/unitTests';
import {
  Bell,
  Volume2,
  VolumeX,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Check,
  CheckCircle2,
  Calendar,
  Sparkles,
  TestTube,
  Info,
} from 'lucide-react';

interface SettingsScreenProps {
  settings: AppSettings;
  tasks: Task[];
  onUpdateSettings: (settings: AppSettings) => void;
  onRestoreBackup: (tasks: Task[], settings: AppSettings) => void;
  onResetSettings: () => void;
  onEraseAllData: () => void;
  onToggleDevSeed: (enabled: boolean) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  tasks,
  onUpdateSettings,
  onRestoreBackup,
  onResetSettings,
  onEraseAllData,
  onToggleDevSeed,
}) => {
  const [showEraseModal, setShowEraseModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [backupStatusMessage, setBackupStatusMessage] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);
  const [importConflictData, setImportConflictData] = useState<{
    importedTasks: Task[];
    importedSettings: AppSettings;
  } | null>(null);

  // Test suite state
  const [testResults, setTestResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleThresholdToggle = (key: keyof ReminderThresholds) => {
    const updated: AppSettings = {
      ...settings,
      reminderThresholds: {
        ...settings.reminderThresholds,
        [key]: !settings.reminderThresholds[key],
      },
    };
    onUpdateSettings(updated);
  };

  const handleSoundToggle = () => {
    const updated: AppSettings = {
      ...settings,
      soundEnabled: !settings.soundEnabled,
    };
    onUpdateSettings(updated);
    if (!settings.soundEnabled) {
      playReminderChime(settings.soundVolume);
    }
  };

  const handleVolumeChange = (vol: number) => {
    const updated: AppSettings = {
      ...settings,
      soundVolume: vol,
    };
    onUpdateSettings(updated);
  };

  const handleTestAudio = () => {
    playReminderChime(settings.soundVolume);
  };

  const handleRequestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateSettings({ ...settings, notificationsEnabled: true });
        new Notification('VU Smart Deadline Manager', {
          body: 'Browser notifications enabled for academic deadlines.',
          icon: '/favicon.ico',
        });
      } else {
        alert('Browser notification permission was denied. You can re-enable it in your browser site settings.');
      }
    } else {
      alert('Your browser does not support the Web Notifications API.');
    }
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const backup: BackupData = {
      schemaVersion: 1,
      appName: 'VU Smart Deadline Manager',
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `vu_deadlines_backup_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onUpdateSettings({ ...settings, lastBackupDate: new Date().toISOString() });
    setBackupStatusMessage({
      text: `Backup exported successfully (${tasks.length} tasks).`,
      isError: false,
    });
  };

  // Import JSON Backup
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const validation = validateBackup(content);

      if (!validation.isValid || !validation.data) {
        setBackupStatusMessage({
          text: validation.error || 'Failed to validate backup file.',
          isError: true,
        });
        return;
      }

      // Check if existing tasks present to prompt merge vs overwrite
      if (tasks.length > 0) {
        setImportConflictData({
          importedTasks: validation.data.tasks,
          importedSettings: validation.data.settings,
        });
      } else {
        onRestoreBackup(validation.data.tasks, validation.data.settings);
        setBackupStatusMessage({
          text: `Successfully restored ${validation.data.tasks.length} tasks.`,
          isError: false,
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResolveConflict = (strategy: 'merge' | 'overwrite') => {
    if (!importConflictData) return;

    if (strategy === 'merge') {
      const merged = mergeTasks(tasks, importConflictData.importedTasks);
      onRestoreBackup(merged, importConflictData.importedSettings);
      setBackupStatusMessage({
        text: `Merged ${importConflictData.importedTasks.length} backup tasks into existing list (Total: ${merged.length}).`,
        isError: false,
      });
    } else {
      onRestoreBackup(importConflictData.importedTasks, importConflictData.importedSettings);
      setBackupStatusMessage({
        text: `Overwrote all existing tasks with ${importConflictData.importedTasks.length} tasks from backup.`,
        isError: false,
      });
    }

    setImportConflictData(null);
  };

  const handleRunTests = () => {
    const results = runAllUnitTests();
    setTestResults(results);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Settings & Preferences
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Configure Pakistan Standard Time reminders, backup data, audio, and device storage.
        </p>
      </div>

      {/* Backup Status Alert */}
      {backupStatusMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
            backupStatusMessage.isError
              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
          }`}
        >
          {backupStatusMessage.isError ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{backupStatusMessage.text}</span>
        </div>
      )}

      {/* 1. Reminder Thresholds */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Reminder Thresholds</h3>
            <p className="text-xs text-slate-400">
              When deadline approaches, display alert banners and play optional audio chimes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {[
            { key: 'h72' as const, label: '72 Hours Before (3 days)', desc: 'Early warning for large assignments' },
            { key: 'h24' as const, label: '24 Hours Before (1 day)', desc: 'Crucial for 24h quiz openings' },
            { key: 'h6' as const, label: '6 Hours Before', desc: 'Urgent submission check' },
            { key: 'h1' as const, label: '1 Hour Before', desc: 'Final call before portal closes' },
            { key: 'atDeadline' as const, label: 'At Deadline (Due Now)', desc: 'Marks overdue transition' },
          ].map((t) => (
            <label
              key={t.key}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={settings.reminderThresholds[t.key]}
                onChange={() => handleThresholdToggle(t.key)}
                className="mt-0.5 rounded border-slate-700 text-sky-500 focus:ring-sky-500 w-4 h-4"
              />
              <div>
                <span className="text-xs font-semibold text-white block">{t.label}</span>
                <span className="text-[11px] text-slate-400">{t.desc}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Audio & Notification System */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Volume2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Sound Alerts & Notifications</h3>
            <p className="text-xs text-slate-400">
              Synthesized Web Audio chime (never loops, user controlled, off by default).
            </p>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          {/* Sound toggle & test */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSoundToggle}
                className={`p-2 rounded-lg transition-colors ${
                  settings.soundEnabled
                    ? 'bg-sky-500/20 text-sky-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {settings.soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
              <div>
                <p className="text-xs font-semibold text-white">
                  Audio Alerts: {settings.soundEnabled ? 'Enabled' : 'Disabled (Default)'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Plays a gentle double-sine tone once when an urgent deadline threshold is reached.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {settings.soundEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">
                    {Math.round(settings.soundVolume * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.soundVolume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-24 accent-sky-500"
                  />
                </div>
              )}

              <button
                onClick={handleTestAudio}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Test Sound
              </button>
            </div>
          </div>

          {/* Browser Notification Permission */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-white">Browser Notifications</p>
              <p className="text-[11px] text-slate-400 max-w-md">
                Display pop-up system banners when the browser is running.
              </p>
            </div>
            <button
              onClick={handleRequestNotificationPermission}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-colors shrink-0"
            >
              {settings.notificationsEnabled ? 'Permission Granted' : 'Enable Web Notifications'}
            </button>
          </div>

          {/* Browser Limitation Disclaimer */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-3">
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-300">Device & Browser Constraints:</strong> Web browsers
              do not execute timers or play alarms while the device is sleeping or the browser is fully
              closed. To guarantee you never miss a deadline when your PC is shut down, use the{' '}
              <button
                onClick={() => exportTasksToIcs(tasks, 'vu_all_deadlines.ics')}
                className="text-sky-400 underline font-semibold"
              >
                Export to Calendar (.ics)
              </button>{' '}
              feature to sync reminders into Google Calendar, Outlook, or Apple Calendar on your phone.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Backup, Restore & Sharing */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Backup & Restore</h3>
            <p className="text-xs text-slate-400">
              Export your academic schedule as portable JSON or restore on another device.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Export JSON */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white mb-1">Export JSON Backup</h4>
              <p className="text-[11px] text-slate-400">
                Downloads a verified JSON file containing all tasks, instructions, and settings.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup ({tasks.length} tasks)</span>
            </button>
          </div>

          {/* Import JSON */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white mb-1">Restore from Backup</h4>
              <p className="text-[11px] text-slate-400">
                Imports tasks with strict schemaVersion and Zod validation checks.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Import JSON File</span>
            </button>
          </div>
        </div>

        {/* Weekly Backup Nudge Notice */}
        <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <span>
            Last exported:{' '}
            {settings.lastBackupDate
              ? new Date(settings.lastBackupDate).toLocaleDateString()
              : 'Never'}
          </span>
          <span className="text-sky-400/90 font-medium">
            Tip: Export a backup before major LMS updates or device switching.
          </span>
        </div>
      </div>

      {/* 4. Automated Unit Test Runner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <TestTube className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Automated Unit Test Suite</h3>
              <p className="text-xs text-slate-400">
                Verifies snooze math, threshold selection, duplicate detection, timezone countdown, and
                backup validation.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTests}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors shadow-md shadow-sky-500/20"
          >
            <TestTube className="w-3.5 h-3.5" />
            <span>Run All Tests</span>
          </button>
        </div>

        {testResults && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold pb-2 border-b border-slate-800">
              <span className="text-white">
                Test Summary: {testResults.passed} of {testResults.total} Passed
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  testResults.failed === 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {testResults.failed === 0 ? 'ALL PASSED ✓' : `${testResults.failed} FAILED`}
              </span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {testResults.results.map((res, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between gap-3 text-[11px] p-2 rounded bg-slate-900"
                >
                  <div>
                    <span className="text-slate-400 font-mono">[{res.category}] </span>
                    <span className="text-slate-200 font-medium">{res.name}</span>
                    <p className="text-slate-500 text-[10px] mt-0.5">{res.message}</p>
                  </div>
                  <span
                    className={`shrink-0 font-bold ${
                      res.passed ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {res.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Developer Toggle for Realistic Seed Data */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Developer Seed Data Toggle</h3>
              <p className="text-xs text-slate-400">
                Populate realistic VU tasks (CS504 Assignment, MTH302 Quiz, ENG101 GDB) for testing.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.devSeedEnabled}
              onChange={(e) => onToggleDevSeed(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500" />
          </label>
        </div>
      </div>

      {/* 6. Reset & Erase Actions */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a] border border-rose-500/20 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Danger Zone & Storage Reset</h3>
            <p className="text-xs text-slate-400">
              Reset settings or wipe local device database completely.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Reset Settings */}
          <button
            onClick={onResetSettings}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>Reset Settings to Defaults (Keeps Tasks)</span>
          </button>

          {/* Erase All Data */}
          <button
            onClick={() => setShowEraseModal(true)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Erase All Data on This Device</span>
          </button>
        </div>
      </div>

      {/* Backup Conflict Resolution Modal (Merge vs Overwrite) */}
      {importConflictData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-white mb-2">Import Conflict Handling</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              You already have {tasks.length} task(s) stored on this device. Would you like to merge the{' '}
              {importConflictData.importedTasks.length} imported tasks with your existing records or
              overwrite everything?
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handleResolveConflict('merge')}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Merge Tasks (Recommended - Keeps Both)
              </button>
              <button
                onClick={() => handleResolveConflict('overwrite')}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs border border-slate-700 transition-colors"
              >
                Overwrite Existing Tasks
              </button>
              <button
                onClick={() => setImportConflictData(null)}
                className="w-full py-2 text-xs text-slate-500 hover:text-slate-400"
              >
                Cancel Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erase All Data Modal (Requires typing RESET) */}
      {showEraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0f172a] border border-rose-500/40 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Erase All Local Data?</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              This will permanently delete all {tasks.length} task records, preferences, and custom notes
              from your device's IndexedDB. This action cannot be undone.
            </p>

            {/* Offer Export First */}
            <button
              onClick={() => {
                handleExportBackup();
              }}
              className="mb-4 w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Backup First (Recommended)</span>
            </button>

            <div className="mb-4">
              <label className="block text-[11px] text-slate-400 mb-1">
                Type <strong className="text-rose-400 font-mono">RESET</strong> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white font-mono uppercase focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEraseModal(false);
                  setResetConfirmText('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={resetConfirmText !== 'RESET'}
                onClick={() => {
                  onEraseAllData();
                  setShowEraseModal(false);
                  setResetConfirmText('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                  resetConfirmText === 'RESET'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                Confirm Erase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
