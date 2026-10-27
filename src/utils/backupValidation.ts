import { BackupData, BackupDataSchema, Task } from '../types';

export interface BackupValidationResult {
  isValid: boolean;
  error?: string;
  data?: BackupData;
}

/**
 * Validates raw JSON string or parsed object against BackupDataSchema and schemaVersion
 */
export function validateBackup(jsonContent: string | unknown): BackupValidationResult {
  try {
    let parsed: unknown = jsonContent;
    if (typeof jsonContent === 'string') {
      try {
        parsed = JSON.parse(jsonContent);
      } catch {
        return {
          isValid: false,
          error: 'Invalid JSON file: syntax error during parsing.',
        };
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        isValid: false,
        error: 'Invalid backup structure: root must be a JSON object.',
      };
    }

    const obj = parsed as Record<string, any>;

    // Check schemaVersion explicitly
    if (obj.schemaVersion !== 1) {
      return {
        isValid: false,
        error: `Unsupported schema version: expected 1, found ${obj.schemaVersion || 'none'}.`,
      };
    }

    // Validate with Zod
    const result = BackupDataSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0];
      return {
        isValid: false,
        error: `Backup data validation failed: ${issue.path.join('.')} - ${issue.message}`,
      };
    }

    return {
      isValid: true,
      data: result.data,
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: `Unexpected validation error: ${err?.message || 'unknown'}`,
    };
  }
}

/**
 * Merges imported tasks with existing tasks, avoiding duplicate IDs.
 */
export function mergeTasks(existingTasks: Task[], importedTasks: Task[]): Task[] {
  const map = new Map<string, Task>();
  for (const t of existingTasks) {
    map.set(t.id, t);
  }
  for (const t of importedTasks) {
    // If conflict, overwrite with imported or keep newer updatedAt
    const existing = map.get(t.id);
    if (!existing || new Date(t.updatedAt).getTime() >= new Date(existing.updatedAt).getTime()) {
      map.set(t.id, t);
    }
  }
  return Array.from(map.values());
}
