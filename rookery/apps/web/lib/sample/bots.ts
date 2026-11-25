// SAMPLE DATA: the planned computer-opponent roster (presentation only: names, art, blurbs).
// Ratings are targets, not measurements. In Stage 3 these move to packages/ai/personas/*.json
// with engine settings, and the ratings get calibrated. See ./README.md.

import type { BotProfile, BotTier } from '../types';

export const BOT_TIERS: { id: BotTier; name: string; range: string; blurb: string }[] = [
  { id: 'newcomer', name: 'Newcomer', range: '250–750', blurb: 'Learning how the pieces move. Very forgiving.' },
  { id: 'casual', name: 'Casual', range: '800–1250', blurb: 'Knows the basics and leaves some pieces hanging.' },
  { id: 'club', name: 'Club', range: '1300–1750', blurb: 'Solid fundamentals, punishes loose play.' },
  { id: 'expert', name: 'Expert', range: '1800–2250', blurb: 'Strong, with a clear personal style.' },
  { id: 'master', name: 'Master', range: '2300+', blurb: 'Near-perfect play. Bring your best.' },
];

export const SAMPLE_BOTS: BotProfile[] = [
  {
    id: 'pip', name: 'Pip', tier: 'newcomer', rating: 300, country: 'GB',
    tagline: 'Just learned how the horsey moves',
    bio: 'Pip found a chess set in the attic last week and has been hooked ever since. Expect enthusiasm, not accuracy.',
    style: ['Friendly', 'Random'], greeting: 'Ooh, a game! Which one is the castle again?',
    portrait: { bg: ['#4f6b5a', '#2f4236'], skin: '#f1c9a5', hair: '#c46a2b', hairStyle: 'short', shirt: '#e3b34f' },
  },
  {
    id: 'marlow', name: 'Marlow', tier: 'newcomer', rating: 550, country: 'IE',
    tagline: 'Retired postman, unhurried',
    bio: 'Marlow plays the way he walked his route: steady, cheerful, and never in a rush to capture anything.',
    style: ['Patient', 'Passive'], greeting: 'Take your time, there’s no post to deliver today.',
    portrait: { bg: ['#5d5a7a', '#36344a'], skin: '#e0b48f', hair: '#d9d6d0', hairStyle: 'bald', accessory: 'cap', shirt: '#3f5e8c' },
  },
  {
    id: 'juniper', name: 'Juniper', tier: 'newcomer', rating: 720, country: 'CA',
    tagline: 'Draws pictures of every checkmate',
    bio: 'Juniper is an art student who treats the board like a sketchbook. Loves moving the queen out early.',
    style: ['Early queen', 'Curious'], greeting: 'Can I bring my queen out now? Please?',
    portrait: { bg: ['#7a5a6b', '#4a3441'], skin: '#c98e6b', hair: '#2a1d18', hairStyle: 'bob', accessory: 'beret', shirt: '#d46f5d' },
  },
  {
    id: 'theo', name: 'Theo', tier: 'casual', rating: 900, country: 'FR',
    tagline: 'Café regular, two sugars',
    bio: 'Theo has played the same café table every Sunday for a decade. Knows a few openings by heart, forgets them by move eight.',
    style: ['Opening book', 'Chatty'], greeting: 'Bonjour! White or black, I always play the Italian.',
    portrait: { bg: ['#6b5a45', '#3e3326'], skin: '#e8bd98', hair: '#4a3222', hairStyle: 'curly', accessory: 'scarf', shirt: '#5b7a6b' },
  },
  {
    id: 'rosa', name: 'Rosa', tier: 'casual', rating: 1050, country: 'ES',
    tagline: 'Attacks first, asks later',
    bio: 'Rosa throws pawns at your king and sorts out the consequences afterwards. Defend well and she overreaches.',
    style: ['Aggressive', 'Sacrificial'], greeting: '¡Vamos! Hope your king likes fresh air.',
    portrait: { bg: ['#8a4b45', '#552c28'], skin: '#d9a07b', hair: '#1f1512', hairStyle: 'long', shirt: '#2c2a33' },
  },
  {
    id: 'benedict', name: 'Benedict', tier: 'casual', rating: 1220, country: 'GB',
    tagline: 'Never met a trade he didn’t like',
    bio: 'A cautious accountant who simplifies at every chance. Great practice for converting small advantages.',
    style: ['Defensive', 'Trades'], greeting: 'Shall we keep things tidy?',
    portrait: { bg: ['#4b5b6e', '#2c3644'], skin: '#f0cfb2', hair: '#8a6a4a', hairStyle: 'short', accessory: 'glasses', shirt: '#8c8576' },
  },
  {
    id: 'ines', name: 'Inês', tier: 'club', rating: 1420, country: 'PT',
    tagline: 'Squeezes positions slowly',
    bio: 'Inês plays positional chess: good bishops, weak squares, long plans. Patience is the lesson.',
    style: ['Positional', 'Endgames'], greeting: 'Let’s see whose pawn structure holds.',
    portrait: { bg: ['#5a6e64', '#33423b'], skin: '#c78f69', hair: '#3a2418', hairStyle: 'bun', shirt: '#b98d4f' },
  },
  {
    id: 'kofi', name: 'Kofi', tier: 'club', rating: 1580, country: 'GH',
    tagline: 'Sees forks in his sleep',
    bio: 'A sharp tactician who hunts for double attacks. Leave a piece undefended and he will find it.',
    style: ['Tactical', 'Forks'], greeting: 'Every loose piece is a gift. Thank you in advance.',
    portrait: { bg: ['#6e5d3e', '#433722'], skin: '#7a4a2e', hair: '#141010', hairStyle: 'short', accessory: 'headphones', shirt: '#3d6a8a' },
  },
  {
    id: 'hana', name: 'Hana', tier: 'club', rating: 1740, country: 'JP',
    tagline: 'Endgame specialist',
    bio: 'Hana trades into endgames on purpose because she knows them better than you do. Probably.',
    style: ['Endgames', 'Technical'], greeting: 'Let’s go straight to the interesting part.',
    portrait: { bg: ['#6b4b5e', '#40293a'], skin: '#f0d0b5', hair: '#1a1416', hairStyle: 'bob', shirt: '#e6e0d3' },
  },
  {
    id: 'viktor', name: 'Viktor', tier: 'expert', rating: 1920, country: 'CZ',
    tagline: 'Every gambit, every game',
    bio: 'Viktor believes a pawn is a small price for initiative. Sharp, romantic and dangerous in the opening.',
    style: ['Gambits', 'Initiative'], greeting: 'A pawn for your thoughts?',
    portrait: { bg: ['#5e3e3e', '#3a2424'], skin: '#e6c0a0', hair: '#5b3a22', hairStyle: 'mohawk', shirt: '#1f1d22' },
  },
  {
    id: 'amara', name: 'Amara', tier: 'expert', rating: 2060, country: 'NG',
    tagline: 'Walls, not windows',
    bio: 'An immovable defender who absorbs attacks and counter-punches once you overextend.',
    style: ['Solid', 'Counter-attack'], greeting: 'Go on. Show me your attack.',
    portrait: { bg: ['#3f5a5a', '#253838'], skin: '#5e3a26', hair: '#120e0c', hairStyle: 'curly', accessory: 'glasses', shirt: '#c19a52' },
  },
  {
    id: 'lucien', name: 'Lucien', tier: 'expert', rating: 2210, country: 'BE',
    tagline: 'Chaos is a ladder',
    bio: 'Lucien steers every game into wild, unbalanced positions where calculation matters more than theory.',
    style: ['Chaotic', 'Imbalances'], greeting: 'Symmetry is boring, don’t you think?',
    portrait: { bg: ['#4e4570', '#2d2846'], skin: '#efcfb6', hair: '#e2c56a', hairStyle: 'long', accessory: 'monocle', shirt: '#6b2f3a' },
  },
  {
    id: 'archivist', name: 'The Archivist', tier: 'master', rating: 2420,
    tagline: 'Remembers every game ever played',
    bio: 'Keeper of the Rookery’s library. Plays the main lines flawlessly and expects you to know them too.',
    style: ['Theory', 'Precise'], greeting: 'Ah. This opening. I have notes.',
    portrait: { bg: ['#4a4236', '#2a251d'], skin: '#d6b394', hair: '#bdb6ab', hairStyle: 'short', accessory: 'glasses', shirt: '#2f3d35' },
  },
  {
    id: 'selene', name: 'Selene', tier: 'master', rating: 2610,
    tagline: 'Calm, cold, correct',
    bio: 'Selene rarely speaks and almost never blunders. A true test of your endgame technique.',
    style: ['Universal', 'Accurate'], greeting: '…',
    portrait: { bg: ['#2f3b4e', '#1a222e'], skin: '#e9d3c2', hair: '#cfd6df', hairStyle: 'long', shirt: '#1e2633' },
  },
  {
    id: 'corvus', name: 'Corvus', tier: 'master', rating: 2850,
    tagline: 'The rook of the Rookery',
    bio: 'The club’s resident raven and our strongest opponent: full-strength engine, no personality settings, no mercy.',
    style: ['Maximum strength'], greeting: 'Caw.',
    portrait: { bg: ['#3a3326', '#1c1913'], skin: '#2a2a2e', hair: '#141416', hairStyle: 'bald', shirt: '#c19a52' },
  },
];
