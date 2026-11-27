# Content Bible

## Voice of the internet
- People have **distinct writing styles** (see CHARACTER_DIRECTORY.md). Hank signs every comment "Hank". Aunt Deb uses ellipses and signs "Love, Aunt Deb". Pruitt writes formally and ends with "Toast responsibly." Max uses caps and "maximums". carbonara_kid shouts. actually_its_pronounced starts with "Actually" or corrects a word.
- **Mundane content is good.** Price-check threads, a gym post nobody likes, a fog-cancelled bike ride.
- **Arguments happen** and don't always resolve. Moderators remove things.
- **Profanity**: natural, occasional, never censored, never the joke on its own.
- **Never** describe sites, people or events as fictional, simulated, fake or AI-generated in-world.
- **Avoid** real-world brand names and recreations of real sites; avoid copying real catchphrases or error pages.

## Formats
- Links inside text: bare addresses (`vidder.tv/watch?v=ID`) or `[label](address)`. Both become working links. Every link must point at a real page (the test suite enforces it).
- Replies/comments: `[user, text, score, replies?]` (Threadit) or `[user, text, likes, replies?]` (Vidder) or `[user, text]` (Blink).
- Commenters who aren't in `users.js` are **passers-by**: real accounts with nothing else; handles must be plain (`[a-z0-9_.]`).

## Schemas
**User** (`users.js`): `name, on[sites], joined, location, bio, interests[], traits[], style, av{avatar spec}, vidder{channel, subs, banner}?`
**Video** (`videos.js`): `id(11), ch, title, date, dur 'm:ss', views, likes, dislikes, tags[], scene{kind,...}, desc, caps[[sec,text]], comments[], music{seed,bpm,mood}?, thumbAt?`
**Playlist**: `id, title, ch, videos[]`
**Community** (`communities.js`): `title, created, members, color, icon, tagline, about, rules[], mods[], flair[]`
**Thread** (`threads.js`): `id, c, u, date, score, title, body, flair?, pinned?, locked?, archived?, replies[]`
**Post** (`posts.js`): `id, u, date, likes, text, photo{kind, caption}?, comments[]`; friendships in `BLINK_FRIENDS`.
**Findr data** (`findr-data.js`): trends (base volume, category), autocomplete phrases, browse categories, related-search pairs.
Planned schemas (Phase 4+): products, reviews, articles, music tracks, events, collectibles, downloads — documented in DEVELOPMENT_ROADMAP.md.

## Cross-referencing
Each story should be visible from at least three places (a video, a thread, a post, a search trend). People appear on the sites their personality would use; their history stays consistent (e.g. Tyler saves $41 → $300; Hank's wife Joan; Big Linda the pot).

## Fourth-wall anomalies
See MYSTERIES.md. Budget: at most one per ~200 pieces of content.
