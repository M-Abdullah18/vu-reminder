import { z } from 'zod';

export const ActivityTypeEnum = z.enum([
  'Assignment',
  'Quiz',
  'GDB',
  'Exam',
  'Announcement',
  'Other',
]);
export type ActivityType = z.infer<typeof ActivityTypeEnum>;

export const TaskStatusEnum = z.enum([
  'Pending',
  'InProgress',
  'Submitted',
  'Missed',
]);
export type TaskStatus = z.infer<typeof TaskStatusEnum>;

export const ConfidenceLevelEnum = z.enum(['High', 'Medium', 'Low']);
export type ConfidenceLevel = z.infer<typeof ConfidenceLevelEnum>;

export const ReminderModeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('active') }),
  z.object({ mode: z.literal('snoozed'), until: z.string().datetime() }),
  z.object({ mode: z.literal('acknowledged') }),
]);
export type ReminderMode = z.infer<typeof ReminderModeSchema>;

export const TaskSourceSchema = z.object({
  fileName: z.string().default('Manual Entry'),
  pageRef: z.string().default('N/A'),
  importedAt: z.string().datetime(),
});
export type TaskSource = z.infer<typeof TaskSourceSchema>;

export const FieldConfidenceSchema = z.object({
  courseCode: ConfidenceLevelEnum.default('High'),
  title: ConfidenceLevelEnum.default('High'),
  deadline: ConfidenceLevelEnum.default('High'),
  overall: ConfidenceLevelEnum.default('High'),
  rationale: z.string().default('User created or verified'),
});
export type FieldConfidence = z.infer<typeof FieldConfidenceSchema>;

export const TaskSchema = z.object({
  id: z.string().uuid(),
  schemaVersion: z.literal(1).default(1),
  courseCode: z.string().min(1, 'Course code is required').max(30),
  courseName: z.string().default(''),
  type: ActivityTypeEnum,
  title: z.string().min(1, 'Title is required').max(200),
  instructions: z.string().default(''),
  openingDate: z.string().nullable().default(null), // UTC ISO 8601
  deadline: z.string().nullable().default(null), // UTC ISO 8601, null = "Deadline unknown"
  deadlineHasTime: z.boolean().default(true),
  status: TaskStatusEnum.default('Pending'),
  archived: z.boolean().default(false),
  notes: z.string().default(''),
  source: TaskSourceSchema,
  fieldConfidence: FieldConfidenceSchema,
  needsConfirmation: z.array(z.string()).default([]),
  reminderState: ReminderModeSchema.default({ mode: 'active' }),
  totalMarks: z.string().optional().default(''),
  gracePeriod: z.string().optional().default(''),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

export const ReminderThresholdsSchema = z.object({
  h72: z.boolean().default(true),
  h24: z.boolean().default(true),
  h6: z.boolean().default(true),
  h1: z.boolean().default(true),
  atDeadline: z.boolean().default(true),
});
export type ReminderThresholds = z.infer<typeof ReminderThresholdsSchema>;

export const SettingsSchema = z.object({
  reminderThresholds: ReminderThresholdsSchema,
  soundEnabled: z.boolean().default(false),
  soundVolume: z.number().min(0).max(1).default(0.5),
  notificationsEnabled: z.boolean().default(false),
  hasAgreedPrivacy: z.boolean().default(false),
  devSeedEnabled: z.boolean().default(false),
  lastBackupDate: z.string().nullable().default(null),
  schemaVersion: z.literal(1).default(1),
});
export type AppSettings = z.infer<typeof SettingsSchema>;

export const BackupDataSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  appName: z.literal('VU Smart Deadline Manager'),
  tasks: z.array(TaskSchema),
  settings: SettingsSchema,
});
export type BackupData = z.infer<typeof BackupDataSchema>;

// AI Extraction Raw Schema from Gemini API
export const ExtractedTaskSchema = z.object({
  courseCode: z.string().default('Unknown Course'),
  courseName: z.string().default(''),
  activityType: z.string().default('Assignment'),
  title: z.string().default('Untitled Activity'),
  instructions: z.string().default(''),
  rawDeadlineText: z.string().default('Deadline unknown'),
  isoDeadline: z.string().default(''),
  deadlineStatus: z.enum(['exact', 'ambiguous', 'unknown']).default('unknown'),
  rawOpeningDateText: z.string().default(''),
  isoOpeningDate: z.string().default(''),
  totalMarks: z.string().default(''),
  gracePeriod: z.string().default(''),
  sourceReference: z.string().default('Page 1'),
  confidence: FieldConfidenceSchema,
  ambiguityFlags: z.array(z.string()).default([]),
});
export type ExtractedTask = z.infer<typeof ExtractedTaskSchema>;

export const ExtractionResponseSchema = z.object({
  tasks: z.array(ExtractedTaskSchema),
  documentSummary: z.string().default(''),
});
export type ExtractionResponse = z.infer<typeof ExtractionResponseSchema>;

// Computed task helpers
export function isTaskOverdue(task: Task, now: Date = new Date()): boolean {
  if (!task.deadline) return false;
  if (task.status === 'Submitted') return false;
  return new Date(task.deadline).getTime() < now.getTime();
}

export function isTaskCompleted(task: Task): boolean {
  return task.status === 'Submitted';
}
