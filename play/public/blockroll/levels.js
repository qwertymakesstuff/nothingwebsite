// Block Roll levels. . = empty   o = floor   S = start   G = goal hole   f = fragile (cannot stand upright on it)
// x = switch (toggles the bridge when any part of the block rests on it)   b = bridge tile (only there while the bridge is on)
// Every level here was checked with the solver in solver.js (see tests/music/play-levels.test.mjs).
export const LEVELS = [
  ['..oooo....', 'ooSooo....', 'oooooooooo', '....ooooGo'],
  ['ooo.......', 'oSoooo....', 'ooooooo...', '...ooooooo', '....ooooGo', '.....ooooo'],
  ['oooo......', 'oSoooo....', 'oooooooo..', '....ooooGo', '....oooooo'],
  ['ooo.......', 'oSoooo....', 'ooooooooo.', '.....oooGo', '......ooo.'],
  ['ooo.....', 'oSooffoo', 'oooo..oo', '..ooooGo', '..oooooo'],
  ['oooo......', 'oSoo......', 'oooooo....', '..ooooooo.', '....ffooGo', '....ooooo.'],
  ['oooo......', 'oSoo.ooooo', 'oooo.ooffo', 'oooxbbooGo', 'oooo.ooooo'],
  ['oooo.....', 'oSoo..ooo', 'oooooxbbG', '..oooo.oo'],
  ['oooo....oo', 'oSoo..ooGo', 'oooooooooo', '....oooo..'],
  ['ooooo.....', 'oSooo.....', 'ooooo.oooo', '..ooooooGo', '..ooo.oooo', '..ooo.....'],
  ['ooooo.....', 'oSooooffoo', 'ooooo..foo', '.....ooooo', '.....oGooo'],
  ['oooooo....', 'oSooooffo.', 'oooooo..oo', '..o...ooGo', '..oooooooo'],
];
