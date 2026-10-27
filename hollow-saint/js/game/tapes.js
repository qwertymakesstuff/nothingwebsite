// Recordings. Each line lists what is heard on the first, second and later plays; the last
// entry repeats. The tape is not quite the same twice.

export const TAPES = {
  mara: {
    title: "Mara's tape",
    lines: [
      { who: null, t: ['[ Hiss. A big room, somewhere. ]'] },
      { who: 'Mara', t: ["If this is running, I'm- okay. Okay."] },
      { who: 'Mara', t: ['Our Father, who art beneath-'] },
      { who: 'Mara', t: ["No. That isn't how it goes."] },
      { who: null, t: ['[ A pause. Something drips. ]', '[ A pause. Something drips, closer to the microphone. ]'] },
      { who: 'Mara', t: ['Four. One. Seven. Three.'] },
      { who: '?', t: ['[ A second voice under the hiss, too low to make out. ]', '[ The second voice, clearer: "...hollowed..." ]', '"Elias."'] },
      { who: 'Mara', t: ["Eli, don't-", "Eli, don't come to the-", 'Eli? Who said that?'] },
      { who: null, t: ['[ The tape runs out. ]', '[ The tape runs out. ]', '[ The tape keeps turning after it should have stopped. ]'] },
    ],
  },
};

// the transcript for the nth play (0-based)
export function tapeLines(id, n) {
  const tape = TAPES[id];
  if (!tape) return [];
  return tape.lines.map(l => ({ who: l.who, text: l.t[Math.min(n, l.t.length - 1)] }));
}
