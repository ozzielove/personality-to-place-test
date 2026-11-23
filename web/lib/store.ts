"use client";

// Progress lives in the browser (localStorage), written on every answer. No account, no server.
import { useEffect, useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import { TOTAL, isValidAnswer, type Letter } from "./data";

export const STORAGE_KEY = "personality-to-place:v1";
const STORAGE_VERSION = 1;

export interface Snapshot {
  answers: Record<number, Letter>;
  /** question number the test-taker is on */
  current: number;
  startedAt: number | null;
  updatedAt: number | null;
  finishedAt: number | null;
}

type Saved = Snapshot & { autoAdvance: boolean };

interface TestState extends Saved {
  setAnswer: (n: number, letter: Letter) => void;
  clearAnswer: (n: number) => void;
  goTo: (n: number) => void;
  setAutoAdvance: (on: boolean) => void;
  finish: () => void;
  reset: () => void;
  restore: (snap: Snapshot) => void;
}

const EMPTY: Snapshot = { answers: {}, current: 1, startedAt: null, updatedAt: null, finishedAt: null };

const clamp = (n: unknown) => Math.min(TOTAL, Math.max(1, Math.round(Number(n)) || 1));
const time = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

/**
 * Turn anything (a saved blob, a backup file, something hand-edited) into a valid snapshot.
 * Unknown questions and letters are dropped, never trusted, so bad data cannot reach the scorer.
 */
export function sanitize(raw: unknown): Snapshot {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const answers: Record<number, Letter> = {};
  if (o.answers && typeof o.answers === "object") {
    for (const [k, v] of Object.entries(o.answers as Record<string, unknown>)) {
      const n = Number(k);
      if (Number.isInteger(n) && isValidAnswer(n, v)) answers[n] = v;
    }
  }
  return { answers, current: clamp(o.current), startedAt: time(o.startedAt), updatedAt: time(o.updatedAt), finishedAt: time(o.finishedAt) };
}

/** Whether the last attempt to read or write browser storage worked. False in a locked-down or full browser. */
export const useStorageStatus = create<{ ok: boolean }>(() => ({ ok: true }));
const setStorageOk = (ok: boolean) => {
  if (useStorageStatus.getState().ok !== ok) useStorageStatus.setState({ ok });
};

// Storage that never throws. A browser can refuse storage (privacy settings, full disk, some
// embedded views) and saved text can be damaged; in every case the test must keep working.
const safeStorage: PersistStorage<Saved> = {
  getItem: (name) => {
    if (typeof window === "undefined") return null; // prerender on the server: nothing saved
    let text: string | null;
    try {
      text = window.localStorage.getItem(name);
      setStorageOk(true);
    } catch {
      setStorageOk(false);
      return null;
    }
    if (!text) return null;
    try {
      const parsed = JSON.parse(text) as { state?: unknown };
      const state = (parsed && typeof parsed === "object" ? parsed.state : null) as Record<string, unknown> | null;
      if (!state || typeof state !== "object") throw new Error("no state");
      return { state: { ...sanitize(state), autoAdvance: state.autoAdvance !== false }, version: STORAGE_VERSION };
    } catch {
      // Damaged save: keep a copy for recovery, then start clean instead of hanging on a loading screen.
      try {
        window.localStorage.setItem(`${name}:damaged`, text);
      } catch {}
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, JSON.stringify(value));
      setStorageOk(true);
    } catch {
      setStorageOk(false);
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      setStorageOk(false);
    }
  },
};

export const useTest = create<TestState>()(
  persist(
    (set) => ({
      ...EMPTY,
      autoAdvance: true,
      setAnswer: (n, letter) =>
        set((s) => {
          if (!isValidAnswer(n, letter)) return s;
          const now = Date.now();
          return { answers: { ...s.answers, [n]: letter }, startedAt: s.startedAt ?? now, updatedAt: now };
        }),
      clearAnswer: (n) =>
        set((s) => {
          if (!(n in s.answers)) return s;
          const answers = { ...s.answers };
          delete answers[n];
          return { answers, updatedAt: Date.now() };
        }),
      goTo: (n) => set({ current: clamp(n) }),
      setAutoAdvance: (on) => set({ autoAdvance: on }),
      finish: () => set({ finishedAt: Date.now() }),
      reset: () => set({ ...EMPTY }),
      restore: (snap) => set({ ...sanitize(snap) }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: safeStorage,
      // The server renders with an empty store. Loading saved progress after mount (see useHydrated)
      // keeps the first client render identical to the server's, so React never sees a mismatch.
      skipHydration: true,
      partialize: (s) => ({
        answers: s.answers, current: s.current, startedAt: s.startedAt,
        updatedAt: s.updatedAt, finishedAt: s.finishedAt, autoAdvance: s.autoAdvance,
      }),
    },
  ),
);

let hydrationStarted = false;

/** False on the server and on the first client render, true once saved progress is loaded. */
export function useHydrated(): boolean {
  const hydrated = useSyncExternalStore(
    (cb) => useTest.persist.onFinishHydration(cb),
    () => useTest.persist.hasHydrated(),
    () => false,
  );
  useEffect(() => {
    if (hydrationStarted) return;
    hydrationStarted = true;
    void useTest.persist.rehydrate();
    // Another tab saved progress: pick it up instead of overwriting it with stale answers.
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) void useTest.persist.rehydrate();
    });
  }, []);
  return hydrated;
}

export function answeredCount(answers: Record<number, Letter>): number {
  return Object.keys(answers).length;
}

/** First unanswered question at or after `from`, wrapping around; null when all are answered. */
export function firstUnanswered(answers: Record<number, Letter>, from = 1): number | null {
  for (let i = 0; i < TOTAL; i++) {
    const n = ((from - 1 + i) % TOTAL) + 1;
    if (!(n in answers)) return n;
  }
  return null;
}

// ---- backup file: move progress between browsers or devices

const BACKUP_APP = "personality-to-place";
const MAX_BACKUP_BYTES = 1_000_000; // a full backup is about 8 KB

export function makeBackup(): string {
  const s = useTest.getState();
  return JSON.stringify(
    { app: BACKUP_APP, version: 1, savedAt: new Date().toISOString(), answers: s.answers, current: s.current,
      startedAt: s.startedAt, updatedAt: s.updatedAt, finishedAt: s.finishedAt },
    null, 1,
  );
}

/** Parse a backup file. Throws a message fit to show the user when the file is not a backup. */
export function parseBackup(text: string): Snapshot {
  if (text.length > MAX_BACKUP_BYTES) throw new Error("That file is too large to be a progress backup.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not a progress backup (it is not valid JSON).");
  }
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== "object" || o.app !== BACKUP_APP || typeof o.answers !== "object" || o.answers === null) {
    throw new Error("That file is not a Personality-to-Place progress backup.");
  }
  return sanitize(o);
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
