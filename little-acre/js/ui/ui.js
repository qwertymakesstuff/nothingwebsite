// The interface layer: HUD, toasts, dialogue, confirm boxes, modals and the shops / menus that
// open from the game. The Game calls these methods; while any modal or dialogue is open the
// game is paused.

import { h, clear, icon, gold } from './dom.js';
import { iconURL, portraitURL } from '../render/sprites.js';
import { ITEMS_BY_ID, CATEGORY_NAMES } from '../data/items.js';
import { NPCS_BY_ID } from '../data/npcs.js';
import { MAPS } from '../data/maps.js';
import { PLAYER, CAN_CAPACITY } from '../config.js';
import { formatClock, weekday, seasonTitle } from '../calendar.js';
import { toolName } from '../economy.js';
import { questProgress, questDef } from '../quests.js';
import { openMenu } from './menu.js';
import { openShop, openChest, openBoard } from './shop.js';
import { openCrafting } from './craftView.js';
import { openFishing } from './fishingView.js';
import { openFestival, festivalBanner } from './festivalView.js';
import { dayEndView } from './dayEnd.js';

export class UI {
  constructor() {
    this.hud = document.getElementById('hud');
    this.overlay = document.getElementById('overlay');
    this.toastsEl = document.getElementById('toasts');
    this.stack = [];
    this.dialogueEl = null;
    this.sig = '';
    this.promptSig = '';
  }

  attach(game, renderer, audio) {
    this.game = game; this.renderer = renderer; this.audio = audio;
    this.buildHud();
  }

  // ------------------------------------------------------------------ modal stack
  get busy() { return this.stack.length > 0 || !!this.dialogueEl; }
  modal(content, { onClose = null, closable = true, cls = '' } = {}) {
    const back = h('div.modal-back');
    const box = h(`div.modal.panel${cls ? '.' + cls : ''}`);
    const entry = { back, box, onClose, closable, keys: null };
    const close = () => {
      const i = this.stack.indexOf(entry);
      if (i < 0) return;
      this.stack.splice(i, 1);
      back.remove();
      this.game.paused = this.busy;
      onClose?.();
      this.sig = '';
    };
    entry.close = close;
    if (closable) {
      box.append(h('button.btn.small.close', { on: { click: close }, title: 'Close (Esc)' }, '✕'));
      back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
    }
    box.append(content);
    back.append(box);
    this.overlay.append(back);
    this.stack.push(entry);
    this.game.paused = true;
    this.audio?.sfx('menu');
    return entry;
  }

  closeAll() { while (this.stack.length) this.stack[this.stack.length - 1].close(); }

  // Keyboard routing: returns true if the UI used the key.
  key(e) {
    if (this.dialogueEl) {
      if (['Space', 'Enter', 'KeyE', 'Escape'].includes(e.code)) { this.advanceDialogue(); return true; }
      return true;
    }
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    if (top.keys && top.keys(e)) return true;
    if (e.code === 'Escape' && top.closable) { top.close(); return true; }
    return true;
  }

  // ------------------------------------------------------------------ toasts
  toast(msg, kind = '') {
    if (!msg) return;
    const t = h(`div.toast${kind ? '.' + kind : ''}`, msg);
    this.toastsEl.append(t);
    while (this.toastsEl.children.length > 4) this.toastsEl.firstChild.remove();
    setTimeout(() => t.classList.add('out'), 2600 + msg.length * 25);
    setTimeout(() => t.remove(), 3100 + msg.length * 25);
  }

  saved() { /* autosave is silent; the options tab shows the last save time */ this.lastSaved = new Date(); }

  // ------------------------------------------------------------------ dialogue
  say(npcId, lines, mood = '', after = null) {
    if (!lines?.length) return;
    const def = npcId ? NPCS_BY_ID[npcId] : null;
    const textEl = h('div.text');
    const el = h('div.dialogue.panel', { on: { pointerdown: e => { e.stopPropagation(); this.advanceDialogue(); } } },
      def ? h('img.portrait.pix', { src: portraitURL(def.look), alt: '' }) : null,
      h('div', { style: { flex: '1', minWidth: '0' } },
        def ? h('div.name', def.name, mood ? h('span.hint', { loved: '♥♥ loved it', liked: '♥ liked it', neutral: '', disliked: 'didn\'t like it', hated: 'hated it' }[mood]) : null) : null,
        textEl),
      h('span.more', '▼'));
    const back = h('div.modal-back', { style: { background: 'transparent', alignItems: 'end' } }, el);
    this.overlay.append(back);
    this.dialogueEl = back;
    this.dlg = { lines: [...lines], i: 0, textEl, shown: 0, full: '', after, timer: null };
    this.game.paused = true;
    this.showLine();
  }

  showLine() {
    const d = this.dlg;
    d.full = d.lines[d.i];
    d.shown = 0;
    clearInterval(d.timer);
    d.timer = setInterval(() => {
      d.shown = Math.min(d.full.length, d.shown + 2);
      d.textEl.textContent = d.full.slice(0, d.shown);
      if (d.shown % 6 === 0) this.audio?.sfx('blip');
      if (d.shown >= d.full.length) clearInterval(d.timer);
    }, 22);
  }

