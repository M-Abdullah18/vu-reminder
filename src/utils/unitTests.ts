import { calculateSnoozeTarget, getActiveReminderForTask } from './reminderEngine';
import { checkDuplicate } from './duplicateDetector';
import { getRemainingTime, pktToUtcIso, formatInPKT } from './dateUtils';
import { validateBackup } from './backupValidation';
import { Task, ReminderThresholds } from '../types';

export interface TestResult {
  name: string;
  category:
    | 'Snooze Calculation'
    | 'Reminder Thresholds'
    | 'Duplicate Detection'
    | 'Timezone Countdown'
    | 'Backup Validation';
  passed: boolean;
  message: string;
  details?: string;
}

export function runAllUnitTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  // ==========================================
  // 1. SNOOZE CALCULATION TESTS
  // ==========================================
  {
    // Case 1a: Deadline is 48 hours away. Snooze should be min(now + 24h, deadline - 1h) -> now + 24h
    const now = new Date('2026-11-01T10:00:00Z');
    const deadline48h = '2026-11-03T10:00:00Z';
    const resA = calculateSnoozeTarget(deadline48h, now);
    const expectedA = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    results.push({
      name: 'Snooze: Deadline > 25h triggers 24h snooze',
      category: 'Snooze Calculation',
      passed: resA.canSnooze && resA.snoozeUntilIso === expectedA,
      message: resA.canSnooze ? `Snoozed until ${resA.snoozeUntilIso}` : 'Failed to snooze',
    });

    // Case 1b: Deadline is 5 hours away. Snooze should be min(now + 24h, deadline - 1h) -> deadline - 1h (now + 4h)
    const deadline5h = new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString();
    const resB = calculateSnoozeTarget(deadline5h, now);
    const expectedB = new Date(new Date(deadline5h).getTime() - 1 * 60 * 60 * 1000).toISOString();
    results.push({
      name: 'Snooze: Deadline < 25h caps snooze at (deadline - 1h)',
      category: 'Snooze Calculation',
      passed: resB.canSnooze && resB.snoozeUntilIso === expectedB,
      message: resB.canSnooze ? `Snoozed to deadline - 1h (${resB.snoozeUntilIso})` : 'Failed',
    });

    // Case 1c: Deadline is 45 minutes away (< 1h). Snooze should be disabled
    const deadline45m = new Date(now.getTime() + 45 * 60 * 1000).toISOString();
    const resC = calculateSnoozeTarget(deadline45m, now);
    results.push({
      name: 'Snooze: Disabled when deadline is < 1h away',
      category: 'Snooze Calculation',
      passed: !resC.canSnooze && resC.snoozeUntilIso === null,
      message: !resC.canSnooze ? 'Correctly disallowed snooze under 1 hour' : 'Incorrectly allowed snooze',
    });
  }

  // ==========================================
  // 2. REMINDER THRESHOLD SELECTION TESTS
  // ==========================================
  {
    const defaultThresholds: ReminderThresholds = {
      h72: true,
      h24: true,
      h6: true,
      h1: true,
      atDeadline: true,
    };

    const mockBaseTask: Task = {
      id: 'test-task-1',
      schemaVersion: 1,
      courseCode: 'CS504',
      courseName: 'Software Engineering',
      type: 'Assignment',
      title: 'Assignment 1',
      instructions: '',
      openingDate: null,
      deadline: null,
      deadlineHasTime: true,
      status: 'Pending',
      archived: false,
      notes: '',
      source: { fileName: 'test.png', pageRef: '1', importedAt: new Date().toISOString() },
      fieldConfidence: {
        courseCode: 'High',
        title: 'High',
        deadline: 'High',
        overall: 'High',
        rationale: 'test',
      },
      needsConfirmation: [],
      reminderState: { mode: 'active' },
      totalMarks: '',
      gracePeriod: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const now = new Date('2026-11-01T12:00:00Z');

    // Case 2a: Both 72h and 24h thresholds missed (e.g., 18h remaining). Should select ONLY h24 (most urgent)
    const task18h: Task = {
      ...mockBaseTask,
      deadline: new Date(now.getTime() + 18 * 60 * 60 * 1000).toISOString(),
    };
    const alertA = getActiveReminderForTask(task18h, defaultThresholds, now);
    results.push({
      name: 'Threshold: Multiple missed thresholds select ONLY most urgent (h24 over h72)',
      category: 'Reminder Thresholds',
      passed: alertA !== null && alertA.thresholdKey === 'h24',
      message: alertA ? `Selected threshold ${alertA.thresholdKey}` : 'No alert generated',
    });

    // Case 2b: Acknowledged task should produce NO alert
    const ackTask: Task = {
      ...task18h,
      reminderState: { mode: 'acknowledged' },
    };
    const alertB = getActiveReminderForTask(ackTask, defaultThresholds, now);
    results.push({
      name: 'Threshold: Acknowledged reminder state suppresses all alerts',
      category: 'Reminder Thresholds',
      passed: alertB === null,
      message: alertB === null ? 'Correctly suppressed' : 'Failed: alert was generated',
    });
  }

  // ==========================================
  // 3. DUPLICATE DETECTION TESTS
  // ==========================================
  {
    const existingTasks: Task[] = [
      {
        id: 'dup-task-1',
        schemaVersion: 1,
        courseCode: 'CS504',
        courseName: 'Software Engineering - I',
        type: 'Assignment',
        title: 'Assignment # 1 - Fall 2026',
        instructions: '',
        openingDate: null,
        deadline: '2026-11-15T18:59:00.000Z',
        deadlineHasTime: true,
        status: 'Pending',
        archived: false,
        notes: '',
        source: { fileName: 'manual', pageRef: 'N/A', importedAt: new Date().toISOString() },
        fieldConfidence: {
          courseCode: 'High',
          title: 'High',
          deadline: 'High',
          overall: 'High',
          rationale: 'test',
        },
        needsConfirmation: [],
        reminderState: { mode: 'active' },
        totalMarks: '',
        gracePeriod: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Case 3a: Same course, same type, minor punctuation variance ("assignment 1 fall 2026"), deadline 2h apart
    const candidateDup = {
      courseCode: 'cs504',
      type: 'Assignment' as const,
      title: 'assignment 1 fall 2026',
      deadline: '2026-11-15T20:59:00.000Z', // 2 hours difference
    };
    const dupResultA = checkDuplicate(candidateDup as any, existingTasks);
    results.push({
      name: 'Duplicate: Matches normalized title + same course + deadline within 6h',
      category: 'Duplicate Detection',
      passed: dupResultA.isDuplicate === true,
      message: dupResultA.isDuplicate
        ? `Detected match (${Math.round(dupResultA.similarityScore * 100)}% similarity)`
        : 'Failed to detect duplicate',
    });

    // Case 3b: Different course code -> Not a duplicate
    const candidateDiffCourse = {
      ...candidateDup,
      courseCode: 'CS601',
    };
    const dupResultB = checkDuplicate(candidateDiffCourse as any, existingTasks);
    results.push({
      name: 'Duplicate: Different course code is NOT a duplicate',
      category: 'Duplicate Detection',
      passed: dupResultB.isDuplicate === false,
      message: !dupResultB.isDuplicate ? 'Correctly flagged as distinct' : 'Incorrectly flagged duplicate',
    });
  }

  // ==========================================
  // 4. TIMEZONE COUNTDOWN TESTS
  // ==========================================
  {
    // In PKT (UTC+5), 23:59 on Nov 15 is 18:59 UTC on Nov 15
    const pktDate = '2026-11-15';
    const pktTime = '23:59';
    const utcIso = pktToUtcIso(pktDate, pktTime);
    const expectedUtc = '2026-11-15T18:59:00.000Z';

    results.push({
      name: 'Timezone: Converts PKT (UTC+5) to canonical UTC ISO',
      category: 'Timezone Countdown',
      passed: utcIso === expectedUtc,
      message: `Converted ${pktDate} ${pktTime} PKT -> ${utcIso}`,
    });

    // Test remaining countdown calculation
    const now = new Date('2026-11-15T16:59:00.000Z'); // 2 hours before deadline
    const countdown = getRemainingTime(utcIso, now);

    results.push({
      name: 'Timezone: Accurate countdown calculation (2h left -> urgent)',
      category: 'Timezone Countdown',
      passed: countdown.hours === 2 && countdown.minutes === 0 && countdown.urgency === 'urgent',
      message: `Remaining: ${countdown.formatted}, urgency: ${countdown.urgency}`,
    });
  }

  // ==========================================
  // 5. BACKUP IMPORT VALIDATION TESTS
  // ==========================================
  {
    // Case 5a: Corrupted JSON syntax
    const badJson = '{ "schemaVersion": 1, "tasks": [ }';
    const resA = validateBackup(badJson);
    results.push({
      name: 'Backup: Rejects malformed JSON syntax',
      category: 'Backup Validation',
      passed: resA.isValid === false,
      message: resA.error || 'Rejected properly',
    });

    // Case 5b: Unsupported schema version
    const wrongVersion = JSON.stringify({
      schemaVersion: 99,
      appName: 'VU Smart Deadline Manager',
      exportedAt: new Date().toISOString(),
      tasks: [],
      settings: {},
    });
    const resB = validateBackup(wrongVersion);
    results.push({
      name: 'Backup: Rejects invalid schemaVersion',
      category: 'Backup Validation',
      passed: resB.isValid === false && Boolean(resB.error?.includes('schema version')),
      message: resB.error || 'Properly caught version mismatch',
    });
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
