// Catalogue of visual options. CSS for board themes lives in app/board-themes.css and
// backdrops in app/globals.css; this file is the single list the UI renders from.

export const BOARD_THEMES = [
  { id: 'stone', name: 'Stone', light: '#cfc9bd', dark: '#8f897d' },
  { id: 'walnut', name: 'Walnut', light: '#e6d0ad', dark: '#a77b51' },
  { id: 'slate', name: 'Slate', light: '#c9ced4', dark: '#7d8792' },
  { id: 'harbor', name: 'Harbor', light: '#dde5ea', dark: '#6f8ca3' },
  { id: 'sage', name: 'Sage', light: '#e4e2cf', dark: '#8a9a74' },
  { id: 'midnight', name: 'Midnight', light: '#6c6a75', dark: '#45434d' },
  { id: 'contrast', name: 'High contrast', light: '#f2f2f2', dark: '#5a6b8c' },
] as const;

export type BoardThemeId = (typeof BOARD_THEMES)[number]['id'];

export const PIECE_SETS = [
  { id: 'cburnett', name: 'Classic', credit: 'Colin M.L. Burnett · GPL-2.0+' },
] as const;

export type PieceSetId = (typeof PIECE_SETS)[number]['id'];

export const BACKDROPS = [
  { id: 'study', name: 'Study', description: 'Warm lamplight and a faint chequer' },
  { id: 'felt', name: 'Card room', description: 'Deep green felt glow' },
  { id: 'night', name: 'Night', description: 'Cool blue with a few stars' },
  { id: 'plain', name: 'Plain', description: 'Solid charcoal, no texture' },
] as const;

export type BackdropId = (typeof BACKDROPS)[number]['id'];
