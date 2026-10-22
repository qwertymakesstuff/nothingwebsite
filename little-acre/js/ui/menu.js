// The tabbed menu: bag, crafting, quests, journal, calendar, map, friends, options.

import { h, clear, icon, gold } from './dom.js';
import { iconURL, portraitURL, GRASS } from '../render/sprites.js';
import { ITEMS_BY_ID } from '../data/items.js';
import { NPCS } from '../data/npcs.js';
import { MAPS, WORLD_LAYOUT, INDOOR_PARENT } from '../data/maps.js';
import { FESTIVALS } from '../data/events.js';
import { QUESTS_BY_ID } from '../data/quests.js';
import { PLAYER, FRIENDSHIP, CLOCK } from '../config.js';
import { moveSlot, sortBackpack, removeAt } from '../inventory.js';
import { questProgress } from '../quests.js';
import { journal } from '../journal.js';
import { hearts } from '../conditions.js';
import { weekdayOf, seasonTitle, formatClock, dayIndex } from '../calendar.js';
import { toolName } from '../economy.js';
import { craftingContent } from './craftView.js';
import { deleteSave } from '../save.js';

const TABS = [
  ['inventory', 'Bag', 'KeyI'], ['crafting', 'Crafting', 'KeyC'], ['quests', 'Quests', 'KeyJ'], ['journal', 'Journal', 'KeyK'],
  ['calendar', 'Calendar', 'KeyL'], ['map', 'Map', 'KeyM'], ['friends', 'Friends', 'KeyF'], ['options', 'Options', 'KeyO'],
];
export const MENU_KEYS = Object.fromEntries(TABS.map(([id, , k]) => [k, id]));

export function openMenu(ui, tab) {
  const root = h('div.menu');
  let cur = tab, picked = null, focus = null;
  const render = () => {
    clear(root);
    root.append(h('div.tabs', TABS.map(([id, label, k]) => h(`button${id === cur ? '.on' : ''}`, { on: { click: () => { cur = id; picked = null; render(); } }, title: `${label} (${k.slice(3)})` }, label))));
    const body = h('div');
    root.append(body);
    VIEWS[cur](ui, body, { render, get picked() { return picked; }, set picked(v) { picked = v; }, get focus() { return focus; }, set focus(v) { focus = v; } });
  };
  render();
  const entry = ui.modal(root, { cls: 'menuwrap' });
  entry.keys = e => {
    const t = MENU_KEYS[e.code] || (e.code === 'Tab' ? 'close' : null);
    if (t === 'close' || t === cur) { entry.close(); return true; }
    if (t) { cur = t; picked = null; render(); return true; }
    return false;
  };
}