  advanceDialogue() {
    const d = this.dlg;
    if (!d) return;
    if (d.shown < d.full.length) { d.shown = d.full.length; d.textEl.textContent = d.full; clearInterval(d.timer); return; }
    d.i++;
    if (d.i < d.lines.length) { this.showLine(); return; }
    clearInterval(d.timer);
    this.dialogueEl.remove();
    this.dialogueEl = null;
    this.dlg = null;
    this.game.paused = this.busy;
    d.after?.();
  }

  // ------------------------------------------------------------------ confirm / choice
  confirm(text, yes, no = null) {
    this.choice(text, [{ label: 'Yes', cls: 'green', run: yes, key: 'KeyY' }, { label: 'No', run: no, key: 'KeyN' }]);
  }

  choice(text, options, { title = null } = {}) {
    let entry;
    const pick = o => { entry.close(); o.run?.(); };
    const content = h('div.col', { style: { minWidth: 'min(380px, 80vw)', alignItems: 'center', textAlign: 'center' } },
      title ? h('h2', title) : null,
      h('p', { style: { margin: '6px 0 10px', fontSize: '22px', maxWidth: '520px' } }, text),
      h('div.row.wrap', { style: { justifyContent: 'center' } }, options.map((o, i) => h(`button.btn${o.cls ? '.' + o.cls : ''}`, { on: { click: () => pick(o) }, disabled: !!o.disabled, title: o.title || '' }, o.label + (i < 2 && o.key ? ` (${o.key.slice(3)})` : '')))));
    entry = this.modal(content, { closable: true });
    entry.keys = e => {
      const o = options.find(o => o.key === e.code) || (e.code === 'Enter' ? options[0] : null);
      if (o && !o.disabled) { pick(o); return true; }
      if (e.code === 'Escape') { entry.close(); options.find(o => o.key === 'KeyN')?.run?.(); return true; }
      return false;
    };
  }

