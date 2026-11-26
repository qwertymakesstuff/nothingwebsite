// Single source of truth for site navigation (sidebar, mobile bar, footer).

import {
  BarChart3,
  BookOpen,
  Bot,
  Home,
  type LucideIcon,
  Microscope,
  Puzzle,
  Search,
  Settings,
  Swords,
  Trophy,
  Users,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short label for the mobile tab bar. */
  short?: string;
  /** Shown in the mobile tab bar (max 5). */
  mobile?: boolean;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: Home, mobile: true },
  { href: '/play', label: 'Play', icon: Swords, mobile: true },
  { href: '/bots', label: 'Computer', icon: Bot, short: 'Bots', mobile: true },
  { href: '/puzzles', label: 'Puzzles', icon: Puzzle, mobile: true },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/analysis', label: 'Analysis', icon: Microscope },
  { href: '/explorer', label: 'Opening explorer', icon: BookOpen },
  { href: '/leaderboard', label: 'Leaderboards', icon: BarChart3 },
  { href: '/players', label: 'Find players', icon: Search },
];

export const SECONDARY_NAV: NavItem[] = [
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}
