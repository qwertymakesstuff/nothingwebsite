'use client';

// Per-device display and gameplay preferences. Real, working settings: stored in this
// browser's localStorage. When accounts arrive (Stage 2) they are synced to the
// `user_settings` table; the shape below mirrors that table.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BackdropId, BoardThemeId, PieceSetId } from './boardThemes';

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
};

export const ANIMATION_MS: Record<Preferences['animation'], number> = { off: 0, fast: 110, normal: 200, slow: 320 };

const KEY = 'rookery.preferences.v1';

interface Ctx {
  prefs: Preferences;
  setPref: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
  reset: () => void;
  /** False until localStorage has been read, so the first paint can use defaults. */
  loaded: boolean;
}

const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loaded, setLoaded] = useState(false);

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

  const setPref = useCallback<Ctx['setPref']>(
    (key, value) =>
      setPrefs((p) => {
        const next = { ...p, [key]: value };
        persist(next);
        return next;
      }),
    [persist],
  );

  const reset = useCallback(() => {
    setPrefs(DEFAULT_PREFERENCES);
    persist(DEFAULT_PREFERENCES);
  }, [persist]);

  const value = useMemo(() => ({ prefs, setPref, reset, loaded }), [prefs, setPref, reset, loaded]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): Ctx {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return ctx;
}
