# Pedestrian AI (Phase 4.7)

- `js/pedBrain.js` is the pure logic (personalities, the state machine with legal transitions and timeouts, memory and cooldowns, near-miss and crash severity, confrontation and report rules). It is unit-tested in `tests/music/gta-peds.test.mjs`.
- `js/pedAI.js` wires it into the world: perception events (`emit`), movement, flee/cover targets, confrontations, fights, witness phone calls, drivers who get out after a crash, greetings and pairs. `__gta.pedai` exposes `cfg`, `info()` and `reset()` for debugging.
- Personalities: timid, aggressive, confident, lawAbiding, protective, indifferent, nervous, opportunistic, helpful, plus a `hothead` flag for drivers. Each pedestrian also has persistent aggression, courage, fear, lawfulness and curiosity values.
- States: WALKING, IDLE, OBSERVING_EVENT, STARTLED, FLEEING, SEEKING_COVER, ANGRY, CONFRONTING_PLAYER, ARGUING, FIGHTING, CALLING_POLICE, SEEKING_HELP, RETURNING_TO_ROUTINE.
- Crimes are reported by witnesses, not by magic: a pedestrian who saw or heard a crime may phone (2.6-4 s, interruptible), and the first completed call goes to the existing dispatcher. Police only learn the crime scene, never the player's live position, unless a living witness can still see the player.
- Player punch: Q (touch: PUNCH).
