import { Flame, Hourglass, Puzzle, Timer, Zap } from 'lucide-react';
import type { Category } from './types';

export const CATEGORY_ICON: Record<Category, typeof Zap> = {
  bullet: Zap,
  blitz: Flame,
  rapid: Timer,
  classical: Hourglass,
  puzzle: Puzzle,
};