  // ------------------------------------------------------------------ game-triggered views
  dayEnd(summary, cont) { dayEndView(this, summary, cont); }
  festival(f) { festivalBanner(this, f); }
  openFestival(f) { openFestival(this, f); }
  openShop(id) { openShop(this, id); }
  openChest(obj) { openChest(this, obj); }
  openBoard() { openBoard(this); }
  openCrafting(station = null) { openCrafting(this, station); }
  openFishing(mini, done) { openFishing(this, mini, done); }
  openMenu(tab = 'inventory') { openMenu(this, tab); }
  mapChanged(mapId) { if (this.renderer) this.renderer.fade = 0.9; this.audio?.setTrack(MAPS[mapId].music); this.sig = ''; }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    const g = this.game;
    clear(this.hud).hidden = false;
    this.el = {
      date: h('div.date'), time: h('span'), weather: h('canvas.weather.pix', { width: 10, height: 10 }), money: h('b'),
      energy: h('div.fill'), water: h('div.fill'), energyM: null, waterM: null,
      hotbar: h('div.hotbar.panel'), prompt: h('div.prompt', { hidden: true }), held: h('div.held-name'), tracker: h('div.tracker.panel', { hidden: true }),
    };
    const clock = h('div.clock.panel', this.el.date, h('div.time', this.el.weather, this.el.time), h('div.money', this.el.money));
    clock.addEventListener('click', () => this.openMenu('calendar'));
    this.el.energyM = h('div.meter.energy.panel', { title: 'Energy' }, h('span.lbl', 'E'), this.el.energy);
    this.el.waterM = h('div.meter.water.panel', { title: 'Watering can' }, h('span.lbl', '💧'), this.el.water);
    const buttons = h('div.hud-buttons',
      h('button.btn', { on: { click: () => this.openMenu('inventory') }, title: 'Inventory (I / Tab)' }, 'Bag'),
      h('button.btn', { on: { click: () => this.openMenu('quests') }, title: 'Quests (J)' }, 'Quests'),
      h('button.btn', { on: { click: () => this.openMenu('map') }, title: 'Map (M)' }, 'Map'),
      h('button.btn', { on: { click: () => { g.state.settings.music = !g.state.settings.music; this.audio?.applySettings(g.state.settings); this.sig = ''; } }, title: 'Music on/off' }, '♪'));
    this.el.musicBtn = buttons.lastChild;
    this.el.tracker.addEventListener('click', () => this.openMenu('quests'));
    this.hud.append(clock, buttons, this.el.tracker, h('div.meters', this.el.waterM, this.el.energyM), this.el.held, this.el.prompt, this.el.hotbar);
  }

  updateHud() {
    const g = this.game, s = g.state, p = s.player;
    this.el.date.textContent = `${weekday(s.date)} ${s.date.day}, ${seasonTitle(s.date.season)}`;
    this.el.time.textContent = formatClock(s.date.minutes);
    this.el.money.textContent = gold(p.money);
    this.drawWeatherIcon(s.weather.today);
    const ef = p.energy / p.maxEnergy;
    this.el.energy.style.height = `${Math.max(2, ef * 100)}%`;
    this.el.energyM.classList.toggle('low', ef < 0.15);
    this.el.energyM.title = `Energy ${Math.ceil(p.energy)}/${p.maxEnergy}`;
    const cap = CAN_CAPACITY[s.tools.can];
    this.el.water.style.height = `${Math.max(2, (p.water / cap) * 100)}%`;
    this.el.waterM.title = `Water ${p.water}/${cap}`;
    this.el.musicBtn.style.opacity = s.settings.music ? 1 : 0.5;
    const sig = JSON.stringify([s.inventory.slice(0, PLAYER.hotbar), p.slot, s.tools, Object.keys(s.quests.active), s.quests.done.length, this.trackerTick]);
    if (sig !== this.sig) { this.sig = sig; this.renderHotbar(); this.renderTracker(); }
  }

  drawWeatherIcon(w) {
    if (this.lastWeather === w) return;
    this.lastWeather = w;
    const c = this.el.weather.getContext('2d');
    c.clearRect(0, 0, 10, 10);
    const r = (x, y, ww, hh, col) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
    if (w === 'sun') { r(3, 3, 4, 4, '#f5c33a'); r(4, 1, 2, 1, '#f5c33a'); r(4, 8, 2, 1, '#f5c33a'); r(1, 4, 1, 2, '#f5c33a'); r(8, 4, 1, 2, '#f5c33a'); }
    else { r(1, 2, 8, 4, '#a8b4c4'); r(3, 1, 4, 1, '#a8b4c4'); if (w === 'rain') { r(2, 7, 1, 2, '#3a7ad0'); r(5, 7, 1, 2, '#3a7ad0'); r(8, 7, 1, 2, '#3a7ad0'); } else { r(2, 7, 1, 1, '#fff'); r(5, 8, 1, 1, '#fff'); r(8, 7, 1, 1, '#fff'); } }
    this.el.weather.title = { sun: 'Sunny', rain: 'Rain', snow: 'Snow' }[w];
  }

  slotEl(s, i, { selected = false, key = null, onClick = null, picked = false, locked = false } = {}) {
    const it = s && ITEMS_BY_ID[s.id];
    const lvl = it?.tool ? this.game.state.tools[s.id] : 0;
    const el = h(`button.slot${selected ? '.sel' : ''}${picked ? '.picked' : ''}${locked ? '.locked' : ''}`, {
      title: it ? `${it.tool ? toolName(this.game.state, s.id) : it.name}${s.n > 1 ? ` ×${s.n}` : ''}` : '',
      on: onClick ? { click: e => onClick(i, e), contextmenu: e => { e.preventDefault(); onClick(i, e, true); } } : {},
    },
    key ? h('span.k', key) : null,
    it ? icon(iconURL(s.id)) : null,
    it && s.n > 1 ? h('span.n', s.n) : null,
    lvl ? h(`span.lv.l${lvl}`) : null);
    return el;
  }

  renderHotbar() {
    const s = this.game.state;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
    clear(this.el.hotbar).append(...s.inventory.slice(0, PLAYER.hotbar).map((it, i) => this.slotEl(it, i, { selected: i === s.player.slot, key: keys[i], onClick: j => { this.game.selectSlot(j); this.sig = ''; } })));
    const name = this.game.heldName();
    this.el.held.textContent = name;
  }

  renderTracker() {
    const s = this.game.state;
    const ids = Object.keys(s.quests.active);
    if (!ids.length) { this.el.tracker.hidden = true; return; }
    // show the first story quest that has progress to show
    const id = ids[0];
    const q = questDef(id), pr = questProgress(s, id);
    this.el.tracker.hidden = false;
    clear(this.el.tracker).append(h('div', h('b', q.title), h('span', q.text.length > 90 ? q.text.slice(0, 88) + '…' : q.text), pr ? h('div.bar', h('i', { style: { width: `${Math.min(100, (pr.have / pr.need) * 100)}%` } })) : null));
  }

  setPrompt(use, act, touch) {
    const sig = `${use}|${act}`;
    if (sig === this.promptSig) return;
    this.promptSig = sig;
    if (!use && !act) { this.el.prompt.hidden = true; return; }
    this.el.prompt.hidden = false;
    clear(this.el.prompt).append(...[
      use ? h('span', h('kbd', touch ? 'Use' : 'Space'), use) : null,
      act ? h('span', h('kbd', touch ? 'Act' : 'E'), act) : null].filter(Boolean));
  }

  // item info used by the inventory and shop views
  itemInfo(id) {
    const it = ITEMS_BY_ID[id];
    return { name: it.tool ? toolName(this.game.state, id) : it.name, cat: CATEGORY_NAMES[it.cat] || it.cat, desc: it.desc || '', price: it.price, energy: it.energy };
  }
}
