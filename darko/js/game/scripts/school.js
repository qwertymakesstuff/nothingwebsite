// The school, routed by story beat: which class each seat starts, which doors open, and where
// the courtyard leads. The October 3 and October 7 versions live in chapters 2 and 4; everything
// here falls back to them.

import { n, say } from './util.js';
import { CHAPTER2 } from './chapter2.js';
import { CHAPTER4 } from './chapter4.js';

const open = (room) => [['sfx', 'door'], ['go', room, 'from_hall']];
const locked = text => [['sfx', 'locked'], n(text)];
const earlier = (script, s) => (typeof script === 'function' ? script(s) : script);

export const SCHOOL_SCRIPTS = {
  sit_english: s => {
    switch (s.beat) {
      case 'oct13': return s.hasItem('poem') ? [n('His desk.')] : [['run', 'poetry_day']];
      case 'oct18': return s.has('lunch_walk') ? [n('His desk.')] : [['run', 'greene_banned']];
      case 'oct26': return s.has('watership') ? [n('His desk.')] : [['run', 'watership_class']];
      case 'oct27': return [n('His desk. Nobody else is here.')];
      default: return earlier(CHAPTER2.sit_english, s);
    }
  },

  sit_health: s => {
    if (s.beat === 'oct13') return s.hasItem('lifeline') ? [n('His desk.')] : [['run', 'lifeline']];
    return earlier(CHAPTER4.sit_health, s);
  },

  sit_physics: s => {
    if (s.beat === 'oct18' && s.has('seth_knife') && !s.has('golf_walk')) return [['run', 'physics18']];
    return [n('His desk, next to the window.')];
  },

  door_english: s => {
    if (s.beat === 'oct13' && s.hasItem('poem')) return locked('English is over. Health class, after lunch.');
    if (s.beat === 'oct18' && s.has('lunch_walk')) return locked('English is over. Lunch.');
    if (s.beat === 'oct26' && s.has('watership')) return locked("English is over. He doesn't want to see Ms. Pomeroy right now.");
    if (s.beat === 'oct27' && s.has('cellar_door')) return locked('An empty classroom. On the board, in perfect penmanship: Cellar Door.');
    return open('english');
  },

  door_health: s => {
    if (s.beat === 'oct13') return s.hasItem('poem') ? open('health') : locked('Health is after lunch. English first.');
    return earlier(CHAPTER2.door_health, s);
  },

  door_physics: s => {
    if (s.beat === 'oct18') {
      if (!s.has('lunch_walk')) return locked('Physics is at 2:30.');
      if (!s.has('seth_knife')) return locked('Physics is at 2:30. Lunch first.');
      return open('physics');
    }
    if (s.beat === 'oct14' || s.beat === 'oct24' || s.beat === 'oct25') return open('physics');
    return earlier(CHAPTER2.door_physics, s);
  },

  door_office: s => locked(s.beat === 'oct27'
    ? 'The principal\'s office. Through the glass, Principal Cole is on the phone, laughing about something.'
    : "The principal's office. You don't go in there unless you have to."),

  school_leave: s => {
    if (s.beat === 'oct14' && s.has('photo_found')) return [['fadeOut'], ['run', 'dinner14']];
    if (s.beat === 'oct14') return [n('Not yet. Who wrote the book?')];
    if (s.beat === 'oct18' && s.has('lunch_walk') && !s.has('seth_knife')) return [n('Lunch is around the side of the building. (East.)')];
    if (s.beat === 'oct18') return [n('Physics first, at 2:30.')];
    if (s.beat === 'oct24') return [n(s.has('kissed') ? 'Not yet.' : 'Gretchen. Where did she go?')];
    if (s.beat === 'oct26') return [n('Gretchen first.')];
    if (s.beat === 'oct27') return [n(s.has('cellar_door') ? 'Cherita is at her locker.' : 'Ms. Pomeroy\'s room first.')];
    return earlier(CHAPTER2.school_leave, s);
  },

  monnitoff_class: s => {
    if (s.beat === 'oct14') return [say('monnitoff', 'Read it. Then come back with questions.')];
    if (s.beat === 'oct18') return [say('monnitoff', 'Partners tomorrow, Mr. Darko.')];
    return [say('monnitoff', 'Mr. Darko.')];
  },
  monnitoff_desk: s => [n(s.beat === 'oct14' || s.beat === 'oct25'
    ? 'A Brief History of Time, with a dozen torn-paper bookmarks. Wormhole diagrams in red pen.'
    : 'Papers to grade. A coffee mug that says E = MC (SQUARED).')],
  physics_board: s => [n(s.beat === 'oct14' || s.beat === 'oct25'
    ? 'Two cones joined at the tips. An arrow passing through them. "Einstein-Rosen bridge."'
    : 'Diagrams nobody has erased.')],
  farmer_hall: s => (s.beat === 'oct13'
    ? [say('farmer', 'Health. One o\'clock. Today we begin the Lifeline.')]
    : earlier(CHAPTER2.farmer_hall, s)),
  pomeroy: s => {
    if (s.beat === 'oct13') return [say('pomeroy', "It's Poetry Day, Donnie. Don't look so terrified.")];
    if (s.beat === 'oct18') return [say('pomeroy', 'Books on my desk, please.')];
    if (s.beat === 'oct26') return [n('Ms. Pomeroy, by the TV. She looks tired.')];
    return earlier(CHAPTER2.pomeroy, s);
  },
  english_board: s => {
    if (s.beat === 'oct13') return [n('POETRY DAY.')];
    if (s.beat === 'oct18' || s.beat === 'oct26') return [n('WATERSHIP DOWN. Richard Adams.')];
    if (s.beat === 'oct27') return [n('Cellar Door.')];
    return earlier(CHAPTER2.english_board, s);
  },
  health_board: s => [n(s.beat === 'oct13' ? 'FEAR on one end. LOVE on the other. A line between them.' : 'HEALTH - MS. FARMER. TODAY: A VIDEO PRESENTATION.')],
};
