'use client';

// Per-device display and gameplay preferences. Real, working settings: stored in this
// browser's localStorage. When accounts arrive (Stage 2) they are synced to the
// `user_settings` table; the shape below mirrors that table.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import type { BackdropId, BoardThemeId, PieceSetId } from './boardThemes';
import { fetchSettings, saveSettings } from './db';

export interface Preferences {
  boardTheme: BoardThemeId;
  pieceSet: PieceSetId;
  backdrop: BackdropId;
  showCoordinates: boolean;
  showLegalMoves: boolean;
  highlightLastMove: boolean;
  animation: 'off' | 'fast' | 'normal' | 'slow';
  autoQueen: boolean;
  confirmResign: boolean;
  sound: boolean;
  reduceMotion: boolean;
  /** Computer opponents: how long they pause before moving. */
  botMoveSpeed: 'natural' | 'fast' | 'instant';
  /** Computer opponents: show their chat lines. */
  botChat: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  boardTheme: 'stone',
  pieceSet: 'cburnett',
  backdrop: 'study',
  showCoordinates: true,
  showLegalMoves: true,
  highlightLastMove: true,
  animation: 'normal',
  autoQueen: false,
  confirmResign: true,
  sound: true,
  reduceMotion: false,
  botMoveSpeed: 'natural',
  botChat: true,
};

/** Multiplier applied to a computer opponent's human-like thinking pause. */
export const BOT_DELAY_FACTOR: Record<Preferences['botMoveSpeed'], number> = { natural: 1, fast: 0.35, instant: 0 };

export const ANIMATION_MS: Record<Preferences['animation'], number> = { off: 0, fast: 110, normal: 200, slow: 320 };

const KEY = 'rookery.preferences.v1';

/** Where settings live right now: this device only, or the signed-in account (and its sync state). */
export type SyncState = 'device' | 'loading' | 'saving' | 'saved' | 'error';

interface Ctx {
  prefs: Preferences;
  sync: SyncState;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
  /** False until localStorage has been read, so the first paint can use defaults. */
  loaded: boolean;
}

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSync] = useState<SyncState>('device');
  const { userId } = useAuth();
  const pending = useRef<Partial<Preferences>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefs({ ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<Preferences>) });
    } catch {
      // Private mode or blocked storage: defaults are fine.
    }
    setLoaded(true);
  }, []);

  // Page-level preferences are applied as data attributes on <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.backdrop = prefs.backdrop;
    root.dataset.reduceMotion = String(prefs.reduceMotion);
  }, [prefs.backdrop, prefs.reduceMotion]);

  const persist = useCallback((next: Preferences) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  // Signed in: the account's saved settings replace this device's, and changes are saved back.
  useEffect(() => {
    if (!userId) {
      setSync('device');
      return;
    }
    let alive = true;
    setSync('loading');
    fetchSettings(userId)
      .then((remote) => {
        if (!alive) return;
        if (remote) {
          setPrefs((p) => {
            const next = { ...p, ...remote };
            persist(next);
            return next;
          });
        }
        setSync('saved');
      })
      .catch(() => alive && setSync('error'));
    return () => {
      alive = false;
    };
  }, [userId, persist]);

  const queueSave = useCallback(
    (patch: Partial<Preferences>) => {
      if (!userId) return;
      pending.current = { ...pending.current, ...patch };
      setSync('saving');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const batch = pending.current;
        pending.current = {};
        saveSettings(userId, batch)
          .then(() => setSync('saved'))
          .catch(() => setSync('error'));
      }, 400);
    },
    [userId],
  );

  const setPref = useCallback<Ctx['setPref']>(
    (key, value) => {
      setPrefs((p) => {
        const next = { ...p, [key]: value };
        persist(next);
        return next;
      });
      queueSave({ [key]: value } as Partial<Preferences>);
    },
    [persist, queueSave],
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    persist(DEFAULT_PREFERENCES);
    queueSave(DEFAULT_PREFERENCES);
  }, [persist, queueSave]);

  const value = useMemo(() => ({ prefs, setPref, reset, loaded, sync }), [prefs, setPref, reset, loaded, sync]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