const VIEWS = {
  inventory(ui, body, st) {
    const g = ui.game, s = g.state;
    const grid = h('div.grid');
    for (let i = 0; i < PLAYER.maxBackpack; i++) {
      const locked = i >= s.player.backpack;
      grid.append(ui.slotEl(s.inventory[i], i, {
        locked, picked: st.picked === i, selected: i === s.player.slot,
        key: i < PLAYER.hotbar ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='][i] : null,
        onClick: locked ? null : (j, e, right) => {
          if (st.picked == null) { if (s.inventory[j]) { st.picked = j; st.focus = j; } else st.focus = null; }
          else { moveSlot(s, st.picked, j); st.focus = j; st.picked = null; ui.audio?.sfx('blip'); }
          if (right && j < PLAYER.hotbar) g.selectSlot(j);
          st.render();
        },
      }));
    }
    const f = st.focus != null ? s.inventory[st.focus] : null;
    const detail = h('div.detail');
    if (f) {
      const info = ui.itemInfo(f.id), it = ITEMS_BY_ID[f.id];
      detail.append(h('h3', icon(iconURL(f.id)), info.name, h('span.hint', info.cat)), h('div', info.desc),
        h('div.row.wrap', { style: { marginTop: '8px' } },
          info.price ? h('span.gold', `Sells for ${info.price}g${f.n > 1 ? ` (${info.price * f.n}g for ${f.n})` : ''}`) : null,
          info.energy ? h('button.btn.green.small', { on: { click: () => { g.eat(st.focus); } } }, `Eat (+${info.energy})`) : null,
          st.focus >= PLAYER.hotbar ? h('button.btn.small', { on: { click: () => { const to = s.inventory.slice(0, PLAYER.hotbar).findIndex(x => !x); if (to >= 0) { moveSlot(s, st.focus, to); st.focus = to; st.render(); } else ui.toast('Your hotbar is full.'); } } }, 'To hotbar') : null,
          !it.tool ? h('button.btn.red.small', { on: { click: () => ui.confirm(`Throw away ${f.n}× ${info.name}? This can't be undone.`, () => { removeAt(s, st.focus, f.n); st.focus = null; st.picked = null; st.render(); }) } }, 'Trash') : null));
    } else detail.append(h('div.hint', 'Click an item to see it. Click it, then click another slot, to move or swap it. The top row is your hotbar (keys 1–=).'));
    const tools = Object.keys(s.tools).filter(t => s.inventory.some(x => x?.id === t)).map(t => toolName(s, t));
    body.append(
      h('div.row.spread.wrap', h('div', h('b', `${s.player.name}`), h('span.muted', ` of ${s.player.farm} Farm`)), h('div.row', h('span.gold', gold(s.player.money)), h('button.btn.small', { on: { click: () => { sortBackpack(s); st.picked = null; st.focus = null; st.render(); } } }, 'Sort'))),
      h('div', { style: { marginTop: '8px', overflowX: 'auto' } }, grid),
      detail,
      h('p.hint', `Tools: ${tools.join(', ')}. Energy ${Math.ceil(s.player.energy)}/${s.player.maxEnergy}. Backpack ${s.player.backpack} slots${s.player.backpack < PLAYER.maxBackpack ? ' (Pip sells a bigger one)' : ''}.`));
  },

  crafting(ui, body, st) { body.append(craftingContent(ui, null, st.render)); },

  quests(ui, body) {
    const s = ui.game.state;
    const active = Object.keys(s.quests.active);
    body.append(h('h3', 'Quests'));
    if (!active.length) body.append(h('p.hint', 'No quests right now. Check the bulletin board in the town square.'));
    for (const id of active) {
      const q = QUESTS_BY_ID[id], pr = questProgress(s, id);
      body.append(h('div.detail', h('div.row.spread', h('b', q.title), h('span.hint', `from ${q.from}`)), h('div', q.text),
        pr ? h('div.row', h('div.progress', { style: { flex: 1 } }, h('i', { style: { width: `${Math.min(100, (pr.have / pr.need) * 100)}%` } })), h('span', `${Math.min(pr.have, pr.need)}/${pr.need}`)) : null,
        h('div.hint', 'Reward: ', rewardText(q.reward))));
    }
    body.append(h('h3', { style: { marginTop: '14px' } }, 'Bulletin requests'));
    if (!s.requests.length) body.append(h('p.hint', 'None accepted. A new request is posted on the board in town every morning.'));
    const today = dayIndex(s.date);
    for (const r of s.requests) {
      const npc = NPCS.find(n => n.id === r.npc);
      body.append(h('div.list', h('div.item', icon(iconURL(r.item)), h('div.grow', h('b', `${r.n}× ${ITEMS_BY_ID[r.item].name} for ${npc.name}`), h('div.desc', `Reward ${r.reward}g · ${r.due - today <= 0 ? 'due today' : `${r.due - today} day(s) left`}`)))));
    }
    if (s.quests.done.length) body.append(h('h3', { style: { marginTop: '14px' } }, 'Completed'), h('p.hint', s.quests.done.map(id => QUESTS_BY_ID[id].title).join(' · ')));
  },

  journal(ui, body) {
    const j = journal(ui.game.state);
    body.append(h('div.row.spread', h('h3', 'Collection Journal'), h('b', `${j.found}/${j.total} (${j.percent}%)`)), h('div.progress', { style: { marginBottom: '10px' } }, h('i', { style: { width: `${j.percent}%` } })));
    for (const sec of j.sections) {
      body.append(h('div.journal-sec', h('div.row.spread', h('b', sec.title), h('span.hint', `${sec.found}/${sec.entries.length}`)),
        h('div.row.wrap', { style: { gap: '3px', marginTop: '4px' } }, sec.entries.map(e => {
          const it = ITEMS_BY_ID[e.id];
          const tip = e.found ? `${it.name} — ${sec.id === 'fish' ? `caught ${e.count}, biggest ${e.best} cm` : sec.id === 'minerals' ? 'found' : `${e.count}`}` : '???';
          return h(`div.slot${e.found ? '' : '.unfound'}`, { title: tip, style: { cursor: 'default' } }, icon(iconURL(e.id)), e.found && e.count > 1 ? h('span.n', e.count) : null);
        }))));
    }
  },

  calendar(ui, body) {
    const s = ui.game.state, season = s.date.season;
    body.append(h('div.row.spread', h('h3', `${seasonTitle(season)}, Year ${s.date.year}`), h('span.hint', `Today: ${formatClock(s.date.minutes)}`)));
    const cal = h('div.cal', CLOCK.weekdays.map(d => h('div.wd', d)));
    for (let d = 1; d <= CLOCK.daysPerSeason; d++) {
      const fest = FESTIVALS.find(f => f.season === season && f.day === d);
      const bdays = NPCS.filter(n => n.birthday.season === season && n.birthday.day === d);
      cal.append(h(`div.d${d === s.date.day ? '.today' : d < s.date.day ? '.past' : ''}`, { title: `${weekdayOf(season, d)} ${d}` },
        h('b', d),
        fest ? h('span.ev', fest.name) : null,
        bdays.map(n => h('span.bd', h('img.pix', { src: portraitURL(n.look), alt: '' }), `${n.name.split(' ')[0] === 'Mayor' ? 'Odessa' : n.name.split(' ')[0] === 'Old' ? 'Teodor' : n.name.split(' ')[0]}'s birthday`))));
    }
    body.append(cal);
    const fs = FESTIVALS.filter(f => f.season === season);
    for (const f of fs) body.append(h('p.hint', h('b', `${f.name} (${seasonTitle(season)} ${f.day}): `), `${f.desc} ${MAPS[f.map].name}, ${formatClock(f.from)}–${formatClock(f.to)}.`));
    body.append(h('p.hint', `Tomorrow's forecast: ${{ sun: 'sunny', rain: 'rain', snow: 'snow' }[s.weather.tomorrow]}.`));
  },

  map(ui, body) {
    const s = ui.game.state;
    const here = INDOOR_PARENT[s.player.map] || s.player.map;
    const grid = h('div.worldmap');
    const cells = {};
    for (const [id, pos] of Object.entries(WORLD_LAYOUT)) cells[`${pos.x},${pos.y}`] = id;
    for (let y = 0; y < 3; y++) for (let x = 0; x < 5; x++) {
      const id = cells[`${x},${y}`];
      if (id) {
        grid.append(h(`div.area${id === here ? '.here' : ''}`, { style: { gridColumn: x + 1, gridRow: y + 1 } }, miniMap(s, id, id === here ? s.player : null), MAPS[id].name, id === here ? h('div.hint', 'You are here') : null));
      } else {
        const link = (x === 1 || x === 3) && y === 1 ? '⇄' : '';
        grid.append(h('div.link', { style: { gridColumn: x + 1, gridRow: y + 1 } }, link));
      }
    }
    body.append(h('h3', 'Bramblewick Valley'), grid,
      h('p.hint', 'Farm ⇄ town (east road). From town: north to Whisperwood (forage, Juni), south to Mirror Lake (fishing, Teodor), east to the Old Quarry (stone and ore). Shops: Pip\'s Provisions (seeds, food), Ostrow Smithy (tool upgrades), Fenn\'s Workshop (farm upgrades, decorations).'));
  },

  friends(ui, body) {
    const s = ui.game.state, today = dayIndex(s.date);
    const list = h('div.friends');
    for (const n of NPCS) {
      const f = s.npcs[n.id], hs = hearts(s, n.id);
      list.append(h('div.friend', h('img.pix', { src: portraitURL(n.look), alt: '' }), h('div',
        h('b', f.met ? n.name : '???'), h('div.hint', f.met ? n.role : 'Not met yet'),
        h('div.hearts', '♥'.repeat(hs), h('span.e', '♥'.repeat(FRIENDSHIP.maxHearts - hs))),
        h('div.ticks', `${f.talked === today ? '✓ talked' : '· not talked'} today · ${f.gifted === today ? '✓ gift given' : '· no gift'} · birthday ${seasonTitle(n.birthday.season)} ${n.birthday.day}`))));
    }
    body.append(h('h3', 'Friends'), h('p.hint', 'Talk to everyone daily and give one gift a day (hold the item, talk first, then press E again). Birthday gifts count triple.'), list);
  },

  options(ui, body) {
    const g = ui.game, s = g.state;
    const toggle = (k, label) => h('label.row', h('input', { type: 'checkbox', checked: s.settings[k], on: { change: e => { s.settings[k] = e.target.checked; ui.audio?.applySettings(s.settings); g.save(); } } }), label);
    body.append(
      h('h3', 'Options'),
      h('div.col', toggle('music', 'Music'), toggle('sfx', 'Sound effects'),
        h('label.row', 'Volume', h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: s.settings.volume, on: { input: e => { s.settings.volume = +e.target.value; ui.audio?.applySettings(s.settings); } } }))),
      h('div.row.wrap', { style: { margin: '10px 0' } },
        h('button.btn.green', { on: { click: () => { g.save(); ui.toast('Game saved.', 'good'); } } }, 'Save now'),
        h('button.btn.red', { on: { click: () => ui.confirm('Delete your save and start over? Your farm will be lost.', () => { deleteSave(); location.reload(); }) } }, 'Delete save')),
      h('p.hint', `The game saves automatically every morning, whenever you change area, every minute and when you close the page.${ui.lastSaved ? ` Last saved ${ui.lastSaved.toLocaleTimeString()}.` : ''}`),
      h('h3', 'Controls'),
      h('div.hint', { html: [
        '<b>Move</b> WASD / arrows · <b>Use tool or item</b> Space or left click · <b>Interact</b> (talk, harvest, open, ship) E or right click',
        '<b>Hotbar</b> 1–9, 0, -, = or mouse wheel / Q · <b>Menu</b> Tab / I · <b>Crafting</b> C · <b>Quests</b> J · <b>Journal</b> K · <b>Calendar</b> L · <b>Map</b> M · <b>Friends</b> F · <b>Close</b> Esc',
        'Hold Space to keep using a tool. On touch screens use the stick and the Use / Act buttons; tap a nearby tile to act on it.',
        '<b>The loop:</b> till grass with the hoe, plant seeds, water every day (rain does it for you), harvest when ripe, put crops in the shipping bin by your house. You are paid overnight. Go to bed before 2 am or you will pass out.',
      ].map(l => `<p>${l}</p>`).join('') }),
    );
  },
};

