# Sample data

Everything in this folder is **made up** and exists only so the interface can be designed and
reviewed before the real backend exists. Here's how it's kept separate:

- Pages never import from `lib/sample/` directly. They call `lib/data/`, which returns
  `{ data, source }`. Today `source` is `'sample'`. Each stage swaps one function to real data
  (Supabase, the realtime server, the engine) and the source becomes `'live'`.
- Whenever `source === 'sample'`, the UI shows a `<SampleNotice>` badge or banner.
- Players, bots and ratings are fictional. The sample games are legal move sequences. Two of
  them reuse public-domain historical games (Morphy's "Opera Game" of 1858 and Anderssen's
  "Immortal Game" of 1851) with fictional players attached.

When a stage replaces a function in `lib/data/`, delete the sample data it no longer uses.
