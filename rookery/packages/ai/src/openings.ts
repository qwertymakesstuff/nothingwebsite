// Named opening lines (SAN from the starting position). Used by opponents' opening preferences
// and by the "start from an opening" game option. Every line is checked for legality in tests.

export interface Opening {
  id: string;
  name: string;
  eco: string;
  moves: string; // space-separated SAN
  /** Short description for the setup screen. */
  blurb: string;
}

export const OPENINGS: readonly Opening[] = [
  { id: 'italian', name: 'Italian Game', eco: 'C50', moves: 'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3', blurb: 'Quick development aimed at f7.' },
  { id: 'ruy-lopez', name: 'Ruy Lopez', eco: 'C84', moves: 'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7', blurb: 'Long-term pressure on e5.' },
  { id: 'scotch', name: 'Scotch Game', eco: 'C45', moves: 'e4 e5 Nf3 Nc6 d4 exd4 Nxd4', blurb: 'Opens the centre at once.' },
  { id: 'vienna', name: 'Vienna Game', eco: 'C29', moves: 'e4 e5 Nc3 Nf6 f4', blurb: 'A delayed, sneaky f4 push.' },
  { id: 'kings-gambit', name: "King's Gambit", eco: 'C33', moves: 'e4 e5 f4 exf4 Nf3', blurb: 'A pawn for an all-out attack.' },
  { id: 'danish-gambit', name: 'Danish Gambit', eco: 'C21', moves: 'e4 e5 d4 exd4 c3 dxc3 Bc4', blurb: 'Two pawns for two raking bishops.' },
  { id: 'wayward-queen', name: 'Wayward Queen Attack', eco: 'C20', moves: 'e4 e5 Qh5 Nc6 Bc4 g6 Qf3 Nf6', blurb: 'An early queen sortie aimed at f7.' },
  { id: 'sicilian-najdorf', name: 'Sicilian: Najdorf', eco: 'B90', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', blurb: 'Sharp, flexible and ambitious.' },
  { id: 'sicilian-dragon', name: 'Sicilian: Dragon', eco: 'B70', moves: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6', blurb: 'Fianchetto bishop and opposite-side attacks.' },
  { id: 'french', name: 'French Defence', eco: 'C11', moves: 'e4 e6 d4 d5 Nc3 Nf6', blurb: 'Solid, with counterplay against the centre.' },
  { id: 'caro-kann', name: 'Caro-Kann Defence', eco: 'B18', moves: 'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5', blurb: 'Rock-solid structure, good bishop.' },
  { id: 'scandinavian', name: 'Scandinavian Defence', eco: 'B01', moves: 'e4 d5 exd5 Qxd5 Nc3 Qa5', blurb: 'Challenges e4 immediately.' },
  { id: 'pirc', name: 'Pirc Defence', eco: 'B07', moves: 'e4 d6 d4 Nf6 Nc3 g6', blurb: 'Hypermodern: let White build, then strike.' },
  { id: 'qgd', name: "Queen's Gambit Declined", eco: 'D53', moves: 'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7', blurb: 'Classical and reliable.' },
  { id: 'qga', name: "Queen's Gambit Accepted", eco: 'D20', moves: 'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6', blurb: 'Takes the pawn, returns it for freedom.' },
  { id: 'slav', name: 'Slav Defence', eco: 'D10', moves: 'd4 d5 c4 c6 Nf3 Nf6', blurb: 'Supports d5 without blocking the bishop.' },
  { id: 'kings-indian', name: "King's Indian Defence", eco: 'E90', moves: 'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O', blurb: 'Concede the centre, then attack the king.' },
  { id: 'nimzo-indian', name: 'Nimzo-Indian Defence', eco: 'E20', moves: 'd4 Nf6 c4 e6 Nc3 Bb4', blurb: 'Pins the knight, fights for e4.' },
  { id: 'dutch', name: 'Dutch Defence', eco: 'A81', moves: 'd4 f5 g3 Nf6 Bg2 e6', blurb: 'Grabs e4 with an f-pawn.' },
  { id: 'london', name: 'London System', eco: 'D02', moves: 'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3', blurb: 'The same sturdy setup every game.' },
  { id: 'english', name: 'English Opening', eco: 'A29', moves: 'c4 e5 Nc3 Nf6 g3 d5', blurb: 'A reversed Sicilian.' },
  { id: 'reti', name: 'Réti Opening', eco: 'A05', moves: 'Nf3 d5 g3 Nf6 Bg2', blurb: 'Flexible, controls the centre from afar.' },
];

export function getOpening(id: string): Opening | undefined {
  return OPENINGS.find((o) => o.id === id);
}

export function openingMoves(id: string): string[] {
  return getOpening(id)?.moves.split(' ') ?? [];
}
