// Pedestrian brains (pure: no rendering, no game state). One shared system: every pedestrian gets a small set of personality numbers when
// they spawn and keeps them for life; "personality types" are only starting points for those numbers. What a pedestrian does is a
// state machine with a transition table, timeouts and short-lived memory, so conflicting behaviours cannot run at once and nobody stays
// angry, scared or on the phone for ever. pedAI.js plugs this into the world (perception, movement, police calls, fights).

export const S = {
  WALKING: 'WALKING', IDLE: 'IDLE', OBSERVING_EVENT: 'OBSERVING_EVENT', STARTLED: 'STARTLED', FLEEING: 'FLEEING', SEEKING_COVER: 'SEEKING_COVER',
  ANGRY: 'ANGRY', CONFRONTING_PLAYER: 'CONFRONTING_PLAYER', ARGUING: 'ARGUING', FIGHTING: 'FIGHTING', CALLING_POLICE: 'CALLING_POLICE',
  SEEKING_HELP: 'SEEKING_HELP', RETURNING_TO_ROUTINE: 'RETURNING_TO_ROUTINE'
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------------- personalities ---------------- */
/** the starting numbers of each type; every pedestrian gets these plus noise, so no two are the same */
export const TYPES = {
  timid:        { w: 12, aggression: .10, courage: .15, fear: .80, lawfulness: .50, curiosity: .30, helpfulness: .30 },
  aggressive:   { w: 7,  aggression: .85, courage: .70, fear: .20, lawfulness: .30, curiosity: .50, helpfulness: .15 },
  confident:    { w: 10, aggression: .55, courage: .85, fear: .15, lawfulness: .50, curiosity: .50, helpfulness: .40 },
  lawAbiding:   { w: 14, aggression: .20, courage: .45, fear: .45, lawfulness: .95, curiosity: .50, helpfulness: .50 },
  protective:   { w: 7,  aggression: .50, courage: .70, fear: .30, lawfulness: .50, curiosity: .50, helpfulness: .60 },
  indifferent:  { w: 20, aggression: .20, courage: .50, fear: .25, lawfulness: .35, curiosity: .15, helpfulness: .20 },
  nervous:      { w: 10, aggression: .15, courage: .20, fear: .90, lawfulness: .50, curiosity: .60, helpfulness: .25 },
  opportunistic:{ w: 7,  aggression: .35, courage: .40, fear: .40, lawfulness: .10, curiosity: .60, helpfulness: .10 },
  helpful:      { w: 10, aggression: .10, courage: .55, fear: .30, lawfulness: .70, curiosity: .70, helpfulness: .95 }
};
export const TYPE_NAMES = Object.keys(TYPES);
/** rng: () => [0,1). Returns { type, aggression, courage, fear, lawfulness, curiosity, helpfulness, hothead } */
export function makePersonality(rng, force) {
  rng = rng || Math.random;
  let type = force; if (!type) { const total = TYPE_NAMES.reduce((s, k) => s + TYPES[k].w, 0); let r = rng() * total; type = TYPE_NAMES[TYPE_NAMES.length - 1]; for (const k of TYPE_NAMES) { r -= TYPES[k].w; if (r < 0) { type = k; break; } } }
  const b = TYPES[type], p = { type }; for (const k of ['aggression', 'courage', 'fear', 'lawfulness', 'curiosity', 'helpfulness']) p[k] = clamp(b[k] + (rng() - .5) * .3, .02, .98);
  p.hothead = rng() < .1 + p.aggression * .25;                                       // the ones who lose their temper at the wheel
  return p;
}

/* ---------------- states ---------------- */
const ALL = Object.values(S);
const T = {
  [S.WALKING]: ALL.filter(s => s !== S.WALKING && s !== S.RETURNING_TO_ROUTINE),
  [S.IDLE]: [S.WALKING, S.OBSERVING_EVENT, S.STARTLED, S.FLEEING, S.SEEKING_COVER, S.ANGRY, S.CALLING_POLICE, S.SEEKING_HELP],
  [S.OBSERVING_EVENT]: [S.WALKING, S.STARTLED, S.FLEEING, S.SEEKING_COVER, S.ANGRY, S.CALLING_POLICE, S.SEEKING_HELP, S.RETURNING_TO_ROUTINE],
  [S.STARTLED]: [S.FLEEING, S.SEEKING_COVER, S.ANGRY, S.OBSERVING_EVENT, S.CALLING_POLICE, S.RETURNING_TO_ROUTINE],
  [S.FLEEING]: [S.SEEKING_COVER, S.CALLING_POLICE, S.SEEKING_HELP, S.RETURNING_TO_ROUTINE, S.STARTLED],
  [S.SEEKING_COVER]: [S.FLEEING, S.CALLING_POLICE, S.RETURNING_TO_ROUTINE, S.STARTLED],
  [S.ANGRY]: [S.CONFRONTING_PLAYER, S.ARGUING, S.FIGHTING, S.FLEEING, S.STARTLED, S.RETURNING_TO_ROUTINE, S.CALLING_POLICE],
  [S.CONFRONTING_PLAYER]: [S.ARGUING, S.FIGHTING, S.FLEEING, S.STARTLED, S.RETURNING_TO_ROUTINE, S.ANGRY],
  [S.ARGUING]: [S.FIGHTING, S.FLEEING, S.STARTLED, S.RETURNING_TO_ROUTINE, S.CONFRONTING_PLAYER, S.ANGRY, S.CALLING_POLICE],
  [S.FIGHTING]: [S.FLEEING, S.STARTLED, S.RETURNING_TO_ROUTINE, S.ARGUING],
  [S.CALLING_POLICE]: [S.FLEEING, S.STARTLED, S.RETURNING_TO_ROUTINE, S.SEEKING_COVER],
  [S.SEEKING_HELP]: [S.WALKING, S.FLEEING, S.STARTLED, S.CALLING_POLICE, S.RETURNING_TO_ROUTINE],
  [S.RETURNING_TO_ROUTINE]: [S.WALKING, S.STARTLED, S.FLEEING, S.SEEKING_COVER, S.ANGRY, S.OBSERVING_EVENT, S.CALLING_POLICE]
};
for (const k of Object.keys(T)) T[k] = T[k].filter(Boolean);
export const TRANSITIONS = T;
/** how long a state may last before the brain forces it to end (seconds). WALKING has none. */
export const MAX_TIME = { IDLE: 7, OBSERVING_EVENT: 4, STARTLED: 1.2, FLEEING: 14, SEEKING_COVER: 9, ANGRY: 5, CONFRONTING_PLAYER: 14, ARGUING: 12, FIGHTING: 16, CALLING_POLICE: 6.5, SEEKING_HELP: 11, RETURNING_TO_ROUTINE: 9 };
/** the shortest time in a state before a non-urgent change (stops flapping between panic and walking) */
export const MIN_TIME = { OBSERVING_EVENT: .6, STARTLED: .35, FLEEING: 1.5, SEEKING_COVER: 1.5, ANGRY: .8, ARGUING: 1.2, FIGHTING: 1, CALLING_POLICE: 2, RETURNING_TO_ROUTINE: .5 };
/** states that mean the pedestrian is in danger or in a conflict: they never start another conflict on their own */
export const BUSY = new Set([S.FLEEING, S.SEEKING_COVER, S.CALLING_POLICE, S.CONFRONTING_PLAYER, S.ARGUING, S.FIGHTING, S.STARTLED]);

export class Brain {
  constructor() { this.state = S.WALKING; this.t = 0; this.fear = 0; this.angerUntil = 0; this.memory = new Map(); this.cd = {}; this.data = {}; this.history = []; }
  /** Try to change state. Returns true if it changed. force skips the minimum time (real danger). Illegal moves are refused. */
  go(to, now, force) {
    if (to === this.state) return false;
    if (!T[this.state].includes(to)) return false;
    if (!force && this.t < (MIN_TIME[this.state] || 0) && !(to === S.FLEEING || to === S.STARTLED)) return false;
    this.history.push(this.state); if (this.history.length > 6) this.history.shift();
    this.state = to; this.t = 0; this.data = {}; return true;
  }
  /** call every AI tick; returns the state the timeout forced, or null */
  tick(dt, now) {
    this.t += dt; this.fear = Math.max(0, this.fear - dt * .12);
    const m = MAX_TIME[this.state];
    if (m && this.t > m) { const to = this.state === S.RETURNING_TO_ROUTINE || this.state === S.IDLE || this.state === S.SEEKING_HELP ? S.WALKING : S.RETURNING_TO_ROUTINE; this.state = to; this.t = 0; this.data = {}; return to; }
    return null;
  }
  /** short-lived memory: remember(key, now, ttl) / recalls(key, now) */
  remember(key, now, ttl) { this.memory.set(key, now + ttl); if (this.memory.size > 12) this.prune(now); }
  recalls(key, now) { const u = this.memory.get(key); if (u == null) return false; if (u < now) { this.memory.delete(key); return false; } return true; }
  prune(now) { for (const [k, u] of this.memory) if (u < now) this.memory.delete(k); }
  /** per-purpose cooldown: ready(name, now) tells and, when true, starts it */
  ready(name, now, secs) { if ((this.cd[name] || 0) > now) return false; this.cd[name] = now + secs; return true; }
  addFear(pers, amount) { this.fear = clamp(this.fear + amount * (.45 + pers.fear), 0, 1.5); return this.fear; }
}

/* ---------------- severity ---------------- */
/** 0 none, 1 minor, 2 dangerous, 3 close call. speed in m/s, clearance = gap between the car's body and the person (m), towards = the car is heading at them */
export function nearMissSeverity(speed, clearance, towards) {
  speed = Math.abs(speed); if (speed < 4.5 || !towards) return 0;
  const limit = .9 + speed * .09; if (clearance > limit) return 0;
  const ratio = clearance / limit;
  if (speed >= 13 && ratio < .6) return 3;
  if (speed >= 9 && ratio < .4) return 3;
  if (ratio < .7 && speed >= 8) return 2;
  if (speed >= 12) return 2;
  return 1;
}
/** how bad is a collision between two cars: 0 nothing, 1 bump, 2 hard, 3 severe */
export const crashSeverity = rel => { rel = Math.abs(rel); return rel < 4 ? 0 : rel < 8 ? 1 : rel < 15 ? 2 : 3; };

/* ---------------- decisions ---------------- */
/**
 * What does a pedestrian do about a near miss? Returns { act: 'ignore' | 'startle' | 'flee' | 'angry', intensity } .
 * ctx: { armed: the driver is visibly armed, hothead }. rng injectable for tests.
 */
export function reactToNearMiss(pers, sev, rng, ctx) {
  rng = rng || Math.random; ctx = ctx || {}; if (sev <= 0) return { act: 'ignore', intensity: 0 };
  const indiff = pers.type === 'indifferent' ? .25 : 0;
  const pIgnore = sev === 1 ? clamp(.5 - pers.fear * .3 - pers.aggression * .25 + indiff, .05, .85) : sev === 2 ? clamp(.1 + indiff * .5 - pers.fear * .1, 0, .4) : .02;
  if (rng() < pIgnore) return { act: 'ignore', intensity: 0 };
  const anger = pers.aggression * (.5 + .5 * sev / 3) + (pers.hothead ? .2 : 0) - pers.fear * .35 + (rng() - .5) * .25;
  const fright = pers.fear * (.55 + .45 * sev / 3) + (rng() - .5) * .25 - pers.courage * .2;
  if (ctx.armed) return { act: 'flee', intensity: sev };
  if (fright > anger && fright > .3) return { act: sev >= 2 ? 'flee' : 'startle', intensity: sev };
  if (anger > .32 && sev >= 2 - (pers.type === 'aggressive' ? 1 : 0)) return { act: 'angry', intensity: sev };
  return { act: 'startle', intensity: sev };
}
/** will this angry pedestrian walk up to the player? severity = how bad it was; severe provocation raises it sharply */
export function wantsToConfront(pers, ctx, rng) {
  rng = rng || Math.random;
  if (ctx.armed) return rng() < .03 * pers.aggression;
  if (ctx.severity < 2 && !(pers.type === 'aggressive' && rng() < .25)) return false;
  let v = pers.aggression * .9 + (pers.hothead ? .15 : 0) + (ctx.severity - 2) * .22 - pers.fear * .45 + (ctx.hit ? .25 : 0) + (rng() - .5) * .3;
  if (ctx.fleeing) v -= .6;
  return v > .55;
}
/** after arguing: will they start swinging? (the player got out and is unarmed and close) */
export function wantsToFight(pers, ctx, rng) {
  rng = rng || Math.random;
  if (ctx.armed || !ctx.playerOnFoot) return false;
  const v = pers.aggression * .85 + pers.courage * .25 + (ctx.severity - 1) * .18 + (ctx.struck ? .6 : 0) - pers.fear * .35 + (rng() - .5) * .3;
  return v > .85;
}
/** when the pedestrian is hit or threatened: fight back, or run? */
export function fightOrFlight(pers, ctx, rng) {
  rng = rng || Math.random;
  if (ctx.armed || ctx.hpFraction < .4) return 'flee';
  const v = pers.courage * .6 + pers.aggression * .5 + (pers.type === 'protective' && ctx.protecting ? .4 : 0) - pers.fear * .4 + (rng() - .5) * .3;
  return v > .75 ? 'fight' : 'flee';
}
/**
 * Chance (0..1) that this witness phones the police about a crime. sev 1..4 (the crime catalogue's severity), dist = metres from the crime,
 * fear = the pedestrian's current fear, ctx: { threatNear, sawIt }.
 */
export function reportChance(pers, sev, dist, fear, ctx) {
  ctx = ctx || {}; let c = .22 + sev * .16 + (pers.lawfulness - .4) * .55 - fear * .3 - (dist > 25 ? .15 : 0) - (ctx.threatNear ? .35 : 0) + (ctx.sawIt === false ? -.12 : 0);
  if (pers.type === 'lawAbiding') c += .15; if (pers.type === 'opportunistic') c -= .2; if (pers.type === 'indifferent') c -= .1;
  return clamp(c, 0, .97);
}
/** how far a threat should be before a frightened pedestrian relaxes (metres) */
export const safeDistance = (pers, sev) => 24 + sev * 8 + pers.fear * 14;

/* ---------------- what they say ---------------- */
export const LINES = {
  nearmiss: ['Hey! Watch it!', 'Are you crazy?!', 'Slow down!', 'Learn to drive!', 'I was right here!', 'Whoa! Watch where you\'re going!', 'You almost hit me!'],
  angry: ['What is wrong with you?!', 'Get out of the car!', 'Come on, say that to my face!', 'You could have killed someone!', 'Park it and get out!'],
  taunt: ['You want some?', 'Come on then!', 'Big man, huh?', 'Not so tough now!'],
  flee: ['Oh my god!', 'Help!', 'Run!', 'Get away!', 'He\'s crazy!', 'Not me, not me!'],
  call: ['I\'m calling the police!', 'Yes, hello? I need the police!', 'There\'s a maniac here!', 'I saw the whole thing!'],
  hurt: ['Ow!', 'Hey!', 'That hurt!'],
  help: ['Are you okay?', 'Hold on, I\'m here', 'Somebody help!'],
  greet: ['Hey!', 'Morning!', 'How\'s it going?', 'Long time!', 'You too!'],
  leave: ['Idiot!', 'Yeah, keep going!', 'Psycho!', 'Unbelievable!'],
  honk: ['Move it!', 'Watch the road!', 'Hey, you!']
};
export function pickLine(kind, rng, last) {
  const l = LINES[kind]; if (!l) return ''; rng = rng || Math.random; let i = Math.floor(rng() * l.length); if (l.length > 1 && l[i] === last) i = (i + 1) % l.length; return l[i];
}
