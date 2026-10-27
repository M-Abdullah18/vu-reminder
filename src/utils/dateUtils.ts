/**
 * Date and Time utilities for Virtual University of Pakistan (Asia/Karachi, UTC+5, No DST)
 * All deadlines are stored internally as UTC ISO 8601 strings.
 */

export const PKT_TIMEZONE = 'Asia/Karachi';
export const PKT_OFFSET_HOURS = 5;
export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

export interface RemainingTime {
  totalMs: number;
  isOverdue: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  urgency: 'unknown' | 'normal' | 'soon' | 'urgent' | 'critical' | 'overdue';
}

/**
 * Formats a UTC ISO string in Pakistan Standard Time (Asia/Karachi)
 */
export function formatInPKT(
  isoString: string | null | undefined,
  includeTime: boolean = true
): string {
  if (!isoString) {
    return 'Deadline unknown';
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Invalid date';

    const options: Intl.DateTimeFormatOptions = {
      timeZone: PKT_TIMEZONE,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }
        : {}),
    };

    const formatted = new Intl.DateTimeFormat('en-GB', options).format(date);
    return `${formatted} PKT`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats in user local device timezone with PKT subtext if different
 */
export function formatLocalWithPkt(isoString: string | null | undefined): {
  pktString: string;
  localString: string;
  isDifferentTimezone: boolean;
} {
  const pktString = formatInPKT(isoString);
  if (!isoString) {
    return { pktString, localString: pktString, isDifferentTimezone: false };
  }

  try {
    const date = new Date(isoString);
    const localString = new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);

    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const isDifferent = userTimezone !== PKT_TIMEZONE && userTimezone !== 'Etc/GMT-5';

    return { pktString, localString: `${localString} (Local)`, isDifferentTimezone: isDifferent };
  } catch {
    return { pktString, localString: pktString, isDifferentTimezone: false };
  }
}

/**
 * Calculates countdown from now to deadline
 */
export function getRemainingTime(
  deadlineIso: string | null | undefined,
  nowDate: Date = new Date()
): RemainingTime {
  if (!deadlineIso) {
    return {
      totalMs: 0,
      isOverdue: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'No deadline set',
      urgency: 'unknown',
    };
  }

  const deadline = new Date(deadlineIso);
  const diffMs = deadline.getTime() - nowDate.getTime();

  if (isNaN(diffMs)) {
    return {
      totalMs: 0,
      isOverdue: false,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: 'Invalid date',
      urgency: 'unknown',
    };
  }

  if (diffMs <= 0) {
    const absDiff = Math.abs(diffMs);
    const passedHours = Math.floor(absDiff / (1000 * 60 * 60));
    const passedDays = Math.floor(passedHours / 24);

    let passedStr = 'Just now';
    if (passedDays > 0) {
      passedStr = `${passedDays}d ${passedHours % 24}h ago`;
    } else if (passedHours > 0) {
      passedStr = `${passedHours}h ago`;
    } else {
      const passedMinutes = Math.floor(absDiff / (1000 * 60));
      passedStr = `${passedMinutes}m ago`;
    }

    return {
      totalMs: diffMs,
      isOverdue: true,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: `Overdue (${passedStr})`,
      urgency: 'overdue',
    };
  }

  const seconds = Math.floor((diffMs / 1000) % 60);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let formatted = '';
  if (days > 0) {
    formatted = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    formatted = `${minutes}m ${seconds}s`;
  }

  const totalHours = diffMs / (1000 * 60 * 60);
  let urgency: RemainingTime['urgency'] = 'normal';
  if (totalHours <= 1) {
    urgency = 'critical'; // < 1 hour
  } else if (totalHours <= 6) {
    urgency = 'urgent'; // < 6 hours
  } else if (totalHours <= 24) {
    urgency = 'soon'; // < 24 hours
  }

  return {
    totalMs: diffMs,
    isOverdue: false,
    days,
    hours,
    minutes,
    seconds,
    formatted,
    urgency,
  };
}

/**
 * Converts PKT date string (YYYY-MM-DD) and time string (HH:mm) into canonical UTC ISO 8601 string.
 * Example: 2026-11-15 and 23:59 in PKT (UTC+5) -> 2026-11-15T18:59:00.000Z
 */
export function pktToUtcIso(dateStr: string, timeStr: string = '23:59'): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const [hourStr, minStr] = timeStr.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr || '23', 10);
  const min = parseInt(minStr || '59', 10);

  // UTC epoch representation: subtract 5 hours from PKT
  const utcDate = new Date(Date.UTC(year, month, day, hour - PKT_OFFSET_HOURS, min, 0, 0));
  return utcDate.toISOString();
}

/**
 * Extracts PKT date (YYYY-MM-DD) and time (HH:mm) from a UTC ISO string
 */
export function utcIsoToPktParts(isoString: string | null): { dateStr: string; timeStr: string } {
  if (!isoString) {
    return { dateStr: '', timeStr: '23:59' };
  }

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { dateStr: '', timeStr: '23:59' };

    // Format in PKT
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: PKT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    let year = '',
      month = '',
      day = '',
      hour = '',
      minute = '';

    for (const p of parts) {
      if (p.type === 'year') year = p.value;
      if (p.type === 'month') month = p.value;
      if (p.type === 'day') day = p.value;
      if (p.type === 'hour') hour = p.value;
      if (p.type === 'minute') minute = p.value;
    }

    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${hour}:${minute}`,
    };
  } catch {
    return { dateStr: '', timeStr: '23:59' };
  }
}

/**
 * Returns current timestamp formatted as a live PKT string
 */
export function getCurrentPktTimeString(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: PKT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}
