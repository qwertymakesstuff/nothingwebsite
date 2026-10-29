// The game library. Each game is described once here; the menu, library, rules and statistics
// screens are all built from this list, so adding a game later means adding one entry (and its
// own rules engine and screen module once it is playable).
//
// status: 'playable' once a game can be played start to finish, otherwise 'in-development'
// with the stage that delivers it. The interface never presents an in-development game as
// playable.

export const GAMES = [
  {
    id: 'chess',
    name: 'Chess',
    tagline: 'The classic duel of kings, against a friend or the club computer.',
    category: 'board',
    players: '2 players or vs computer',
    glyph: '♞',
    accent: '#c9a45c',
    status: 'playable',
    stage: 3,
    rules: [
      { heading: 'Goal', items: ['Checkmate the opposing king: attack it so that it has no legal way to escape.'] },
      { heading: 'Moves', items: [
        'King: one square in any direction. Queen: any distance in a straight line or diagonal.',
        'Rook: any distance in a straight line. Bishop: any distance diagonally.',
        'Knight: an L-shape (two squares then one at a right angle), jumping over pieces.',
        'Pawn: one square forward (two from its starting square), capturing one square diagonally forward.',
      ] },
      { heading: 'Special moves', items: [
        'Castling: the king moves two squares toward an unmoved rook, which hops over it. Not allowed out of, through or into check.',
        'En passant: a pawn that just advanced two squares can be captured as if it had moved one.',
        'Promotion: a pawn reaching the last rank becomes a queen, rook, bishop or knight.',
      ] },
      { heading: 'Draws', items: [
        'Stalemate: the player to move has no legal move and is not in check.',
        'Insufficient material, threefold repetition, the fifty-move rule, or an agreed draw.',
        'At this club, threefold repetition and the fifty-move rule end the game as a draw automatically.',
      ] },
      { heading: 'At the club', items: [
        'Play the computer at four levels — Beginner, Casual, Club player and Club master — or a friend on the same device.',
        'Undo takes back a move (against the computer, your move and its reply). Games against the computer count in your statistics.',
        'Shortcuts: U to undo, F to flip the board, Esc or P to pause.',
      ] },
    ],
  },
  {
    id: 'poker',
    name: "Texas Hold'em",
    tagline: 'Read the table, play the odds and take the pot from up to five rivals.',
    category: 'cards',
    players: '2–6 players vs computer',
    glyph: '♠',
    accent: '#7fa7c9',
    status: 'in-development',
    stage: 6,
    rules: [
      { heading: 'Goal', items: ['Win chips by holding the best five-card hand at showdown, or by making every other player fold.'] },
      { heading: 'A hand', items: [
        'Two players post the small and big blinds, then everyone gets two private hole cards.',
        'Betting rounds follow the deal, the flop (three shared cards), the turn and the river (one each).',
        'On your turn you can check, call, bet, raise, fold or go all-in.',
      ] },
      { heading: 'Hand rankings (high to low)', items: [
        'Royal flush, straight flush, four of a kind, full house, flush, straight, three of a kind, two pair, one pair, high card.',
        'Ties are broken by kickers; identical hands split the pot.',
      ] },
      { heading: 'Chips', items: ['Virtual chips only. There is no real money anywhere in Checkmate Club.'] },
    ],
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    tagline: 'Beat the dealer to 21 without going over.',
    category: 'cards',
    players: '1 player vs dealer',
    glyph: '♥',
    accent: '#c96a6a',
    status: 'in-development',
    stage: 5,
    rules: [
      { heading: 'Goal', items: ["Finish with a hand closer to 21 than the dealer's without going over (busting)."] },
      { heading: 'Card values', items: ['Number cards count their value, face cards count 10, aces count 1 or 11.'] },
      { heading: 'Your options', items: [
        'Hit to take a card, stand to keep your total.',
        'Double down: double your bet and take exactly one more card.',
        'Split a pair into two separate hands with a second bet.',
      ] },
      { heading: 'Dealer and payouts', items: [
        'The dealer draws to 17 or more. A natural blackjack pays 3 to 2; other wins pay 1 to 1; ties push.',
        'Virtual chips only.',
      ] },
    ],
  },
  {
    id: 'solitaire',
    name: 'Klondike Solitaire',
    tagline: 'The patient game: build all four suits from ace to king.',
    category: 'cards',
    players: '1 player',
    glyph: '♦',
    accent: '#8fb98a',
    status: 'in-development',
    stage: 7,
    rules: [
      { heading: 'Goal', items: ['Move all 52 cards onto the four foundations, each built up by suit from ace to king.'] },
      { heading: 'Tableau', items: [
        'Seven columns; only the top card of each starts face up.',
        'Build down in alternating colours (a red 6 on a black 7). Only a king can fill an empty column.',
      ] },
      { heading: 'Stock and waste', items: ['Turn one or three cards from the stock to the waste. The top waste card can be played.'] },
    ],
  },
];

export const CATEGORIES = [['all', 'All tables'], ['board', 'Board games'], ['cards', 'Card games']];

export const getGame = id => GAMES.find(g => g.id === id) || null;
export const isPlayable = g => g?.status === 'playable';
export const statusLabel = g => (isPlayable(g) ? 'Ready to play' : `In development · Stage ${g.stage}`);
export const gamesIn = category => (category === 'all' ? GAMES : GAMES.filter(g => g.category === category));
