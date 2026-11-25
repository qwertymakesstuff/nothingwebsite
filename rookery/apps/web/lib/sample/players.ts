// SAMPLE DATA: fictional players. See ./README.md.

import type { Category, LeaderboardEntry, Profile, RatingSnapshot } from '../types';
import { daysAgo, seeded, walk } from './random';

interface Seed {
  username: string;
  displayName: string;
  country: string;
  /** Base strength; category ratings vary around it. */
  base: number;
  bio?: string;
}

/** The player shown on the dashboard preview ("you", before accounts exist). */
export const PREVIEW_USERNAME = 'nightowl';

const SEEDS: Seed[] = [
  { username: 'nightowl', displayName: 'Night Owl', country: 'GB', base: 1460, bio: 'Plays after midnight. Loves a Sicilian, fears the London.' },
  { username: 'quietrook', displayName: 'Quiet Rook', country: 'NO', base: 2480, bio: 'Endgames are where the truth lives.' },
  { username: 'tempo_tamsin', displayName: 'Tamsin Hale', country: 'IE', base: 2415, bio: 'Bullet addict. Premove responsibly.' },
  { username: 'harrow_gambit', displayName: 'Harrow', country: 'US', base: 2360 },
  { username: 'mlynar', displayName: 'Piotr Młynarz', country: 'PL', base: 2330, bio: 'Coach, Kraków. Ask me about rook endings.' },
  { username: 'zugzwangster', displayName: 'Zugzwangster', country: 'DE', base: 2290 },
  { username: 'fianchetto_fern', displayName: 'Fern', country: 'NZ', base: 2240, bio: 'Bishops belong on long diagonals.' },
  { username: 'noor_endgame', displayName: 'Noor A.', country: 'EG', base: 2205 },
  { username: 'brassbishop', displayName: 'Brass Bishop', country: 'AU', base: 2170 },
  { username: 'lateknight', displayName: 'Late Knight', country: 'CA', base: 2120 },
  { username: 'oskar_b', displayName: 'Oskar B.', country: 'SE', base: 2085 },
  { username: 'castle_long', displayName: 'Castle Long', country: 'FR', base: 2040 },
  { username: 'ivoryandivy', displayName: 'Ivory & Ivy', country: 'IN', base: 1995 },
  { username: 'sixty4', displayName: 'Sixty-Four', country: 'BR', base: 1950 },
  { username: 'queenside_q', displayName: 'Q', country: 'ES', base: 1905 },
  { username: 'gambit_glen', displayName: 'Glen', country: 'US', base: 1860 },
  { username: 'tactical_tide', displayName: 'Tide', country: 'JP', base: 1815 },
  { username: 'opposite_colors', displayName: 'Opposite Colours', country: 'NL', base: 1770 },
  { username: 'pawnstorm_pia', displayName: 'Pia', country: 'IT', base: 1725 },
  { username: 'petrov_party', displayName: 'Petrov Party', country: 'UA', base: 1690 },
  { username: 'deep_file', displayName: 'Deep File', country: 'KE', base: 1640 },
  { username: 'mosaic_mate', displayName: 'Mosaic', country: 'MX', base: 1600 },
];

const OFFSETS: Record<Category, number> = { bullet: -60, blitz: 0, rapid: 55, classical: 90, puzzle: 240 };

function buildProfile(seed: Seed, index: number): Profile {
  const rand = seeded(seed.username);
  const ratings: RatingSnapshot[] = (Object.keys(OFFSETS) as Category[]).map((category) => {
    const rating = Math.round(seed.base + OFFSETS[category] + (rand() - 0.5) * 120);
    const games = Math.round(40 + rand() * (category === 'puzzle' ? 3000 : 900));
    const history = walk(rand, rating, 24, 40);
    return { category, rating, rd: Math.round(45 + rand() * 40), games, peak: Math.max(...history) + Math.round(rand() * 30), history };
  });
  const wins = Math.round(300 + rand() * 900);
  return {
    username: seed.username,
    displayName: seed.displayName,
    country: seed.country,
    bio: seed.bio,
    joinedAt: daysAgo(200 + Math.round(rand() * 1200)),
    lastSeenAt: daysAgo(0, Math.round(rand() * 40)),
    online: index % 3 !== 1,
    friends: Math.round(rand() * 120),
    ratings,
    streakDays: seed.username === PREVIEW_USERNAME ? 29 : Math.round(rand() * 60),
    record: { wins, draws: Math.round(wins * (0.12 + rand() * 0.1)), losses: Math.round(wins * (0.75 + rand() * 0.3)) },
  };
}

export const SAMPLE_PROFILES: Profile[] = SEEDS.map(buildProfile);

export function sampleProfile(username: string): Profile | undefined {
  return SAMPLE_PROFILES.find((p) => p.username.toLowerCase() === username.toLowerCase());
}

export function sampleLeaderboard(category: Category): LeaderboardEntry[] {
  return SAMPLE_PROFILES.map((p) => {
    const r = p.ratings.find((x) => x.category === category)!;
    const total = p.record.wins + p.record.draws + p.record.losses;
    return {
      rank: 0,
      player: { username: p.username, displayName: p.displayName, country: p.country, rating: r.rating },
      rating: r.rating,
      games: r.games,
      winRate: p.record.wins / total,
      trend: r.history.slice(-12),
    };
  })
    .sort((a, b) => b.rating - a.rating)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}
