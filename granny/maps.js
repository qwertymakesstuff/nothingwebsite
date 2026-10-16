// The three floors of Granny's house. Shared by the game and by tests/music/granny-maps.test.mjs.
//   #  wall            .  floor            D  interior door (opens when someone walks up)
//   H  wardrobe (hide)  B  bed (hide under it)   T  table   S  shelf / crates
//   U  stairs up        N  stairs down          E  front door (needs 3 keys)   X  rug
//   P  player start     G  granny start
//   K  key spot (one per floor is used)   A  battery   Q  bottle   M  note
(function (root) {
  var FLOORS = [
    { name: 'the cellar', wall: 'cellar', rows: [
      '#######################',
      '#S.S...#.......#K....S#',
      '#......D.......D......#',
      '#..T...#...M...#..T...#',
      '####D###.......###D####',
      '#.....................#',
      '#.....................#',
      '#..Q...H.......A..H...#',
      '#####D#####.#####D#####',
      '#S....#.............S.#',
      '#.....D......T..#.....#',
      '#..U..#..........D....#',
      '#.....#.....Q....#..A.#',
      '#######################'
    ] },
    { name: 'the ground floor', wall: 'paper', rows: [
      '#######################',
      '#H....#.....#K........#',
      '#...T.D.....D...T.....#',
      '#.....#..S..#....M....#',
      '###D###..T..###D#######',
      '#.....................#',
      '#.U..........A........#',
      '#....................XE',
      '###D#####D#######D#####',
      '#.....#.......#.......#',
      '#..T..D...G...D...H...#',
      '#..Q..#...K...#...T...#',
      '#.N...#.......#.......#',
      '#######################'
    ] },
    { name: 'upstairs', wall: 'rose', rows: [
      '#######################',
      '#P..B..#.....#H......K#',
      '#......D.....D........#',
      '#...T..#..M..#...B....#',
      '###D####.....####D#####',
      '#.....................#',
      '#.N..........A........#',
      '#.....................#',
      '###D#####D#######D#####',
      '#H....#.......#.......#',
      '#.....D.......D...B...#',
      '#..M..#...T...#...Q...#',
      '#...T.#.......#.......#',
      '#######################'
    ] }
  ];
  var NOTES = [
    'Day 4. She does not sleep. I hear her walk the halls at night, and she hears everything: a creaking board, a breath, a dropped spoon. Walk slowly when she is near.',
    'The front door has three locks. She hid the keys in the house so no one could leave: the red one upstairs, the blue one in the cellar, the green one down here with her.',
    'If you hear her coming, hide. The wardrobes work, and so does the space under a bed. But if she saw you go in, she WILL look. Do not be there when she does.',
    'Throw a bottle. She goes to the sound every time. It buys you a few seconds, and the stairs are loud, so use them when she is far away. Batteries are left in the dark corners.'
  ];
  root.GRANNY_MAPS = { floors: FLOORS, notes: NOTES };
})(typeof window !== 'undefined' ? window : globalThis);
