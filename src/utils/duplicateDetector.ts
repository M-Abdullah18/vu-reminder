import { Task, ExtractedTask } from '../types';

/**
 * Normalizes title for fuzzy comparison:
 * Lowercases, trims, removes punctuation and excess spaces.
 * Example: "Assignment # 1 - Fall 2026!" -> "assignment 1 fall 2026"
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates Jaccard / token similarity between two normalized strings (0 to 1)
 */
export function calculateTitleSimilarity(titleA: string, titleB: string): number {
  const normA = normalizeTitle(titleA);
  const normB = normalizeTitle(titleB);

  if (normA === normB) return 1.0;
  if (!normA || !normB) return 0.0;

  // Exact substring check
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    if (minLen / maxLen > 0.6) return 0.9;
  }

  // Token set similarity
  const tokensA = new Set(normA.split(' ').filter(Boolean));
  const tokensB = new Set(normB.split(' ').filter(Boolean));

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      intersection++;
    }
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  if (union === 0) return 0;

  return intersection / union;
}

export interface DuplicateMatchResult {
  isDuplicate: boolean;
  matchedTask: Task | null;
  similarityScore: number;
  deadlineDifferenceHours: number | null;
  reason?: string;
}

/**
 * Checks if an extracted task matches any existing saved task.
 * Criteria:
 * 1. Same courseCode (case-insensitive)
 * 2. Same activity type (e.g. Assignment == Assignment)
 * 3. High title similarity (>= 0.6 token similarity or exact normalized match)
 * 4. Deadlines within 6 hours of each other (or both unknown)
 */
export function checkDuplicate(
  extracted: ExtractedTask | Task,
  existingTasks: Task[]
): DuplicateMatchResult {
  const extCourse = extracted.courseCode.trim().toUpperCase();
  const extType = 'activityType' in extracted ? extracted.activityType : extracted.type;
  const extTitle = extracted.title;
  const extDeadlineIso = 'isoDeadline' in extracted ? extracted.isoDeadline : extracted.deadline;

  for (const existing of existingTasks) {
    // 1. Course code match
    if (existing.courseCode.trim().toUpperCase() !== extCourse) {
      continue;
    }

    // 2. Activity type match
    if (existing.type !== extType) {
      continue;
    }

    // 3. Title similarity
    const similarity = calculateTitleSimilarity(extTitle, existing.title);
    if (similarity < 0.6) {
      continue;
    }

    // 4. Deadlines within 6 hours (or both unknown)
    let hoursDiff: number | null = null;
    let deadlineMatch = false;

    if (!extDeadlineIso && !existing.deadline) {
      deadlineMatch = true;
    } else if (extDeadlineIso && existing.deadline) {
      const timeA = new Date(extDeadlineIso).getTime();
      const timeB = new Date(existing.deadline).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) {
        hoursDiff = Math.abs(timeA - timeB) / (1000 * 60 * 60);
        deadlineMatch = hoursDiff <= 6;
      }
    }

    if (deadlineMatch) {
      return {
        isDuplicate: true,
        matchedTask: existing,
        similarityScore: similarity,
        deadlineDifferenceHours: hoursDiff,
        reason: `Matches existing task "${existing.title}" in ${existing.courseCode} with ${Math.round(
          similarity * 100
        )}% title similarity${
          hoursDiff !== null ? ` and deadline within ${hoursDiff.toFixed(1)}h` : ''
        }`,
      };
    }
  }

  return {
    isDuplicate: false,
    matchedTask: null,
    similarityScore: 0,
    deadlineDifferenceHours: null,
  };
}
