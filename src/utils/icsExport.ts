import { Task } from '../types';
import { formatInPKT } from './dateUtils';

/**
 * Formats a JS Date into iCalendar UTC timestamp format (YYYYMMDDTHHMMSSZ)
 */
function toIcsTimestamp(date: Date): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escapes characters according to RFC 5545 specification
 */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant VEVENT string for a single Task
 */
export function taskToVEvent(task: Task): string | null {
  if (!task.deadline) return null;

  const deadlineDate = new Date(task.deadline);
  if (isNaN(deadlineDate.getTime())) return null;

  // Set start time 1 hour before deadline (or opening date if available)
  let startDate = new Date(deadlineDate.getTime() - 60 * 60 * 1000);
  if (task.openingDate) {
    const op = new Date(task.openingDate);
    if (!isNaN(op.getTime()) && op.getTime() < deadlineDate.getTime()) {
      startDate = op;
    }
  }

  const now = new Date();
  const uid = `${task.id}@vusmartdeadline.app`;
  const summary = `[${task.courseCode}] ${task.type}: ${task.title}`;
  const pktDeadline = formatInPKT(task.deadline);

  const descriptionLines = [
    `Virtual University of Pakistan Academic Deadline`,
    `Course: ${task.courseCode} ${task.courseName ? `- ${task.courseName}` : ''}`,
    `Type: ${task.type}`,
    `Deadline: ${pktDeadline}`,
    task.totalMarks ? `Total Marks: ${task.totalMarks}` : '',
    task.gracePeriod ? `Grace Period: ${task.gracePeriod}` : '',
    task.instructions ? `Instructions: ${task.instructions}` : '',
    task.notes ? `Student Notes: ${task.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsTimestamp(now)}`,
    `DTSTART:${toIcsTimestamp(startDate)}`,
    `DTEND:${toIcsTimestamp(deadlineDate)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descriptionLines)}`,
    `CATEGORIES:${task.type},VU,Academics`,
    'STATUS:CONFIRMED',
    // 24 Hour Alarm
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:VU Deadline in 24 hours',
    'TRIGGER:-P1D',
    'END:VALARM',
    // 1 Hour Alarm
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:VU Deadline in 1 hour!',
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Exports one or more tasks as a downloadable .ics file
 */
export function exportTasksToIcs(tasks: Task[], fileName: string = 'vu_academic_deadlines.ics') {
  const events: string[] = [];

  for (const t of tasks) {
    const vEvent = taskToVEvent(t);
    if (vEvent) {
      events.push(vEvent);
    }
  }

  if (events.length === 0) {
    alert('No tasks with valid deadlines to export.');
    return;
  }

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VU Smart Deadline Manager//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:VU Academic Deadlines',
    'X-WR-TIMEZONE:Asia/Karachi',
    events.join('\r\n'),
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
