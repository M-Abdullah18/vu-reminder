import { Task, AppSettings, SettingsSchema } from '../types';

const DB_NAME = 'VUSmartDeadlineManagerDB';
const DB_VERSION = 1;
const TASKS_STORE = 'tasks';
const SETTINGS_STORE = 'settings';

export const DEFAULT_SETTINGS: AppSettings = {
  reminderThresholds: {
    h72: true,
    h24: true,
    h6: true,
    h1: true,
    atDeadline: true,
  },
  soundEnabled: false,
  soundVolume: 0.5,
  notificationsEnabled: false,
  hasAgreedPrivacy: false,
  devSeedEnabled: false,
  lastBackupDate: null,
  schemaVersion: 1,
};

let dbPromise: Promise<IDBDatabase> | null = null;

// Request persistent storage if supported (PWA resilience)
if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {
    // Ignore if denied or unsupported
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(TASKS_STORE)) {
        const taskStore = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        taskStore.createIndex('courseCode', 'courseCode', { unique: false });
        taskStore.createIndex('status', 'status', { unique: false });
        taskStore.createIndex('deadline', 'deadline', { unique: false });
      }

      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// LocalStorage Fallback Helpers
const LS_TASKS_KEY = 'vu_deadline_tasks_v1';
const LS_SETTINGS_KEY = 'vu_deadline_settings_v1';

function getLsTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LS_TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLsTasks(tasks: Task[]) {
  try {
    localStorage.setItem(LS_TASKS_KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export const StorageRepository = {
  /**
   * Retrieves all tasks from IndexedDB (with LocalStorage fallback)
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(TASKS_STORE, 'readonly');
        const store = tx.objectStore(TASKS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve(getLsTasks());
      });
    } catch {
      return getLsTasks();
    }
  },

  /**
   * Saves or updates a single task
   */
  async saveTask(task: Task): Promise<void> {
    const updatedTask = { ...task, updatedAt: new Date().toISOString() };
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TASKS_STORE, 'readwrite');
        const store = tx.objectStore(TASKS_STORE);
        const req = store.put(updatedTask);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback to localStorage
      const tasks = getLsTasks();
      const index = tasks.findIndex((t) => t.id === updatedTask.id);
      if (index >= 0) {
        tasks[index] = updatedTask;
      } else {
        tasks.push(updatedTask);
      }
      saveLsTasks(tasks);
    }
  },

  /**
   * Saves multiple tasks in a batch (e.g., from AI extraction or import)
   */
  async saveTasksBatch(tasks: Task[]): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TASKS_STORE, 'readwrite');
        const store = tx.objectStore(TASKS_STORE);
        for (const t of tasks) {
          store.put(t);
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      const existing = getLsTasks();
      const map = new Map(existing.map((t) => [t.id, t]));
      for (const t of tasks) {
        map.set(t.id, t);
      }
      saveLsTasks(Array.from(map.values()));
    }
  },

  /**
   * Deletes a single task by ID
   */
  async deleteTask(id: string): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(TASKS_STORE, 'readwrite');
        const store = tx.objectStore(TASKS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      const tasks = getLsTasks().filter((t) => t.id !== id);
      saveLsTasks(tasks);
    }
  },

  /**
   * Gets application settings
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(SETTINGS_STORE, 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const req = store.get('app_settings');
        req.onsuccess = () => {
          if (req.result && req.result.value) {
            const parsed = SettingsSchema.safeParse(req.result.value);
            resolve(parsed.success ? parsed.data : DEFAULT_SETTINGS);
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        };
        req.onerror = () => resolve(DEFAULT_SETTINGS);
      });
    } catch {
      try {
        const raw = localStorage.getItem(LS_SETTINGS_KEY);
        if (raw) {
          const parsed = SettingsSchema.safeParse(JSON.parse(raw));
          return parsed.success ? parsed.data : DEFAULT_SETTINGS;
        }
      } catch {}
      return DEFAULT_SETTINGS;
    }
  },

  /**
   * Saves application settings
   */
  async saveSettings(settings: AppSettings): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SETTINGS_STORE, 'readwrite');
        const store = tx.objectStore(SETTINGS_STORE);
        const req = store.put({ key: 'app_settings', value: settings });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    }
  },

  /**
   * Clears all tasks and settings (Wipe All Data)
   */
  async clearAllData(): Promise<void> {
    try {
      const db = await openDB();
      await new Promise<void>((resolve) => {
        const tx = db.transaction([TASKS_STORE, SETTINGS_STORE], 'readwrite');
        tx.objectStore(TASKS_STORE).clear();
        tx.objectStore(SETTINGS_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
    localStorage.removeItem(LS_TASKS_KEY);
    localStorage.removeItem(LS_SETTINGS_KEY);
  },
};
