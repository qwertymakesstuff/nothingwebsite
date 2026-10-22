// Festival screens: the arrival banner and the host's activity for each festival.

import { h, clear } from './dom.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { NPCS_BY_ID, NPCS } from '../data/npcs.js';
import { formatClock } from '../calendar.js';
import { festKey, addPoints } from '../npc.js';
import { judgeEntry, lanternsBlessing, endFestival, secretFriend } from '../festival.js';
import { removeAt } from '../inventory.js';

export function festivalBanner(ui, f) {
  ui.audio?.sfx('quest');
  ui.choice(`${f.desc} Everyone is here until ${formatClock(f.to)}. Talk to Mayor Odessa when you're ready for the main event.`, [{ label: 'Let\'s go!', cls: 'green', key: 'KeyY' }], { title: `Welcome to the ${f.name}!` });
}

export function openFestival(ui, f) {
  const g = ui.game, s = g.state;
  const wrapUp = (lines = []) => {
    endFestival(s, f);
    g.placeNpcs(true);
    g.changeMap('farm', 8, 7, 'down');
    ui.say(null, [...lines, `What a day! You head home as the ${f.name} winds down. (${formatClock(s.date.minutes)})`]);
  };
  const opts = [];
  if (f.kind === 'fair') {
    opts.push({ label: 'Visit the fair stall', run: () => ui.openShop('fair') });
    opts.push({ label: 'End the fair and go home', cls: 'green', key: 'KeyY', run: () => { for (const n of NPCS) addPoints(s, n.id, 10); wrapUp(['The Seedling Fair ends with a toast to the new season. (+friendship with everyone)']); } });
  } else if (f.kind === 'show') {
    const k = `${festKey(s, f)}:entered`;
    if (!s.festivals[k]) opts.push({ label: 'Enter an item', cls: 'green', key: 'KeyY', run: () => pickEntry(ui, f, k, wrapUp) });
    else opts.push({ label: 'Head home', cls: 'green', key: 'KeyY', run: () => wrapUp() });
  } else if (f.kind === 'lanterns') {
    opts.push({ label: 'Light the lanterns', cls: 'green', key: 'KeyY', run: () => { lanternsBlessing(s); wrapUp(['Dozens of paper lanterns drift across Mirror Lake. Something glimmers beneath them. (+30 friendship with everyone, +1 Paper Lantern)']); } });
  } else if (f.kind === 'feast') {
    const sf = NPCS_BY_ID[secretFriend(s)];
    opts.push({ label: 'Start the feast', cls: 'green', key: 'KeyY', run: () => { for (const n of NPCS) addPoints(s, n.id, 20); wrapUp(['The long table groans with food. Everyone toasts to the year. (+20 friendship with everyone)']); } });
    ui.toast(`Your secret friend is ${sf.name}.`, 'quest');
  }
  opts.push({ label: 'Not yet', key: 'KeyN' });
  ui.say(f.host, [f.hostLine], '', () => ui.choice(f.name, opts));
}

function pickEntry(ui, f, k, wrapUp) {
  const s = ui.game.state;
  const wrap = h('div', { style: { width: 'min(560px, 92vw)' } });
  clear(wrap).append(h('h2', 'Choose your entry'), h('p.hint', 'Judged on value and craftsmanship. Artisan goods and cooking score extra.'));
  const grid = h('div.grid');
  s.inventory.slice(0, s.player.backpack).forEach((it, i) => {
    if (!it || ITEMS_BY_ID[it.id].tool || !ITEMS_BY_ID[it.id].price) return;
    grid.append(ui.slotEl(it, i, { onClick: () => {
      entry.close();
      const id = it.id;
      removeAt(s, i, 1);
      s.festivals[k] = true;
      const r = judgeEntry(s, f, id);
      const lines = [`The mayor inspects your ${ITEMS_BY_ID[id].name} with great seriousness...`, ...r.ranking.map((x, n) => `${n + 1}. ${x.who === 'you' ? 'You' : NPCS_BY_ID[x.who].name} — ${ITEMS_BY_ID[x.item].name} (${x.score} points)`)];
      lines.push(r.prize ? `You placed ${['first', 'second', 'third'][r.place - 1]}! Prize: ${r.prize.money}g${r.prize.item ? ` and a ${ITEMS_BY_ID[r.prize.item].name}` : ''}.` : 'No prize this year. There is always next fall!');
      ui.audio?.sfx(r.prize ? 'catch' : 'deny');
      wrapUp(lines);
    } }));
  });
  if (!grid.children.length) wrap.append(h('p', 'You have nothing to enter. Come back with produce!'));
  wrap.append(grid);
  const entry = ui.modal(wrap);
}
