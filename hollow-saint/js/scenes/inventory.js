// Elias's pockets: what he carries, what he has learned, and a rough map of where he has been.
// Three pages; left/right switch between them.

import { C } from '../engine/palette.js';
import { W, H } from '../game/config.js';
import { wrap, textWidth } from '../engine/font.js';
import { keyName } from '../engine/input.js';
import { ITEMS } from '../game/items.js';
import { NOTES, DOCS, noteTitle } from '../game/docs.js';
import { ICONS } from '../game/art.js';
import { ROOMS } from '../game/rooms/index.js';
import { MAX_HP } from '../game/state.js';
import { panel } from '../ui/panel.js';
import { DocumentScene } from './document.js';

export const TABS = ['Pockets', 'Notes', 'Map'];
const LIST_X = 14, LIST_Y = 30, ROW = 11, VISIBLE = 12;

const CONDITION = ['Bleeding badly', 'Hurt', 'Shaken', 'Steady'];

export function itemAction(state, id) {
  const it = ITEMS[id];
  if (!it) return null;
  if (it.relic) return state.equipped === id ? 'Put away' : 'Hold';
  if (it.doc) return 'Read';
  if (it.tape) return 'Play';
  return null;
}

// the journal map: rooms you have been in, joined where you have walked between them
export function mapLayout(state) {
  const boxes = [];
  for (const [id, r] of Object.entries(ROOMS)) {
    if (!state.visited.has(id) || !r.mapPos) continue;
    const [c, row] = r.mapPos;
    boxes.push({ id, x: 18 + c * 38, y: 28 + row * 28, w: 34, h: 16, under: !!r.under, name: r.name });
  }
  const at = Object.fromEntries(boxes.map(b => [b.id, b]));
  const links = [];
  // doorways, plus ladders and hatches that scripts climb
  const targets = id => [
    ...(ROOMS[id].exits || []).map(e => e.to),
    ...(ROOMS[id].props || []).flatMap(p => (p.script || []).filter(v => v.go).map(v => v.go.to)),
  ];
  const seen = new Set();
  for (const b of boxes) for (const to of targets(b.id)) {
    const o = at[to], key = [b.id, to].sort().join('|');
    if (o && o !== b && !seen.has(key)) { seen.add(key); links.push([b, o]); }
  }
  return { boxes, links };
}

// map labels, five letters at most
export const LABELS = {
  forest_path: 'Road', shrine: 'Shrn', station_hall: 'Stn', store_room: 'Store', woods: 'Woods',
  mill_row: 'Row', ruth_house: 'Ruth', oran_lane: 'Oran', chapel_nave: 'Chapl', cemetery: 'Yard',
  caretaker_house: 'Pike', caretaker_cellar: 'Cellr', passages: 'Below',
};

export class InventoryScene {
  constructor(app, play, tab = 0) {
    this.app = app;
    this.play = play;
    this.state = play.state;
    this.tab = tab;
    this.index = [0, 0];
    this.opaque = true;
    this.t = 0;
  }

  enter() { this.app.sfx('page'); }

  list() { return this.tab === 0 ? this.state.items : this.tab === 1 ? this.state.notes : []; }

  close() { this.app.sfx('ui_back'); this.app.pop(); }

  act() {
    const s = this.state, app = this.app;
    if (this.tab === 0) {
      const id = s.items[this.index[0]], it = ITEMS[id];
      if (!it) return;
      if (it.relic) { s.equipped = s.equipped === id ? null : id; app.sfx(s.equipped ? 'relic' : 'ui_back'); return; }
      if (it.doc) { this.play.readDoc(it.doc); app.push(new DocumentScene(app, it.doc)); return; }
      if (it.tape) { app.pop(); this.play.playTape(it.tape); return; }
    }
    if (this.tab === 1) {
      const id = s.notes[this.index[1]];
      if (id && id.startsWith('doc:')) app.push(new DocumentScene(app, id.slice(4)));
    }
  }

  update(input) {
    this.t++;
    if (input.pressed('cancel') || input.pressed('inventory') || (this.tab === 2 && input.pressed('map'))) { this.close(); return; }
    if (input.pressed('map')) { this.tab = 2; this.app.sfx('page'); return; }
    if (input.pressed('menuLeft')) { this.tab = (this.tab + 2) % 3; this.app.sfx('page'); return; }
    if (input.pressed('menuRight')) { this.tab = (this.tab + 1) % 3; this.app.sfx('page'); return; }
    const m = input.mouse;
    if (m.clicked && m.y < 22) {
      TABS.forEach((t, i) => { const x = 20 + i * 76; if (m.x >= x - 4 && m.x < x + 70) { this.tab = i; this.app.sfx('page'); } });
      return;
    }
    const list = this.list();
    if (!list.length) return;
    let i = this.index[this.tab] || 0;
    if (input.pressed('menuUp')) { i = (i + list.length - 1) % list.length; this.app.sfx('ui_move'); }
    if (input.pressed('menuDown')) { i = (i + 1) % list.length; this.app.sfx('ui_move'); }
    if (m.moved || m.clicked) {
      const off = Math.max(0, i - VISIBLE + 1);
      for (let k = 0; k < Math.min(VISIBLE, list.length); k++) {
        const y = LIST_Y + k * ROW;
        if (m.x >= LIST_X - 2 && m.x < 112 && m.y >= y - 2 && m.y < y + ROW - 2) {
          i = k + off;
          if (m.clicked) { this.index[this.tab] = i; this.act(); return; }
        }
      }
    }
    this.index[this.tab] = i;
    if (input.pressed('confirm') || input.pressed('interact')) this.act();
  }

