# Sample data

Only **puzzles** are still sample content (Stage 6 replaces them with the Lichess CC0 puzzle
database). The UI labels them with a `<SampleNotice>`. Everything else (players, ratings, games,
statistics, achievements, leaderboards and settings) is real data from Supabase, read through
`lib/db.ts`.

The puzzle positions are taken from two public-domain historical games (Morphy's "Opera Game",
1858, and Anderssen's "Immortal Game", 1851). Their solutions are genuine; ratings and solve counts
are made up.