function rewardText(r = {}) {
  const parts = [];
  if (r.money) parts.push(`${r.money}g`);
  for (const [id, n] of r.items || []) parts.push(`${n}× ${ITEMS_BY_ID[id].name}`);
  for (const npc of Object.keys(r.friendship || {})) parts.push(`friendship with ${NPCS.find(n => n.id === npc).name.split(' ')[0]}`);
  return parts.join(', ') || '—';
}

// A small overview of a map: one 3x3 block per tile.
function miniMap(state, mapId, player) {
  const m = MAPS[mapId], k = 3;
  const c = h('canvas', { width: m.w * k, height: m.h * k });
  const ctx = c.getContext('2d');
  const season = state.date.season;
  const col = ch => ({ '~': '#3b86cf', F: '#3b86cf', b: '#b5844e', '=': '#c9a26c', c: '#a3a3ab', s: '#e9d9a3', g: '#a59b8c', T: '#2f6a2a', h: '#3c7a32', r: '#6a5d50', B: '#b8483a', D: '#7a4a26', x: '#8a7a6a' }[ch] || GRASS[season].base);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    let ch = m.rows[y][x];
    if (ch === 'x' && state.unlocks.northfield) ch = '.';
    ctx.fillStyle = col(ch); ctx.fillRect(x * k, y * k, k, k);
  }
  for (const [kk, so] of Object.entries(state.maps[mapId].soil)) { const [x, y] = kk.split(',').map(Number); ctx.fillStyle = so.c ? '#5fae3e' : '#8f6236'; ctx.fillRect(x * k, y * k, k, k); }
  if (player) { const px = Math.floor(player.x / 16), py = Math.floor(player.y / 16); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(px * k - 2, py * k - 2, 7, 7); ctx.fillStyle = '#fff'; ctx.fillRect(px * k, py * k, 3, 3); }
  return c;
}
