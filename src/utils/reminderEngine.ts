import { Task, ReminderThresholds, ReminderMode } from '../types';

export interface ActiveReminderAlert {
  task: Task;
  thresholdKey: 'h72' | 'h24' | 'h6' | 'h1' | 'atDeadline';
  thresholdLabel: string;
  hoursRemaining: number;
  canSnooze: boolean;
  snoozeUntilIso: string | null;
}

export const THRESHOLD_DEFINITIONS: Array<{
  key: keyof ReminderThresholds;
  hours: number;
  label: string;
  badge: string;
}> = [
  { key: 'atDeadline', hours: 0, label: 'Deadline is Due Now!', badge: 'At Deadline' },
  { key: 'h1', hours: 1, label: 'Due in less than 1 hour', badge: '1 Hour Left' },
  { key: 'h6', hours: 6, label: 'Due in less than 6 hours', badge: '6 Hours Left' },
  { key: 'h24', hours: 24, label: 'Due within 24 hours', badge: '24 Hours Left' },
  { key: 'h72', hours: 72, label: 'Due within 3 days', badge: '72 Hours Left' },
];

/**
 * Calculates snooze target ISO string: min(now + 24h, deadline - 1h)
 * If deadline is < 1 hour away from now, snooze is not permitted (returns null).
 */
export function calculateSnoozeTarget(
  deadlineIso: string | null,
  nowDate: Date = new Date()
): { canSnooze: boolean; snoozeUntilIso: string | null; reason?: string } {
  if (!deadlineIso) {
    return { canSnooze: false, snoozeUntilIso: null, reason: 'No deadline' };
  }

  const deadline = new Date(deadlineIso);
  const nowMs = nowDate.getTime();
  const deadlineMs = deadline.getTime();
  const diffHours = (deadlineMs - nowMs) / (1000 * 60 * 60);

  // If deadline is under 1 hour away or already passed, cannot snooze
  if (diffHours <= 1) {
    return {
      canSnooze: false,
      snoozeUntilIso: null,
      reason: 'Deadline is less than 1 hour away',
    };
  }

  const plus24HoursMs = nowMs + 24 * 60 * 60 * 1000;
  const minus1HourMs = deadlineMs - 1 * 60 * 60 * 1000;

  // Take the minimum of (now + 24h) and (deadline - 1h)
  const targetMs = Math.min(plus24HoursMs, minus1HourMs);
  const targetDate = new Date(targetMs);

  return {
    canSnooze: true,
    snoozeUntilIso: targetDate.toISOString(),
  };
}

/**
 * Evaluates a single task against enabled thresholds and reminderState.
 * Returns the single most urgent reminder alert, or null if no reminder is active.
 */
export function getActiveReminderForTask(
  task: Task,
  thresholds: ReminderThresholds,
  nowDate: Date = new Date()
): ActiveReminderAlert | null {
  // If task is submitted or archived, no reminders
  if (task.status === 'Submitted' || task.archived) {
    return null;
  }

  // If reminderState is acknowledged, cancel all remaining reminders
  if (task.reminderState.mode === 'acknowledged') {
    return null;
  }

  // If task is snoozed, check if snooze period has expired
  if (task.reminderState.mode === 'snoozed') {
    const snoozeUntil = new Date(task.reminderState.until);
    if (nowDate.getTime() < snoozeUntil.getTime()) {
      // Still currently snoozed
      return null;
    }
  }

  if (!task.deadline) {
    return null;
  }

  const deadline = new Date(task.deadline);
  const diffMs = deadline.getTime() - nowDate.getTime();

  // If deadline passed by more than 24 hours, don't show active reminder banner (it moves to overdue tab)
  if (diffMs < -24 * 60 * 60 * 1000) {
    return null;
  }

  const diffHours = diffMs / (1000 * 60 * 60);

  // Evaluate from most urgent (atDeadline, h1, h6, h24, h72)
  for (const t of THRESHOLD_DEFINITIONS) {
    if (!thresholds[t.key]) continue;

    let matches = false;
    if (t.key === 'atDeadline') {
      matches = diffHours <= 0 && diffHours >= -24;
    } else {
      matches = diffHours > 0 && diffHours <= t.hours;
    }

    if (matches) {
      const { canSnooze, snoozeUntilIso } = calculateSnoozeTarget(task.deadline, nowDate);
      return {
        task,
        thresholdKey: t.key,
        thresholdLabel: t.label,
        hoursRemaining: diffHours,
        canSnooze,
        snoozeUntilIso,
      };
    }
  }

  return null;
}

/**
 * Finds all active reminders across tasks and returns them sorted by urgency.
 * In accordance with user rules: If multiple thresholds were missed, show only the most urgent one per task.
 */
export function getActiveReminders(
  tasks: Task[],
  thresholds: ReminderThresholds,
  nowDate: Date = new Date()
): ActiveReminderAlert[] {
  const alerts: ActiveReminderAlert[] = [];

  for (const task of tasks) {
    const alert = getActiveReminderForTask(task, thresholds, nowDate);
    if (alert) {
      alerts.push(alert);
    }
  }

  // Sort by closest deadline (most urgent first)
  return alerts.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
}
