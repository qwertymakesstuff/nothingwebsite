// SAMPLE DATA: achievement catalogue and unlock state for profile previews. In Stage 9 the
// catalogue moves to packages/config/achievements.json and unlocks come from the database.

import { seeded } from './random';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold';
  icon: 'swords' | 'crown' | 'flame' | 'puzzle' | 'target' | 'shield' | 'zap' | 'hourglass';
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-win', name: 'First blood', description: 'Win your first rated game', tier: 'bronze', icon: 'swords' },
  { id: 'scholar', name: 'Back to school', description: 'Checkmate in under 10 moves', tier: 'bronze', icon: 'target' },
  { id: 'streak-7', name: 'Regular', description: 'Play on 7 days in a row', tier: 'bronze', icon: 'flame' },
  { id: 'puzzles-100', name: 'Problem solver', description: 'Solve 100 puzzles', tier: 'silver', icon: 'puzzle' },
  { id: 'comeback', name: 'Houdini', description: 'Win a game after being down a queen', tier: 'silver', icon: 'shield' },
  { id: 'bullet-50', name: 'Quick draw', description: 'Win 50 bullet games', tier: 'silver', icon: 'zap' },
  { id: 'streak-30', name: 'Pillar of the club', description: 'Play on 30 days in a row', tier: 'gold', icon: 'flame' },
  { id: 'classical-2000', name: 'Deep thinker', description: 'Reach 2000 in classical', tier: 'gold', icon: 'hourglass' },
  { id: 'beat-corvus', name: 'Raven slayer', description: 'Beat Corvus', tier: 'gold', icon: 'crown' },
];

export function sampleUnlocks(username: string): Record<string, string | null> {
  const r = seeded(`ach-${username}`);
  return Object.fromEntries(
    ACHIEVEMENTS.map((a, i) => [a.id, r() < (a.tier === 'bronze' ? 0.95 : a.tier === 'silver' ? 0.6 : 0.2) - i * 0.01 ? `2026-${String(1 + Math.floor(r() * 10)).padStart(2, '0')}-${String(1 + Math.floor(r() * 27)).padStart(2, '0')}` : null]),
  );
}