  render(fb) {
    fb.clear(C.BLACK);
    panel(fb, 4, 4, W - 8, H - 8);
    TABS.forEach((t, i) => {
      const x = 20 + i * 76, on = i === this.tab;
      fb.text(t, x, 10, on ? C.BONE : C.ASH);
      if (on) fb.hline(x, x + textWidth(t), 19, C.BLOOD);
    });
    if (this.tab === 0) this.renderItems(fb);
    else if (this.tab === 1) this.renderNotes(fb);
    else this.renderMap(fb);
    fb.text(`◄ ► page   ${keyName(this.app.settings.bindings.inventory[0])}/Esc close`, 14, H - 16, C.INK);
  }

  renderList(fb, rows, sel) {
    const off = Math.max(0, sel - VISIBLE + 1);
    rows.slice(off, off + VISIBLE).forEach((r, k) => {
      const i = k + off, y = LIST_Y + k * ROW, on = i === sel;
      if (r.icon) fb.blit(ICONS[r.icon], LIST_X, y - 1);
      fb.text(r.label.length > 13 ? r.label.slice(0, 12) + '.' : r.label, LIST_X + (r.icon ? 11 : 0), y, on ? C.BONE : r.dim ? C.SLATE : C.STONE);
      if (on) fb.text('►', LIST_X - 8 + (r.icon ? 0 : 0), y, C.RED);
      if (r.mark) fb.text(r.mark, 107, y, C.CANDLE);
    });
    fb.vline(116, 26, H - 24, C.INK);
  }

  renderItems(fb) {
    const s = this.state, sel = this.index[0];
    this.renderList(fb, s.items.map(id => ({ label: ITEMS[id]?.name || id, icon: ITEMS[id]?.icon, mark: s.equipped === id ? '†' : '' })), sel);
    const id = s.items[sel], it = ITEMS[id];
    if (it) {
      const icon = ICONS[it.icon];
      if (icon) for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const c = icon.px[j * 8 + i];
        if (c !== 255) fb.rect(124 + i * 3, 30 + j * 3, 3, 3, c);
      }
      wrap(it.name, 15).forEach((r, k) => fb.text(r, 154, 32 + k * 10, C.PALE));
      wrap(it.desc, 20).slice(0, 8).forEach((r, k) => fb.text(r, 124, 62 + k * 10, C.STONE));
      const act = itemAction(s, id);
      if (act) fb.text(`${keyName(this.app.settings.bindings.interact[0])}  ${act}`, 124, 146, C.CANDLE);
    }
    // how Elias is holding up
    const hp = Math.max(0, Math.min(MAX_HP, s.hp));
    for (let i = 0; i < MAX_HP; i++) fb.rect(124 + i * 7, 160, 5, 5, i < hp ? C.BLOOD : C.INK);
    fb.text(CONDITION[hp], 150, 159, hp <= 1 ? C.RED : C.ASH);
  }

  renderNotes(fb) {
    const s = this.state, sel = this.index[1];
    if (!s.notes.length) { fb.text('Nothing yet.', LIST_X, LIST_Y, C.SLATE); return; }
    this.renderList(fb, s.notes.map(n => ({ label: noteTitle(n), icon: n.startsWith('doc:') ? 'i_page' : null })), sel);
    const id = s.notes[sel];
    if (!id) return;
    wrap(noteTitle(id), 20).forEach((r, k) => fb.text(r, 124, 30 + k * 10, C.PALE));
    if (id.startsWith('doc:')) {
      const doc = DOCS[id.slice(4)];
      const first = doc.pages[0].map(l => (typeof l === 'string' ? l : l.s)).filter(Boolean).slice(0, 5);
      first.forEach((r, k) => fb.text(r.slice(0, 20), 124, 54 + k * 10, C.ASH));
      fb.text(`${keyName(this.app.settings.bindings.interact[0])}  Read again`, 124, 146, C.CANDLE);
    } else {
      wrap(NOTES[id]?.text || '', 20).slice(0, 10).forEach((r, k) => fb.text(r, 124, 54 + k * 10, C.STONE));
    }
  }

  renderMap(fb) {
    const { boxes, links } = mapLayout(this.state);
    const cx = b => b.x + b.w / 2, cy = b => b.y + b.h / 2;
    for (const [a, b] of links) {
      const dashed = a.under || b.under;
      const x0 = cx(a), y0 = cy(a), x1 = cx(b), y1 = cy(b), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k <= n; k++) if (!dashed || k % 4 < 2) fb.pset(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), C.ASH);
    }
    for (const b of boxes) {
      const here = b.id === this.state.room;
      fb.rect(b.x, b.y, b.w, b.h, C.BLACK);
      if (b.under) { for (let i = 0; i < b.w; i += 2) { fb.pset(b.x + i, b.y, C.SLATE); fb.pset(b.x + i, b.y + b.h - 1, C.SLATE); } for (let j = 0; j < b.h; j += 2) { fb.pset(b.x, b.y + j, C.SLATE); fb.pset(b.x + b.w - 1, b.y + j, C.SLATE); } }
      else fb.frame(b.x, b.y, b.w, b.h, here ? C.PALE : C.ASH);
      const label = (LABELS[b.id] || b.name).slice(0, 5);
      fb.text(label, b.x + Math.round((b.w - textWidth(label)) / 2), b.y + 4, here ? C.BONE : C.STONE);
      if (here && Math.floor(this.t / 20) % 2) fb.rect(b.x + b.w - 4, b.y + 2, 2, 2, C.RED);
    }
    fb.text(ROOMS[this.state.room].name, 14, H - 28, C.PALE);
    const found = [...this.state.flags].filter(f => f.startsWith('found:')).length;
    fb.text(`Things noticed: ${found}`, W - 120, H - 28, C.SLATE);
  }
}
