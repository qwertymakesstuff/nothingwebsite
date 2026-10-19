# Voice recordings

This folder is where real voice recordings go. **It contains none yet.** The game does not generate, synthesise or borrow voices: it plays a recording only if a real file is here, and shows subtitles (with a reading-speed timer) for every line either way.

| File | What it is |
| --- | --- |
| `manifest.json` | master manifest: every line that can be recorded (ID, character, scene, missions that use it, text, direction, expected file, `exists`). Generated. |
| `available.json` | the small list the game loads: only lines that have a recording. Generated. |
| `<CHARACTER>/<LINE_ID>.ogg` | a recording (also `.mp3`). One file per line. |
| `../VOICE_SCRIPT.md` | the master script for the actors: character briefs and every line with its direction. Generated. |

## Adding recordings

1. Record from `VOICE_SCRIPT.md`. Speak only the spoken text; the italic direction is for you.
2. Name each file after its line ID, for example `gta/voice/EDDIE/EDDIE_M01_GARAGE_001.ogg`. Ogg Vorbis, mono, 44.1 kHz, about -16 LUFS, peaks under -1 dBFS, a little silence at each end. Record dry: the game adds the phone/radio filter to lines marked *filtered*.
3. Run `node gta/tools/voice.mjs`. It finds the files, marks them `exists: true` in `manifest.json`, lists them in `available.json` and refreshes the script.
4. Reload the game. Recorded lines now play (and their subtitles last as long as the audio). Lines without a file keep using subtitles only.

Test one line in the game: pause, open **test a line of dialogue**, type the ID. It tells you whether a recording was found and plays it. Add `?voicedebug=1` to the game's address to log (once per line) which lines fell back to subtitles.

## Rules

- Only use recordings you have the rights to. Do not commit synthesised or third-party voices.
- Never rename IDs by hand. Change the dialogue in `js/story/lines/` and regenerate.
- The tests check that the script and manifests match the dialogue database and that no audio file is present that the manifest does not know about.
