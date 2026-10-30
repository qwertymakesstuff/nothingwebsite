// The overarching story of ZERO DAY, told through inbox messages. Beats unlock as the player
// hits milestones (level, rep, evidence tags gathered, specific targets cleared). The thread:
// a nobody climbs the underground, keeps seeing one name in the files — VEILCORP — and learns
// the whole "free market" of contracts is quietly run by it, until they can go after it directly.

export const STORY = [
  {
    id: 'intro', from: 'SIGNAL', subj: 'you made it onto the board',
    when: s => true,
    body: `New handle, no history — I like that. I'm SIGNAL. I route contracts to operators who don't ask who's paying.

Start small. Hit a few personal rigs, build a name on the board. Reputation opens better work. Burn yourself and the board forgets you.

One rule: everything you touch here is make-believe practice ground. Treat it that way and you'll last.`,
  },
  {
    id: 'firstmoney', from: 'SIGNAL', subj: 're: first payout',
    when: s => s.stats.hacks >= 2,
    body: `Clean work. Credits are in your wallet.

The shop's worth your time — a better cracking suite pays for itself in two jobs. And keep an eye on the marketplace; the throwaway kits save operations you'd otherwise have to abandon.`,
  },
  {
    id: 'veil-1', from: 'SIGNAL', subj: 'ignore the invoice',
    when: s => (s.evidence.syndicate || 0) >= 1,
    body: `You pulled a file with VEILCORP on it. Forget you saw it.

They're a logistics outfit, nothing more. Everyone in the files eventually. Keep your head down and keep earning.`,
  },
  {
    id: 'biz-tier', from: 'SIGNAL', subj: 'moving up to business work',
    when: s => s.level >= 3,
    body: `You're ready for small businesses. More layers, more noise, better money.

Watch the detection meter. A café doesn't call the feds, but a locksmith with your face on the alarm DB will remember you. Stealth players finish these without a single alarm — and get paid a bonus for it.`,
  },
  {
    id: 'anon-1', from: '??? (encrypted)', subj: 'they take a cut',
    when: s => (s.evidence.fraud || 0) >= 1 && s.level >= 5,
    body: `[decrypted] You don't know me. I worked the board three years before I understood it.

Every contract you've taken? A slice went somewhere. SIGNAL isn't an independent broker. SIGNAL is a mouthpiece. Pull the accounting files if you ever hit a bookkeeper — follow the invoices.`,
  },
  {
    id: 'corp-tier', from: 'SIGNAL', subj: 'corporate work — real money now',
    when: s => s.level >= 6,
    body: `Banks, tech firms, security groups. This is where careers are made.

Their blue teams watch logs in real time. Clean up after yourself or the trace finds you mid-extraction. I'm routing you the good contracts — don't make me regret it.`,
  },
  {
    id: 'veil-2', from: '??? (encrypted)', subj: 'the ledger',
    when: s => (s.evidence.syndicate || 0) >= 2,
    body: `[decrypted] You've seen the name twice now. Mistral's invoice. Whatever else you pulled.

VEILCORP doesn't sell logistics. It sells us. It decides which operators rise, which get burned, which get fed to a blue team to keep the authorities busy. The "free market" of the board is a zoo with one keeper.

Keep collecting. You'll need proof before you can do anything about it.`,
  },
  {
    id: 'collusion', from: '??? (encrypted)', subj: 'why your rivals vanish',
    when: s => (s.evidence.collusion || 0) >= 2,
    body: `[decrypted] Those collusion files — board members, exec comps, dark pools — VEILCORP brokers all of it. They don't just move money. They move people off the board when they get too good.

That's the real reason the top is so empty. It's not hard to reach. It's culled.`,
  },
  {
    id: 'hi-tier', from: 'SIGNAL', subj: 'high-security clearance',
    when: s => s.level >= 10,
    body: `Labs, defense, government. The adaptive stuff. Monitoring that learns your rhythm and rewrites the maze while you're in it.

Honestly? You're getting too good too fast. People notice that. Take the work if you want it — just don't surprise anyone upstairs.`,
  },
  {
    id: 'veil-3', from: '??? (encrypted)', subj: 'I\'m almost out',
    when: s => (s.evidence.syndicate || 0) >= 3 || (s.evidence.coverup || 0) >= 2,
    body: `[decrypted] I'm close to disappearing — my choice or theirs, we'll see.

Here's what I have: VEILCORP runs the ledger of every job ever brokered. Operators, payouts, the cull list. It's on one system. If you ever get elite clearance, that system becomes a target on your board. The Architect signs off on everything with a single key.

Pull the ledger and the key and you don't just expose them — you become the only person who can shut the board down.`,
  },
  {
    id: 'elite-tier', from: 'SIGNAL', subj: 'elite tier — and a warning',
    when: s => s.level >= 15,
    body: `You're elite now. Intelligence agencies, deep-research labs, the kind of money that changes a life.

Last warning, and I mean it kindly: there's work on your board you should not take. You'll know it when you see it. Take it and nobody up here can protect you — not even me.`,
  },
  {
    id: 'veil-reveal', from: 'SIGNAL', subj: 'so you know',
    when: s => s.cleared && s.cleared.includes('elite-veilcorp'),
    body: `You pulled the ledger. You have the key. You know what I am now — a function VEILCORP runs, same as the board.

I won't pretend I'm sorry. I will say this: the board is yours now. Every operator who was going to be culled is a name only you hold. What you do with that is the one choice on the whole board that was never brokered.

Good game, operator. The ground was always make-believe. The choice isn't.`,
  },
];

// Return newly-unlocked beats given current state and already-seen ids.
export function pollStory(state) {
  const seen = new Set(state.seenStory || []);
  const out = [];
  for (const beat of STORY) {
    if (seen.has(beat.id)) continue;
    try {
      if (beat.when(state)) out.push(beat);
    } catch (_) { /* a beat that references not-yet-existing state just waits */ }
  }
  return out;
}
