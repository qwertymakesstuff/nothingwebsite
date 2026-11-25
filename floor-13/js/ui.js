// Rendering + input for FLOOR 13. Screens: title, elevator (the hub), floor. Modals for
// encounters, locks/puzzles, the journal, bag, settings, night summaries and endings.
import { Game, fmtClock, BUTTONS, FLOORS, FLOOR_BY_ID, NORMAL_FLOORS, ITEMS, LOST, BLUEPRINTS, CLUES, NPCS, ACHIEVEMENTS, UPGRADES, ENDINGS } from './engine.js';
import { SUPPLY, EQUIPMENT } from './data/items.js';
import { ENC_BY_ID } from './data/encounters.js';
import { CAT_NAMES } from './data/floors.js';
import { RARITY } from './data/achievements.js';
import { CLUES_FOR_13 } from './data/clues.js';
import { makePuzzle, fusePress, fuseHint, chimeInput, valveTotal, valvesSolved, PUZZLE_NAMES } from './puzzles.js';
import { makeRng, randomSeed } from './rng.js';
import * as audio from './audio.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const wait = ms => new Promise(r => setTimeout(r, ms));
const DEFAULT_PAL = ['#0f0e0c', '#e6dcc6', '#d9b56a', '#fff3d6'];
const PANEL_ORDER = ['10', '11', '12', '7', '8', '9', '4', '5', '6', '1', '2', '3'];
const KEY_TO_BUTTON = { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '0': '10', '-': '11', '=': '12' };

export class UI {
  constructor(game) {
    this.g = game;
    this.screen = 'title';
    this.tab = 'panel';
    this.jtab = 'clues';
    this.busy = false;
    this.feed = [];
    this.hint = '';
    this.modalKind = null;
    this.audioReady = false;
    this.indicator = game.R?.display || 'L';
    game.on('ach', a => this.toastAch(a));
    game.on('toast', t => this.toast(t.title, t.text, t.kind));
    game.on('sfx', n => audio.sfx(n));
    game.on('nightEnd', s => { this.pendingSummary = s; });
    document.addEventListener('click', e => this.onClick(e));
    document.addEventListener('keydown', e => this.onKey(e));
    document.addEventListener('pointerdown', () => this.wakeAudio(), { once: false });
    this.applySettings();
    this.render();
    this.scheduleFlicker();
  }

  get S() { return this.g.S; }

  wakeAudio() {
    if (this.audioReady) { audio.resumeAudio(); return; }
    this.audioReady = true;
    audio.initAudio(this.S.settings);
    audio.setMood(this.g.floor() ? FLOOR_BY_ID[this.g.floor().type].pattern : 'lift');
  }
  applySettings() {
    const st = this.S.settings;
    document.body.classList.toggle('no-grain', !st.grain);
    document.body.classList.toggle('no-motion', !st.motion);
    audio.applySettings(st);
  }
  speed(ms) { return this.S.settings.motion ? ms : Math.min(ms, 60); }
  scheduleFlicker() {
    setTimeout(() => {
      if (!document.hidden && this.S.settings.motion) { document.body.classList.add('flicker'); audio.sfx('flicker'); setTimeout(() => document.body.classList.remove('flicker'), 1200); }
      this.scheduleFlicker();
    }, 25000 + Math.random() * 45000);
  }

  setPalette(pal, pattern = 'lift') {
    const [bg, fg, acc, light] = pal || DEFAULT_PAL;
    const r = document.documentElement.style;
    r.setProperty('--bg', bg); r.setProperty('--fg', fg); r.setProperty('--acc', acc); r.setProperty('--light', light);
    document.body.className = document.body.className.replace(/\bmood-\S+/g, '').trim() + ' mood-' + pattern;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
    if (this.audioReady) audio.setMood(pattern);
  }

  // ───────────────────────── render ─────────────────────────
  render() {
    const g = this.g;
    if (this.screen !== 'title') this.screen = g.R && g.R.cur ? 'floor' : 'elevator';
    if (this.screen === 'floor') { const d = g.floorDef(); this.setPalette(d.pal, d.pattern); } else this.setPalette(DEFAULT_PAL, 'lift');
    $('#hud').innerHTML = this.hud();
    const v = $('#view');
    v.innerHTML = this.screen === 'title' ? this.title() : this.screen === 'floor' ? this.floorView() : this.elevatorView();
    const log = v.querySelector('.cabin-log, .feed'); if (log) log.scrollTop = log.scrollHeight;
  }

  hud() {
    const g = this.g, R = g.R, S = this.S;
    const pct = R ? Math.round(100 * R.comp / g.maxComp()) : 100;
    const late = R && g.endTime() - R.clock <= 60;
    return `<a class="brand" href="/play/public/" title="Back to the arcade"><b>FLOOR 13</b><small>← arcade</small></a>
      <div class="hud-mid">${R ? `<span class="clock${late ? ' late' : ''}" title="Night ends at ${fmtClock(g.endTime())}">${fmtClock(R.clock)}</span>
        <div><div class="bar-label">composure ${R.comp}/${g.maxComp()}</div><div class="bar${pct < 30 ? ' low' : ''}" role="meter" aria-valuenow="${R.comp}" aria-valuemin="0" aria-valuemax="${g.maxComp()}" aria-label="Composure"><i style="width:${pct}%"></i></div></div>` : `<span class="muted small">${S.night ? `${S.night} night${S.night > 1 ? 's' : ''} so far` : 'the lift is waiting'}</span>`}</div>
      <div class="hud-right"><div class="money">${R ? `<span title="Pocket cash (banked at the end of the night)">pocket <b>$${R.pocket}</b></span>` : ''}<span title="Banked cash, for upgrades">bank <b>$${S.bank}</b></span><span class="tok" title="Brass tokens">tokens <b>${S.tokens}</b></span></div>
        <button class="icon-btn" data-act="bag" aria-label="Bag">Bag<kbd>B</kbd></button>
        <button class="icon-btn" data-act="journal" aria-label="Journal">Journal<kbd>J</kbd></button>
        <button class="icon-btn" data-act="help" aria-label="How to play">?</button>
        <button class="icon-btn" data-act="settings" aria-label="Settings">⚙</button>
        <button class="icon-btn" data-act="mute" aria-label="${S.settings.sound ? 'Mute sound' : 'Unmute sound'}">${S.settings.sound ? '♪' : '×'}<kbd>M</kbd></button></div>`;
  }

  title() {
    const S = this.S, n = Object.keys(S.achievements).length;
    const fresh = !S.night;
    return `<section class="title-screen"><div>
      <p class="eyebrow">the varga building · after hours</p>
      <h1>FLOOR 13</h1>
      <p class="tag">There are twelve buttons. There are not twelve floors.</p>
      <p class="intro">You stayed late. The lift doors closed behind you, and now the building won't let you leave until morning. Every ride goes somewhere a little different. Explore its floors, meet the people who live in its nights, open what's locked, keep what's lost — and find out what the thirteenth floor is.</p>
      <div class="title-actions">
        <button class="btn big" data-act="enter">${S.run ? `Continue night ${S.night}` : fresh ? 'Step into the lift' : `Return to the lift`}</button>
        ${fresh ? '' : '<button class="btn big ghost" data-act="journal">Journal</button>'}
        <button class="btn big ghost" data-act="help">How to play</button>
      </div>
      <p class="title-foot">${n}/${ACHIEVEMENTS.length} achievements · ${Object.keys(S.endings).length}/4 endings · progress saves automatically on this device</p>
    </div></section>`;
  }

  // ───────── elevator ─────────
  elevatorView() {
    const g = this.g, R = g.R;
    const log = R ? R.log.slice(-6) : (this.S.lastRun ? [`Last night ended at ${this.S.lastRun.clock}.`] : ['The car is dark and quiet. A brass plate reads CASTELLAN LIFT CO.']);
    return `<section class="elevator">
      <div class="cabin">
        <div class="indicator" aria-live="polite"><span class="arr" id="arrUp">▲</span><span class="num" id="indNum">${esc(this.indicator)}</span><span class="arr" id="arrDn">▼</span></div>
        <div class="shaft" id="shaft"><div class="beyond" id="beyond"></div><div class="door l"></div><div class="door r"></div></div>
        <div class="cabin-log">${log.map(l => `<p>${esc(l)}</p>`).join('')}</div>
      </div>
      <div class="panel">
        <div class="tabs" role="tablist">${[['panel', 'Panel'], ['service', 'Service'], ['supply', 'Supplies']].map(([k, l]) => `<button class="tab${this.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}" role="tab" aria-selected="${this.tab === k}">${l}</button>`).join('')}</div>
        ${this.tab === 'service' ? this.serviceTab() : this.tab === 'supply' ? this.supplyTab() : this.panelTab()}
      </div></section>`;
  }

  panelTab() {
    const g = this.g, R = g.R, S = this.S;
    if (!R) {
      const L = S.lastRun;
      const first = !S.night;
      return `${L ? this.summaryHTML(L) : ''}
        ${first ? `<div class="card small" style="margin:10px 0"><p><b>How it works:</b> each night runs from 9 PM until dawn. Press a floor button to ride, explore rooms, search things and deal with whoever you meet. Cash you find is banked at dawn and spent on upgrades in the <b>Service</b> tab. If your composure hits zero, you black out and lose half your pocket.</p><p class="muted" style="margin:0">Keyboard: number keys press buttons, R = random, arrows move between rooms, J = journal.</p></div>` : ''}
        <div class="plate" style="margin-top:12px"><div class="engr">CASTELLAN · NIGHT SERVICE</div>
        <p style="color:#3c2b10;text-align:center;margin:4px 0 12px;font-size:13px">The car is dark. The lever is cold.</p>
        <div class="rand-row" style="margin:0"><button class="btn big" data-act="begin" style="color:#2a1c06;background:rgba(255,240,200,.35);border-color:#5d4520">Pull the lever · Begin night ${S.night + 1} <span class="k">Enter</span></button></div></div>`;
    }
    const wired = g.wiredButtons();
    const btn = key => {
      const ok = wired.includes(key);
      const label = g.buttonLabel(key);
      const hum = R.hum.includes(key) && !R.floors['n' + key];
      return `<button class="fbtn${ok ? '' : ' dead'}${hum ? ' hum' : ''}" data-act="press" data-key="${key}" aria-label="Floor ${key}${label ? ': ' + esc(label) : ''}${ok ? '' : ' (not wired)'}" title="${ok ? (label ? esc(label) : 'Floor ' + key) : 'Not wired up yet — buy Floor Buttons in Service'}">${key}${label ? `<small>${esc(label)}</small>` : ''}</button>`;
    };
    const anyLabels = PANEL_ORDER.some(k => g.buttonLabel(k));
    const secrets = g.secretButtons();
    return `<div class="plate"><div class="engr">CASTELLAN</div>
      <div class="btn-grid${anyLabels ? ' labels' : ''}">${PANEL_ORDER.map(btn).join('')}</div>
      ${secrets.length ? `<div class="secret-row">${secrets.map(b => `<button class="fbtn ${b.key === '13' ? 'thirteen' : 'secret'}${b.ok ? '' : ' dead'}" data-act="press" data-key="${esc(b.key)}" aria-label="Button ${esc(b.key)}" title="${esc(b.ok ? FLOOR_BY_ID[b.floor].name : b.why)}">${esc(b.key)}</button>`).join('')}</div>` : ''}
      <div class="rand-row"><button class="fbtn rand" data-act="press" data-key="R" title="Let the lift decide. Strange floors are more likely.">RANDOM</button></div></div>
      <p class="hint" aria-live="polite">${esc(this.hint || `Each ride takes ${g.rideTime()} min. The night ends at ${fmtClock(g.endTime())}.`)}</p>
      <div class="panel-actions">
        ${g.up('bell') ? `<button class="btn" data-act="bell" ${R.bellUsed ? 'disabled' : ''}>Ring the call bell${R.bellUsed ? ' (used tonight)' : ''}</button>` : ''}
        <button class="btn ghost" data-act="clockout">Clock out early — bank $${R.pocket} and end the night</button>
      </div>`;
  }

  serviceTab() {
    const g = this.g, S = this.S;
    const item = u => {
      const lv = g.up(u.id), c = g.upgradeCost(u.id);
      const can = c && S.bank >= c.cash && S.tokens >= c.tokens;
      return `<div class="shop-item"><h4>${esc(u.name)}<span class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span></h4>
        <p>${esc(u.desc[Math.min(lv, u.max - 1)])}${lv >= u.max ? ' <b>(installed)</b>' : ''}</p>
        <div class="buy">${c ? `<button class="btn" data-act="buy-up" data-id="${u.id}" ${can ? '' : 'disabled'}>$${c.cash}${c.tokens ? ` + ${c.tokens}◉` : ''}</button>` : '<span class="muted small">max</span>'}</div></div>`;
    };
    return `<div class="bankline"><span>Bank <b>$${S.bank}</b></span><span>Tokens <b>${S.tokens}◉</b></span></div>
      <div class="shop"><p class="eyebrow">the lift</p>${UPGRADES.filter(u => u.kind === 'elevator').map(item).join('')}
      <p class="eyebrow" style="margin-top:8px">you</p>${UPGRADES.filter(u => u.kind === 'personal').map(item).join('')}</div>`;
  }

  supplyTab() {
    const g = this.g, S = this.S;
    return `<div class="bankline"><span>Bank <b>$${S.bank}</b></span><span class="muted">bought with banked cash</span></div>
      <div class="shop">${SUPPLY.map(id => {
        const it = ITEMS[id], owned = it.kind === 'equip' && g.has(id), p = g.supplyPrice(id);
        return `<div class="shop-item"><h4>${esc(it.name)}${it.kind === 'use' ? ` <span class="muted small">×${g.count(id)}</span>` : ''}</h4><p>${esc(it.desc)}</p>
          <div class="buy">${owned ? '<span class="muted small">owned</span>' : `<button class="btn" data-act="buy-sup" data-id="${id}" ${S.bank >= p ? '' : 'disabled'}>$${p}</button>`}</div></div>`;
      }).join('')}</div>`;
  }

  summaryHTML(L) {
    const title = { dawn: 'Morning', blackout: 'You blacked out', clockout: 'Clocked out', ending: 'The end of the night' }[L.reason] || 'Night over';
    const line = { dawn: 'The lights brighten to daylight. The lift sinks gently to the lobby, and the doors open on an ordinary morning.', blackout: 'Everything went soft and grey. You wake on the lobby floor with a coat over you that isn\'t yours.', clockout: 'You ride down to the lobby and sit on the bench until morning.', ending: 'You did it. The building will remember.' }[L.reason];
    return `<div class="card summary"><p class="eyebrow">night ${L.night} · ended ${esc(L.clock)}</p><h3>${title}</h3><p class="small">${line}</p>
      <p class="small">Floors visited <b>${L.floors}</b> · rooms explored <b>${L.rooms}</b> · banked <b>$${L.banked}</b>${L.lostCash ? ` <span style="color:var(--bad)">(dropped $${L.lostCash})</span>` : ''}</p>
      ${L.found.length ? `<p class="small" style="margin:0">Found:</p><ul>${L.found.slice(0, 12).map(f => `<li>${esc(f)}</li>`).join('')}${L.found.length > 12 ? `<li>…and ${L.found.length - 12} more</li>` : ''}</ul>` : ''}
      ${L.clues.length ? `<p class="small" style="margin:6px 0 0">New journal entries:</p><ul>${L.clues.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div>`;
  }

  // ───────── floor ─────────
  floorView() {
    const g = this.g, R = g.R, f = g.floor(), d = g.floorDef(), room = g.room();
    const cat = CAT_NAMES[d.cat] || d.cat;
    const task = f.task ? `<div class="task${f.task.done ? ' done' : ''}"><span class="eyebrow" style="margin:0">floor task</span><br>${esc(f.task.text)} ${f.task.done ? '✓' : `<span class="muted">(reward $${f.task.reward.cash}${f.task.reward.token ? ' + token' : ''})</span>`}</div>` : '';
    return `<div class="pat pat-${d.pattern}"></div>
      <header class="floor-head"><div><span class="plaque">FLOOR ${esc(R.display)}</span><h2>${esc(f.name)}</h2>
        <p class="sub">${esc(d.name)} · ${esc(cat)}${f.visits > 1 ? ` · visit ${f.visits}` : ''}${f.dark ? (f.lit || g.has('flashlight') ? ' · dark (you have light)' : ' · <b style="color:var(--bad)">dark</b>') : ''}</p></div>${task}</header>
      <div class="floor-body">
        <div class="map-wrap">${this.mapSVG(f, room)}<div class="map-legend"><span>◉ you</span><span>! someone/something</span><span>▣ locked</span><span>? unexplored</span>${g.up('notebook') ? '<span>• unsearched ✦ worth a look</span>' : ''}</div></div>
        <div class="card room-card">${this.roomCard(f, room)}</div>
      </div>
      <div class="feed" aria-live="polite">${this.feed.slice(-10).map(m => `<p class="${m.cls || ''}">${esc(m.text)}</p>`).join('')}</div>`;
  }

  mapSVG(f, here) {
    const g = this.g;
    const CW = 150, CH = 92, RW = 128, RH = 58;
    const vis = r => r.seen || f.revealed;
    const cx = r => r.x * CW + CW / 2, cy = r => r.y * CH + CH / 2;
    let edges = '', nodes = '';
    const done = new Set();
    for (const r of f.rooms) for (const a of r.adj) {
      const o = f.rooms[a]; const k = [r.id, a].sort().join('-');
      if (done.has(k) || !vis(r) || !vis(o)) continue; done.add(k);
      edges += `<line class="edge${r.visited && o.visited ? '' : ' faint'}" x1="${cx(r)}" y1="${cy(r)}" x2="${cx(o)}" y2="${cy(o)}"/>`;
    }
    for (const r of f.rooms) {
      if (!vis(r)) continue;
      const known = r.visited || f.revealed;
      const cls = ['room-node', r.visited ? 'visited' : '', r.id === here.id ? 'here' : '', here.adj.includes(r.id) ? 'reach' : '', known ? '' : 'unknown'].join(' ');
      const name = known ? r.name : '?';
      const short = name.length > 16 ? name.slice(0, 15) + '…' : name;
      const x = cx(r) - RW / 2, y = cy(r) - RH / 2;
      let badges = '';
      if (r.id === here.id) badges += `<text class="badge" x="${x + 8}" y="${y + 17}">◉</text>`;
      if (r.enc && !r.enc.done && known) badges += `<text class="badge" x="${x + RW - 14}" y="${y + 17}">!</text>`;
      if (r.lock) badges += `<text class="badge" x="${x + RW - 16}" y="${y + RH - 8}">▣</text>`;
      if (g.up('notebook') && known) {
        const uns = r.objs.some(o => !o.done);
        const special = r.objs.some(o => !o.done && o.loot.special);
        if (special) badges += `<text class="badge" x="${x + 8}" y="${y + RH - 8}">✦</text>`;
        else if (uns) badges += `<text class="badge" x="${x + 8}" y="${y + RH - 8}">•</text>`;
      }
      nodes += `<g class="${cls}" data-act="goto" data-room="${r.id}" tabindex="-1" role="button" aria-label="${esc(name)}${r.id === here.id ? ' (you are here)' : ''}"><title>${esc(name)}</title><rect x="${x}" y="${y}" width="${RW}" height="${RH}" rx="8"/><text x="${cx(r)}" y="${cy(r) + 4}" text-anchor="middle">${esc(short)}</text>${badges}</g>`;
    }
    return `<svg viewBox="0 0 ${f.w * CW} ${f.h * CH}" role="img" aria-label="Floor map">${edges}${nodes}</svg>`;
  }

  roomCard(f, room) {
    const g = this.g;
    const dirName = o => { const dx = o.x - room.x, dy = o.y - room.y; return dx > 0 ? '→' : dx < 0 ? '←' : dy > 0 ? '↓' : '↑'; };
    const dark = f.dark && !f.lit && !g.has('flashlight');
    let h = `<div><h3>${esc(room.name)}</h3></div><p class="desc">${esc(room.desc)}</p>`;
    if (this.ambient) h += `<p class="ambient">${esc(this.ambient)}</p>`;
    if (f.blocked) h += `<div class="blocked">The doors off this lobby are sealed. You need: <b>${esc(ITEMS[FLOOR_BY_ID[f.type].req].name)}</b>.</div>`;
    if (dark) h += `<div class="blocked">It's dark. Searching is unreliable and moving around wears on your nerves.${g.has('flare') ? ' <button class="btn" data-act="use" data-id="flare">Light a flare</button>' : ''}</div>`;
    if (room.enc && !room.enc.done) {
      h += `<div class="enc-card"><span><b>${esc(encName(room.enc.id))}</b><br><span class="small muted">${room.enc.met ? 'Still here.' : 'Something here wants your attention.'}</span></span><button class="btn" data-act="enc">Approach <span class="k">E</span></button></div>`;
    }
    if (room.objs.length) {
      h += `<div><p class="section-label">search</p><div class="obj-list">${room.objs.map((o, i) => `<button class="btn obj-btn${o.done ? ' done' : ''}" data-act="search" data-i="${i}" ${o.done ? 'disabled' : ''}><span>${i < 9 ? `<span class="k">${i + 1}</span> ` : ''}${o.done ? 'Searched' : 'Search'} the ${esc(o.n)}</span><span class="res">${o.done ? '' : o.hint ? 'needs ' + esc(o.hint) : '4 min'}</span></button>`).join('')}</div></div>`;
    }
    h += `<div><p class="section-label">ways on</p><div class="exit-list">${room.adj.map(a => {
      const o = f.rooms[a]; const known = o.visited || f.revealed;
      return `<button class="btn obj-btn" data-act="move" data-room="${a}"><span><span class="k">${dirName(o)}</span> ${esc(known ? o.name : 'Unexplored room')}</span><span class="res">${o.lock ? 'locked' : g.moveTime() + ' min'}</span></button>`;
    }).join('')}</div></div>`;
    const steps = room.id === 0 ? 0 : (g.pathTo(0) || []).length;
    h += `<button class="btn" data-act="lift"><span class="k">L</span> ${room.id === 0 ? 'Step back into the lift' : `Walk back to the lift (${steps * g.moveTime()} min)`}</button>`;
    if (f.notes.length) h += `<div class="notes">Your notes: ${f.notes.map(n => `<b>${esc(n)}</b>`).join(' · ')}</div>`;
    return h;
  }

  // ───────────────────────── input ─────────────────────────
  onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return;
    this.wakeAudio();
    const act = el.dataset.act, d = el.dataset;
    if (el.disabled) return;
    const fn = {
      enter: () => { this.screen = 'game'; audio.sfx('ding'); this.render(); },
      begin: () => this.beginNight(),
      tab: () => { this.tab = d.tab; audio.sfx('click'); this.render(); },
      press: () => this.press(d.key),
      bell: () => this.ringBell(),
      clockout: () => this.confirm('Clock out early?', `You'll bank your $${this.g.R.pocket} and the night ends now.`, () => { this.g.clockOut(); this.afterAction(); }),
      'buy-up': () => { const r = this.g.buyUpgrade(d.id); audio.sfx(r.ok ? 'cash' : 'error'); this.hint = r.text; this.render(); },
      'buy-sup': () => { const r = this.g.buySupply(d.id); audio.sfx(r.ok ? 'cash' : 'error'); this.hint = r.text; this.render(); },
      goto: () => this.goto(+d.room),
      move: () => this.goto(+d.room),
      search: () => this.search(+d.i),
      enc: () => this.openEnc(),
      lift: () => this.toLift(),
      journal: () => this.openJournal(d.tab),
      jtab: () => { this.jtab = d.tab; this.openJournal(); },
      bag: () => this.openBag(),
      use: () => this.useItem(d.id),
      settings: () => this.openSettings(),
      help: () => this.openHelp(),
      mute: () => { this.S.settings.sound = !this.S.settings.sound; this.g.save(); this.applySettings(); this.render(); if (this.modalKind === 'settings') this.openSettings(); },
      toggle: () => { this.S.settings[d.key] = !this.S.settings[d.key]; this.g.save(); this.applySettings(); this.openSettings(); this.render(); },
      reset: () => this.confirm('Erase everything?', 'This permanently deletes your save: upgrades, items, journal, achievements and endings. There is no undo.', () => this.confirm('Really erase it all?', 'Last chance. The building will forget you.', () => { this.g.reset(); this.feed = []; this.indicator = 'L'; this.screen = 'title'; this.closeModal(); this.render(); this.toast('Save erased', 'A fresh start.', 'task'); }, 'Erase my save'), 'Yes, erase'),
      close: () => this.closeModal(),
      choice: () => this.choose(+d.i),
      'enc-again': () => this.showEnc(this.g.reopenEncounter()),
      unlock: () => this.unlock(+d.room, d.how),
      'pz-start': () => this.startLockPuzzle(+d.room),
      'pz-quit': () => this.quitPuzzle(),
      kp: () => this.kpInput(d.d),
      fuse: () => this.fuseClick(+d.i),
      'fuse-hint': () => { this.pz.p.hinted = fuseHint(this.pz.p); this.renderPuzzle(); },
      'chime-play': () => this.playChime(),
      ring: () => this.chimeClick(+d.i),
      valve: () => { const p = this.pz.p; p.set[+d.i] = Math.max(0, Math.min(5, p.set[+d.i] + +d.d)); audio.sfx('click'); this.renderPuzzle(); },
      'valve-go': () => this.valveGo(),
      ciph: () => this.cipherPick(d.w),
      'ending-next': () => this.endingNext(),
      'summary-ok': () => { this.closeModal(); this.render(); },
      'confirm-yes': () => { const f = this.confirmFn; this.closeModal(); f && f(); },
    }[act];
    if (fn) { e.preventDefault(); fn(); }
  }

  onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key, lower = k.toLowerCase();
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && k !== 'Escape') return;
    this.wakeAudio();
    if (this.modalKind) {
      if (k === 'Escape') { if (this.modalKind !== 'summary' && this.modalKind !== 'ending') { e.preventDefault(); this.modalKind === 'puzzle' ? this.quitPuzzle() : this.closeModal(); } return; }
      if (this.modalKind === 'puzzle' && this.pz) {
        const t = this.pz.p.type;
        if (t === 'keypad' && /^[0-9]$/.test(k)) return this.kpInput(k);
        if (t === 'keypad' && k === 'Enter') { e.preventDefault(); return this.kpInput('ent'); }
        if (t === 'keypad' && k === 'Backspace') return this.kpInput('clr');
        if (t === 'chime' && /^[1-4]$/.test(k)) return this.chimeClick(+k - 1);
        if (t === 'fuses' && /^[1-9]$/.test(k) && this.pz.p.n === 3) return this.fuseClick(+k - 1);
        if (t === 'cipher' && /^[1-4]$/.test(k)) return this.cipherPick(this.pz.p.options[+k - 1]);
        return;
      }
      if (/^[1-9]$/.test(k)) { const b = $('#modal').querySelectorAll('[data-act=choice], [data-act=confirm-yes], [data-act=summary-ok], [data-act=ending-next], [data-act=unlock], [data-act=pz-start]')[+k - 1]; if (b && !b.disabled) { e.preventDefault(); b.click(); } return; }
      if (k === 'Enter') { const b = $('#modal').querySelector('[data-act=summary-ok], [data-act=ending-next], [data-act=close].primary'); if (b) { e.preventDefault(); b.click(); } }
      return;
    }
    if (lower === 'j') return this.openJournal();
    if (lower === 'b') return this.openBag();
    if (lower === 'm') return $('[data-act=mute]')?.click();
    if (k === '?' || lower === 'h') return this.openHelp();
    if (this.screen === 'title') { if (k === 'Enter' || k === ' ') { e.preventDefault(); this.screen = 'game'; this.render(); } return; }
    if (this.busy) return;
    if (this.screen === 'elevator') {
      if (!this.g.R) { if (k === 'Enter') { e.preventDefault(); this.beginNight(); } return; }
      if (KEY_TO_BUTTON[k]) { e.preventDefault(); return this.press(KEY_TO_BUTTON[k]); }
      if (lower === 'r') return this.press('R');
      return;
    }
    if (this.screen === 'floor') {
      const room = this.g.room(), f = this.g.floor();
      const dirs = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
      if (dirs[k]) {
        e.preventDefault();
        const [dx, dy] = dirs[k];
        const to = room.adj.map(a => f.rooms[a]).find(o => o.x - room.x === dx && o.y - room.y === dy);
        if (to) this.goto(to.id);
        return;
      }
      if (/^[1-9]$/.test(k)) { const o = room.objs[+k - 1]; if (o && !o.done) this.search(+k - 1); return; }
      if (lower === 'e' && room.enc && !room.enc.done) return this.openEnc();
      if (lower === 'l' || k === 'Backspace') { e.preventDefault(); return this.toLift(); }
    }
  }

  // ───────────────────────── actions ─────────────────────────
  beginNight() {
    if (this.g.R) return;
    this.g.newNight();
    this.hint = '';
    this.indicator = 'L';
    this.tab = 'panel';
    audio.sfx('ding');
    this.render();
  }

  async press(key) {
    const g = this.g;
    if (this.busy) return;
    const chk = g.canRide(key);
    if (!chk.ok) { this.hint = chk.why; audio.sfx('error'); this.render(); return; }
    this.busy = true; this.hint = '';
    const btn = document.querySelector(`.fbtn[data-key="${CSS.escape(key)}"]`); btn?.classList.add('lit');
    audio.sfx('click');
    const from = this.indicator;
    const res = g.ride(key);
    await wait(this.speed(250));
    audio.sfx('ride');
    await this.animateIndicator(from, g.R ? g.R.display : 'L');
    if (!g.R) { this.busy = false; this.afterAction(); return; }
    const f = g.floor(), d = g.floorDef();
    // doors open on the new floor
    audio.sfx('ding');
    const shaft = $('#shaft'), beyond = $('#beyond');
    if (beyond) { beyond.style.background = `radial-gradient(ellipse at 50% 30%, ${d.pal[3]}33, ${d.pal[0]} 75%)`; beyond.style.color = d.pal[1]; beyond.textContent = f.name; }
    await wait(this.speed(350));
    audio.sfx('doors'); shaft?.classList.add('open');
    await wait(this.speed(1000));
    $('#fade').classList.add('on');
    await wait(this.speed(420));
    this.feed = [];
    this.ambient = null;
    const arrive = f.visits === 1 ? d.arrive[Math.floor(Math.random() * d.arrive.length)] : `You step out onto ${f.name} again.`;
    this.say(arrive);
    for (const ev of res.events || []) this.say(ev, 'gold');
    if (f.blocked) this.say(`The doors off the lobby are sealed. You'll need: ${ITEMS[d.req].name}.`, 'bad');
    this.render();
    $('#fade').classList.remove('on');
    this.busy = false;
    if (this.settleAndCheck()) return;
    if (res.arrive) { audio.sfx(res.arrive === 'phone' ? 'phone' : 'flicker'); this.showEnc(g.openEncounter(res.arrive, null)); }
  }

  async animateIndicator(from, to) {
    const num = $('#indNum'), up = $('#arrUp'), dn = $('#arrDn');
    const val = s => s === 'L' ? 0 : s === 'B3' ? -3 : s === '6½' ? 6.5 : isFinite(+s) ? +s : null;
    const a = val(from), b = val(to);
    const goingUp = a === null || b === null ? Math.random() < 0.5 : b >= a;
    (goingUp ? up : dn)?.classList.add('on');
    if (a !== null && b !== null && Math.abs(b - a) >= 1 && Number.isInteger(a) && Number.isInteger(b)) {
      const steps = Math.min(12, Math.abs(b - a));
      for (let i = 1; i <= steps; i++) { const n = Math.round(a + (b - a) * i / steps); if (num) num.textContent = n === 0 ? 'L' : String(n); await wait(this.speed(1200 / steps)); }
    } else {
      const glyphs = ['··', '?', '··', '¿', '··'];
      for (const gl of glyphs) { if (num) num.textContent = gl; await wait(this.speed(260)); }
    }
    if (num) num.textContent = to;
    this.indicator = to;
    up?.classList.remove('on'); dn?.classList.remove('on');
  }

  say(text, cls = '') { this.feed.push({ text, cls }); if (this.feed.length > 50) this.feed.shift(); }

  // After any action: end the night if needed, show any pending summary.
  settleAndCheck() {
    const g = this.g;
    if (g.R) g.settle();
    if (this.pendingSummary) {
      const s = this.pendingSummary; this.pendingSummary = null;
      this.screen = 'elevator'; this.tab = 'panel'; this.indicator = 'L'; this.feed = [];
      this.render();
      if (s.reason === 'ending') this.showEnding(s); else this.showSummary(s);
      return true;
    }
    return false;
  }
  afterAction() { if (!this.settleAndCheck()) this.render(); }

  async goto(id) {
    const g = this.g, f = g.floor(), room = g.room(); if (!f || this.busy) return;
    if (id === room.id) return;
    let path = room.adj.includes(id) ? [id] : null;
    if (!path) {
      const target = f.rooms[id];
      if (!target || !(target.visited || f.revealed)) { this.say('You can\'t see a way there from here yet.'); this.render(); return; }
      path = g.pathTo(id);
      if (!path) { this.say('There\'s no open way there right now.'); this.render(); return; }
    }
    for (const step of path) {
      const r = g.move(step);
      if (!r.ok) {
        if (r.locked) { this.render(); this.openLock(r.room); return; }
        this.say(r.text || 'You can\'t go that way.', 'bad'); audio.sfx('error'); break;
      }
      audio.sfx('step');
      const nr = g.room();
      this.ambient = r.ambient || null;
      if (r.first) this.say(`${nr.name}.`);
      if (r.enc) { this.render(); if (this.settleAndCheck()) return; this.showEnc(g.openEncounter(r.enc.id, nr)); return; }
      if (g.R && g.R.clock >= g.endTime()) break;
    }
    this.afterAction();
  }

  search(i) {
    const g = this.g; if (this.busy) return;
    const r = g.search(i); if (!r.ok) return;
    const cls = { cash: 'good', item: 'good', token: 'gold', clue: 'gold', lost: 'gold', bp: 'gold', quest: 'gold', hurt: 'bad', code: 'gold' }[r.kind] || '';
    audio.sfx({ cash: 'cash', token: 'find', clue: 'page', lost: 'find', bp: 'find', quest: 'find', hurt: 'bad', item: 'cash' }[r.kind] || 'search');
    const o = g.room().objs[i];
    this.say(`${o.n[0].toUpperCase() + o.n.slice(1)}: ${r.text}`, cls);
    if (r.kind === 'lost') this.toast('Lost property found', r.text.split('.')[0].replace('Lost property: ', ''), 'lost');
    if (r.kind === 'bp') this.toast('Blueprint fragment', r.text.split('.')[0], 'lost');
    if (r.kind === 'item' && ITEMS[r.id]?.kind !== 'use') this.toast('New equipment', ITEMS[r.id].name, 'task');
    this.afterAction();
  }

  toLift() {
    const g = this.g; if (this.busy || !g.floor()) return;
    const r = g.returnToLift();
    audio.sfx('doors');
    this.hint = r.steps ? `You walk back to the lift (${r.steps * g.moveTime()} min).` : '';
    this.feed = []; this.ambient = null;
    this.afterAction();
  }

  ringBell() {
    const v = this.g.ringBell();
    if (!v) return;
    audio.sfx('ding');
    this.showEnc(v);
  }

  useItem(id) {
    const r = this.g.useItem(id);
    audio.sfx(r.ok ? 'find' : 'error');
    if (this.screen === 'floor') this.say(r.text, r.ok ? 'good' : ''); else this.hint = r.text || '';
    if (this.modalKind === 'bag') this.openBag(r.text);
    if (!this.settleAndCheck()) this.render();
  }

  // ───────────────────────── modals ─────────────────────────
  modal(html, kind, wide = false) {
    this.modalKind = kind;
    const m = $('#modal');
    m.innerHTML = `<div class="sheet${wide ? ' wide' : ''}">${html}</div>`;
    m.hidden = false;
    const first = m.querySelector('button:not([disabled])'); first?.focus({ preventScroll: true });
  }
  closeModal() {
    const m = $('#modal');
    const kind = this.modalKind;
    m.hidden = true; m.innerHTML = ''; this.modalKind = null;
    if (kind === 'enc') { this.g.closeEncounter(); this.afterAction(); }
    else if (kind === 'puzzle') { this.pz = null; this.afterAction(); }
    else this.render();
  }
  closeBtn() { return '<button class="icon-btn close" data-act="close" aria-label="Close">✕ <kbd>Esc</kbd></button>'; }

  confirm(title, text, fn, yes = 'Yes') {
    this.confirmFn = fn;
    this.modal(`<h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><button class="btn danger" data-act="confirm-yes">${esc(yes)}</button><button class="btn ghost" data-act="close">Cancel</button></div>`, 'confirm');
  }

  // ───────── encounters ─────────
  openEnc() {
    const room = this.g.room(); if (!room || !room.enc || room.enc.done) return;
    this.showEnc(this.g.openEncounter(room.enc.id, room));
  }
  showEnc(v, result = null) {
    if (!v) return;
    this.encView = v;
    const npc = v.npc && NPCS[v.npc];
    const choices = v.choices || [];
    this.modal(`${this.closeBtn()}<p class="eyebrow">${npc ? 'someone' : 'something'} · ${esc(this.g.floor()?.name || 'the lift')}</p><h2>${esc(v.name)}</h2>
      ${result ? `<div class="enc-result">${esc(result)}</div>` : `<p class="enc-text">${esc(v.text)}</p>`}
      <div class="choices">${choices.map((c, i) => `<button class="btn" data-act="choice" data-i="${i}" ${c.why ? 'disabled' : ''}><span><span class="k">${i + 1}</span> ${esc(c.label)}</span><span>${c.why ? `<span class="why">${esc(c.why)}</span>` : `<span class="tag">${esc(c.tags.join(' · '))}</span>`}</span></button>`).join('')}</div>`, 'enc');
  }
  choose(i) {
    const v = this.encView; if (!v || !v.choices[i] || v.choices[i].why) return;
    audio.sfx('click');
    const res = this.g.chooseEncounter(v.choices[i].ref);
    if (!res) return;
    if (res.puzzle) { this.startEncPuzzle(res.puzzle); return; }
    this.handleEncResult(res);
  }
  handleEncResult(res) {
    if (res.ended) { this.modalKind = null; $('#modal').hidden = true; this.settleAndCheck(); return; }
    if (res.choices) { this.showEnc({ ...this.encView, text: res.text, choices: res.choices }); this.refreshBehind(); return; }
    if (res.done) {
      const repeat = res.repeat;
      this.say(res.text, 'gold');
      audio.sfx(/\+\$|\$\d|token|found|Got/i.test(res.text) ? 'find' : 'page');
      this.encView = null;
      this.modal(`${this.closeBtn()}<h2>${esc(this.g.enc?.e.name || '')}</h2><div class="enc-result">${esc(res.text)}</div>
        <div class="row">${repeat && this.g.R ? '<button class="btn" data-act="enc-again"><span class="k">1</span> Again</button>' : ''}<button class="btn primary" data-act="close">Continue <span class="k">Esc</span></button></div>`, 'enc');
      this.refreshBehind();
    } else if (res.text) { this.showEnc({ ...this.encView }, res.text); }
  }
  refreshBehind() { $('#hud').innerHTML = this.hud(); }

  // ───────── locks & puzzles ─────────
  openLock(room) {
    const g = this.g, L = room.lock;
    let body = '';
    if (L.kind === 'item') {
      const it = ITEMS[L.item];
      const what = { crowbar: 'The door is jammed solid in its frame.', lockpicks: 'An old mortice lock. No key in sight.', keycard_blue: 'A card reader blinks red beside the door.' }[L.item] || 'It\'s locked.';
      body = `<p>${what}</p><div class="choices">
        <button class="btn" data-act="unlock" data-room="${room.id}" data-how="item" ${g.has(L.item) ? '' : 'disabled'}><span><span class="k">1</span> Use your ${esc(it.name)}</span><span class="tag">${g.has(L.item) ? '3 min' : `<span class="why">needs ${esc(it.name)}</span>`}</span></button>`;
    } else {
      const p = L.puzzle;
      const what = { keypad: 'A keypad lock with four digits. Somebody, somewhere on this floor, will have written the code down.', fuses: 'The door is powered by a fuse panel. Every fuse must be lit for it to open.', chime: 'A brass panel with four bells. A small plaque: "PLAY THE ARRIVAL".', valves: 'A pressure-sealed door. Set the valves so the gauge reads exactly the line.', cipher: 'A word lock. Above it, a word in code.' }[p.type];
      body = `<p>${what}</p>${room.lock.hint ? `<p class="muted">${esc(room.lock.hint)}</p>` : ''}<div class="choices">
        <button class="btn" data-act="pz-start" data-room="${room.id}"><span><span class="k">1</span> Work on the ${esc(PUZZLE_NAMES[p.type].toLowerCase())}</span><span class="tag">puzzle</span></button>`;
    }
    if (g.has('skeleton_key')) body += `<button class="btn" data-act="unlock" data-room="${room.id}" data-how="skeleton"><span><span class="k">2</span> Use a skeleton key (×${g.count('skeleton_key')})</span><span class="tag">one use</span></button>`;
    body += `<button class="btn ghost" data-act="close">Leave it for now</button></div>`;
    this.modal(`${this.closeBtn()}<p class="eyebrow">locked</p><h2>${esc(room.name)}</h2>${body}`, 'lock');
  }
  unlock(roomId, how) {
    const r = this.g.unlockWith(roomId, how);
    if (!r.ok) { audio.sfx('error'); return; }
    audio.sfx('unlock'); this.say(r.text, 'good');
    this.modalKind = null; $('#modal').hidden = true;
    this.goto(roomId);
  }
  startLockPuzzle(roomId) {
    const room = this.g.floor().rooms[roomId];
    this.pz = { ctx: 'lock', roomId, p: room.lock.puzzle };
    this.pzReset();
    this.renderPuzzle();
  }
  startEncPuzzle(type) {
    const tier = this.g.floor()?.tier || 1;
    this.pz = { ctx: 'enc', p: makePuzzle(type, makeRng(randomSeed()), tier) };
    this.pzReset();
    this.renderPuzzle();
  }
  pzReset() {
    const p = this.pz.p;
    this.kp = ''; this.pz.msg = '';
    if (p.type === 'fuses') p.moves = 0;
    if (p.type === 'chime') p.pos = 0;
    if (p.type === 'cipher') this.pz.wrong = [];
  }
  renderPuzzle() {
    const { p } = this.pz, g = this.g;
    let body = '';
    if (p.type === 'keypad') {
      const notes = g.floor()?.notes || [];
      body = `<div class="keypad-screen${this.pz.err ? ' err' : ''}" aria-live="polite">${esc((this.kp + '____').slice(0, 4))}</div>
        <div class="keypad">${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clr', '0', 'ent'].map(k => `<button class="key" data-act="kp" data-d="${k}" aria-label="${k}">${k === 'clr' ? 'C' : k === 'ent' ? '⏎' : k}</button>`).join('')}</div>
        <p class="small muted">${notes.length ? 'Your notes: ' + notes.map(esc).join(' · ') : 'You haven\'t found the code yet. Search this floor for a note.'}</p>`;
    } else if (p.type === 'fuses') {
      body = `<div class="fuse-grid" style="grid-template-columns:repeat(${p.n},64px)">${p.grid.map((on, i) => `<button class="fuse${on ? ' on' : ''}${p.hinted === i ? ' hint' : ''}" data-act="fuse" data-i="${i}" aria-label="Fuse ${i + 1} ${on ? 'lit' : 'dark'}"></button>`).join('')}</div>
        <p class="small muted">Each switch flips itself and its neighbours. Light them all. Moves: ${p.moves}</p>
        ${g.has('multimeter') ? `<button class="btn ghost" data-act="fuse-hint" ${p.hinted !== undefined && p.grid && p.sol.includes(p.hinted) ? 'disabled' : ''}>Test with the multimeter (hint)</button>` : '<p class="small muted">A multimeter would tell you which circuit to try.</p>'}`;
    } else if (p.type === 'chime') {
      body = `<p class="small muted">Listen to the arrival, then play it back. (Keys 1–4)</p><div class="bells">${[0, 1, 2, 3].map(i => `<button class="bell" data-act="ring" data-i="${i}" aria-label="Bell ${i + 1}">${i + 1}</button>`).join('')}</div>
        <button class="btn" data-act="chime-play">▶ Listen (${p.seq.length} notes)</button><p class="small" aria-live="polite">${esc(this.pz.msg || '')}</p>`;
    } else if (p.type === 'valves') {
      const tot = valveTotal(p), max = p.weights.reduce((s, w) => s + w * 5, 0);
      body = `<div class="gauge" aria-label="Pressure ${tot} of target ${p.target}"><i style="width:${Math.min(100, 100 * tot / max)}%"></i><b style="left:${100 * p.target / max}%"></b></div>
        <p class="small">Pressure <b>${tot}</b> · target <b>${p.target}</b></p>
        <div class="valves">${p.weights.map((w, i) => `<div class="valve"><span class="w">×${w}</span><button class="btn" data-act="valve" data-i="${i}" data-d="-1" aria-label="Close valve">−</button><span class="v">${p.set[i]}</span><button class="btn" data-act="valve" data-i="${i}" data-d="1" aria-label="Open valve">+</button></div>`).join('')}</div>
        <button class="btn" data-act="valve-go">Engage</button><p class="small" aria-live="polite">${esc(this.pz.msg || '')}</p>`;
    } else if (p.type === 'cipher') {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      body = `<div class="cipher-text">${esc(p.text)}</div><p class="small">Shift every letter <b>back ${p.shift}</b> in the alphabet.</p><p class="alpha">${A}</p>
        <div class="choices" style="width:100%">${p.options.map((w, i) => `<button class="btn" data-act="ciph" data-w="${esc(w)}" ${this.pz.wrong?.includes(w) ? 'disabled' : ''}><span><span class="k">${i + 1}</span> ${esc(w)}</span></button>`).join('')}</div>`;
    }
    this.modal(`<button class="icon-btn close" data-act="pz-quit" aria-label="Give up">✕ <kbd>Esc</kbd></button><p class="eyebrow">puzzle</p><h2>${esc(PUZZLE_NAMES[p.type])}</h2><div class="pz">${body}</div>`, 'puzzle');
  }
  kpInput(k) {
    const p = this.pz.p; this.pz.err = false;
    if (k === 'clr') this.kp = '';
    else if (k === 'ent') {
      if (this.kp.length < 4) { audio.sfx('error'); return; }
      this.g.puzzleAttempt(1);
      if (this.kp === p.code) return this.puzzleWin();
      this.g.puzzleFail(p); this.pz.err = true; this.kp = ''; audio.sfx('error');
      this.renderPuzzle(); this.refreshBehind();
      if (this.g.R && this.g.R.comp <= 0) this.quitPuzzle();
      return;
    } else if (this.kp.length < 4) this.kp += k;
    audio.sfx('beep');
    this.renderPuzzle();
  }
  fuseClick(i) {
    const p = this.pz.p; if (i >= p.grid.length) return;
    audio.sfx('fuse');
    if (fusePress(p, i)) return this.puzzleWin();
    this.renderPuzzle();
  }
  async playChime() {
    const p = this.pz.p; if (this.pz.playing) return;
    this.pz.playing = true; p.pos = 0; this.pz.msg = 'Listen…'; this.renderPuzzle();
    for (const n of p.seq) {
      await wait(this.speed(480));
      const b = document.querySelectorAll('.bell')[n]; b?.classList.add('flash'); audio.sfx('note', n);
      await wait(this.speed(320)); b?.classList.remove('flash');
    }
    this.pz.playing = false; this.pz.msg = 'Your turn.'; this.renderPuzzle();
  }
  chimeClick(i) {
    const p = this.pz.p; if (this.pz.playing) return;
    audio.sfx('note', i);
    const b = document.querySelectorAll('.bell')[i]; b?.classList.add('flash'); setTimeout(() => b?.classList.remove('flash'), 180);
    const r = chimeInput(p, i);
    if (r === 'done') return setTimeout(() => this.puzzleWin(), 300);
    if (r === 'wrong') { this.g.comp(-2); this.g.time(1); this.pz.msg = 'A sour note. The bells reset. (−2 composure)'; audio.sfx('error'); this.renderPuzzle(); this.refreshBehind(); }
  }
  valveGo() {
    const p = this.pz.p;
    this.g.puzzleAttempt(1);
    if (valvesSolved(p)) return this.puzzleWin();
    this.g.puzzleFail(p);
    const t = valveTotal(p);
    this.pz.msg = t > p.target ? 'The pipes bang. Too high. (−4 composure)' : 'A weak hiss. Too low. (−4 composure)';
    audio.sfx('error'); this.renderPuzzle(); this.refreshBehind();
  }
  cipherPick(w) {
    const p = this.pz.p; if (!w || this.pz.wrong.includes(w)) return;
    this.g.puzzleAttempt(1);
    if (w === p.answer) return this.puzzleWin();
    this.pz.wrong.push(w); this.g.puzzleFail(p); audio.sfx('error'); this.renderPuzzle(); this.refreshBehind();
  }
  puzzleWin() {
    const { ctx, roomId, p } = this.pz;
    audio.sfx('unlock');
    this.pz = null; this.modalKind = null; $('#modal').hidden = true;
    if (ctx === 'lock') {
      const r = this.g.solveLock(roomId);
      this.say(r.text, 'good');
      this.goto(roomId);
    } else {
      const res = this.g.puzzleForEncounter(true, p);
      this.handleEncResult(res || { done: true, text: 'Solved.' });
    }
  }
  quitPuzzle() {
    if (!this.pz) return this.closeModal();
    const { ctx } = this.pz;
    this.pz = null; this.modalKind = null; $('#modal').hidden = true;
    if (ctx === 'enc') { const res = this.g.puzzleForEncounter(false); if (res) return this.showEnc({ ...this.encView, choices: res.choices }, res.text); }
    this.afterAction();
  }

  // ───────── journal ─────────
  openJournal(tab) {
    if (tab) this.jtab = tab;
    const S = this.S, t = this.jtab;
    const tabs = [['clues', `Clues ${Object.keys(S.clues).length}/${CLUES.length}`], ['floors', `Floors ${Object.keys(S.floorsSeen).length}/${FLOORS.length}`], ['people', 'People'], ['lost', `Lost Property ${Object.keys(S.lost).length}/${LOST.length}`], ['ach', `Achievements ${Object.keys(S.achievements).length}/${ACHIEVEMENTS.length}`], ['stats', 'Stats'], ['endings', `Endings ${Object.keys(S.endings).length}/4`]];
    let body = '';
    if (t === 'clues') {
      const got = CLUES.filter(c => S.clues[c.id]).sort((a, b) => S.clues[a.id] - S.clues[b.id]);
      const need = Math.max(0, CLUES_FOR_13 - got.length);
      body = `<p class="small muted">${this.g.has('thirteenth_button') ? (need ? `The thirteenth button won't press until you understand more: ${need} more clue${need > 1 ? 's' : ''}.` : 'You understand enough. The thirteenth button will press.') : 'Documents, messages and conversations you\'ve collected.'}</p>
        ${got.length ? got.map(c => `<div class="clue"><h4>${esc(c.title)}</h4><p>${esc(c.text)}</p></div>`).join('') : '<p class="muted">Nothing yet. Search things. Talk to people. Answer the phone.</p>'}
        ${Object.keys(S.blueprints).length ? `<p class="eyebrow" style="margin-top:14px">blueprint fragments ${Object.keys(S.blueprints).length}/5</p>${Object.entries(BLUEPRINTS).map(([id, b]) => S.blueprints[id] ? `<div class="clue"><h4>${esc(b.name)}</h4><p>${esc(b.desc)}</p></div>` : '').join('')}` : ''}`;
    } else if (t === 'floors') {
      const group = (title, list, hide) => `<p class="eyebrow" style="margin-top:10px">${title}</p><div class="jgrid">${list.map(f => {
        const n = S.floorsSeen[f.id] || 0;
        return n ? `<div class="jcell got"><h4>${esc(f.name)}</h4><span class="muted">${esc(CAT_NAMES[f.cat])} · visited ${n}×${f.req ? ` · needs ${esc(ITEMS[f.req].name)}` : ''}</span></div>` : `<div class="jcell unknown"><h4>???</h4><span>${hide ? esc(hide) : esc(CAT_NAMES[f.cat])}${f.req && !hide ? ` · needs ${esc(ITEMS[f.req].name)}` : ''}</span></div>`;
      }).join('')}</div>`;
      body = group('ordinary floors', NORMAL_FLOORS) + group('secret floors', FLOORS.filter(f => f.kind === 'secret'), 'a button you don\'t have') + group('anomalies', FLOORS.filter(f => f.kind === 'anomaly'), 'only by chance') + group('???', FLOORS.filter(f => f.kind === 'special'), '…');
    } else if (t === 'people') {
      const met = Object.keys(NPCS).filter(k => S.people[k] !== undefined);
      body = `<div class="jgrid">${Object.entries(NPCS).map(([k, n]) => met.includes(k) ? `<div class="jcell got"><h4>${esc(n.name)}</h4><p style="margin:0">${esc(n.desc)}</p>${S.people[k] ? `<span class="muted">met ${S.people[k]}×</span>` : ''}</div>` : `<div class="jcell unknown"><h4>???</h4><span>not met yet</span></div>`).join('')}</div>`;
    } else if (t === 'lost') {
      const n = Object.keys(S.lost).length;
      body = `<div class="progress"><i style="width:${100 * n / LOST.length}%"></i></div><div class="jgrid">${LOST.map(l => S.lost[l.id] ? `<div class="jcell got"><h4>${esc(l.name)}</h4><span>${esc(l.desc)}</span></div>` : `<div class="jcell unknown"><h4>???</h4><span>${esc(l.cats.map(c => CAT_NAMES[c] || FLOOR_BY_ID[c]?.name || (c === 'dark' ? 'in the dark' : c)).slice(0, 2).join(' / '))}${l.need ? ` · needs ${esc(ITEMS[l.need].name)}` : ''}</span></div>`).join('')}</div>`;
    } else if (t === 'ach') {
      const n = Object.keys(S.achievements).length;
      body = `<p class="small">${n} of ${ACHIEVEMENTS.length} unlocked (${Math.round(100 * n / ACHIEVEMENTS.length)}%)</p><div class="progress"><i style="width:${100 * n / ACHIEVEMENTS.length}%"></i></div>
        <div class="jgrid">${ACHIEVEMENTS.map(a => { const got = S.achievements[a.id]; const rar = RARITY[a.r]; const hidden = a.secret && !got; return `<div class="jcell ${got ? 'got' : 'unknown'}" style="${got ? `border-color:${rar.color}` : ''}"><span class="rar" style="color:${rar.color}">${rar.label}${a.secret ? ' · secret' : ''}</span><h4>${hidden ? '???' : esc(a.name)}</h4><span>${hidden ? 'A secret achievement.' : esc(a.desc)}</span>${got ? `<br><span class="muted">${new Date(got).toLocaleDateString()}</span>` : ''}</div>`; }).join('')}</div>`;
    } else if (t === 'stats') {
      const st = S.stats;
      const rows = [['Nights begun', st.nightsStarted], ['Nights survived', st.nightsDone], ['Blackouts', st.blackouts], ['Floors visited', st.floors], ['Most floors in one night', st.bestFloorsNight], ['Rooms explored', st.rooms], ['Things searched', st.searches], ['Puzzles solved', st.puzzles], ['Encounters', st.encounters], ['Rare encounters', st.rareEncounters], ['Anomalies witnessed', st.anomalies], ['Phone calls answered', st.phoneCalls || 0], ['Times you petted the cat', st.catPets || 0], ['Floor tasks completed', st.tasks || 0], ['Total banked', '$' + st.banked], ['Best single night', '$' + st.bestBank], ['Total spent', '$' + st.spent], ['Clues', `${Object.keys(S.clues).length}/${CLUES.length}`], ['Lost property', `${Object.keys(S.lost).length}/${LOST.length}`], ['Blueprint fragments', `${Object.keys(S.blueprints).length}/5`]];
      body = `<table class="stats">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>`;
    } else if (t === 'endings') {
      body = `<div class="jgrid">${Object.entries(ENDINGS).map(([id, e]) => S.endings[id] ? `<div class="jcell got"><h4>${esc(e.title)}</h4><span>${esc(e.text[0])}</span></div>` : `<div class="jcell unknown"><h4>???</h4><span>An ending you haven't seen.</span></div>`).join('')}</div>
        <p class="small muted" style="margin-top:12px">${Object.keys(S.floorsSeen).includes('thirteen') ? 'Floor 13 has more than one way out. Some depend on what you carry. One depends on when you arrive.' : 'Somewhere above the twelfth floor, there is a way out.'}</p>`;
    }
    this.modal(`${this.closeBtn()}<p class="eyebrow">night ${S.night}</p><h2>Journal</h2><div class="jtabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab${t === k ? ' on' : ''}" data-act="jtab" data-tab="${k}" role="tab" aria-selected="${t === k}">${esc(l)}</button>`).join('')}</div>${body}`, 'journal', true);
  }

  openBag(msg = '') {
    const g = this.g, S = this.S;
    const owned = Object.keys(S.items).filter(id => S.items[id] > 0 && ITEMS[id]);
    const kind = k => owned.filter(id => ITEMS[id].kind === k);
    const list = (ids, usable) => ids.length ? `<div class="jgrid">${ids.map(id => `<div class="jcell got"><h4>${esc(ITEMS[id].name)}${S.items[id] > 1 ? ` ×${S.items[id]}` : ''}</h4><span>${esc(ITEMS[id].desc)}</span>${usable && !ITEMS[id].nouse ? `<div style="margin-top:6px"><button class="btn" data-act="use" data-id="${id}">Use</button></div>` : ''}</div>`).join('')}</div>` : '<p class="muted small">Nothing.</p>';
    const missingEquip = EQUIPMENT.filter(e => !g.has(e)).length;
    this.modal(`${this.closeBtn()}<p class="eyebrow">what you're carrying</p><h2>Bag</h2>${msg ? `<div class="enc-result">${esc(msg)}</div>` : ''}
      <p class="small">Bank <b>$${S.bank}</b> · tokens <b>${S.tokens}</b>${g.R ? ` · pocket <b>$${g.R.pocket}</b>` : ''}</p>
      <p class="eyebrow" style="margin-top:12px">consumables</p>${list(kind('use'), true)}
      <p class="eyebrow" style="margin-top:12px">equipment <span class="muted">(${EQUIPMENT.length - missingEquip}/${EQUIPMENT.length})</span></p>${list(kind('equip'))}
      <p class="eyebrow" style="margin-top:12px">keys & errands</p>${list([...kind('key'), ...kind('quest')])}`, 'bag', true);
  }

  openSettings() {
    const st = this.S.settings;
    const sw = (key, label, desc) => `<div class="setting"><div><b>${label}</b><br><span class="small muted">${desc}</span></div><button class="switch${st[key] ? ' on' : ''}" data-act="toggle" data-key="${key}" role="switch" aria-checked="${!!st[key]}" aria-label="${label}"></button></div>`;
    this.modal(`${this.closeBtn()}<h2>Settings</h2>
      ${sw('sound', 'Sound', 'All audio on or off.')}
      <div class="setting"><div><b>Volume</b></div><input type="range" min="0" max="1" step="0.05" value="${st.volume}" id="vol" aria-label="Volume"></div>
      ${sw('ambience', 'Ambient hum', 'The fluorescent drone of the building.')}
      ${sw('grain', 'Film grain', 'Subtle animated noise over the screen.')}
      ${sw('motion', 'Motion & animation', 'Door animations, flicker and transitions.')}
      <div class="setting"><div><b>Reset save</b><br><span class="small muted">Erase all progress on this device.</span></div><button class="btn danger" data-act="reset">Reset…</button></div>
      <p class="small muted" style="margin-top:12px">Progress is saved automatically in this browser.</p>`, 'settings');
    $('#vol')?.addEventListener('input', e => { st.volume = +e.target.value; audio.applySettings(st); });
    $('#vol')?.addEventListener('change', () => this.g.save());
  }

  openHelp() {
    this.modal(`${this.closeBtn()}<h2>How to play</h2>
      <p><b>The night.</b> Each night runs from 9 PM until dawn. Rides, walking, searching and talking all take minutes. At dawn your pocket cash is banked. If your <b>composure</b> drops to zero you black out and drop half of it.</p>
      <p><b>The lift.</b> Press a numbered button to ride. Tonight each number leads to a different kind of floor — it changes every night. <b>RANDOM</b> goes anywhere, and strange floors are much more likely. Some buttons only appear when you hold the right key.</p>
      <p><b>Floors.</b> Click rooms on the map (or use the arrow keys) to move. Search objects, approach people and oddities (<b>!</b>), and open locked rooms (<b>▣</b>) with tools or puzzles. Keypad codes are always written down somewhere on the same floor.</p>
      <p><b>Progress.</b> Spend banked cash on upgrades in the <b>Service</b> tab and tools in <b>Supplies</b>. Clues go in your <b>Journal</b>, along with floors, people, lost property and achievements.</p>
      <p><b>The mystery.</b> The building has twelve floors. Everyone says so. Find enough clues, earn the trust of the man in the cap, and see for yourself.</p>
      <p class="small muted">Keys: 1–9/0/−/= press floor buttons · R random · arrows move · 1–9 search · E approach · L back to lift · J journal · B bag · M mute · Esc close.</p>`, 'help');
  }

  showSummary(s) {
    audio.sfx(s.reason === 'blackout' ? 'bad' : 'ding');
    this.modal(`${this.summaryHTML(s)}<div class="row" style="margin-top:14px"><button class="btn big" data-act="summary-ok">Back to the lift <span class="k">Enter</span></button></div>`, 'summary');
  }
  showEnding(s) {
    this.endingState = { s, page: 0, e: ENDINGS[s.endingId] };
    this.setPalette(FLOOR_BY_ID.thirteen.pal, 'thirteen');
    audio.sfx('chime');
    this.endingPage();
  }
  endingPage() {
    const { e, page } = this.endingState;
    const last = page >= e.text.length - 1;
    this.modal(`<div class="ending"><p class="eyebrow">ending ${Object.keys(ENDINGS).indexOf(this.endingState.s.endingId) + 1} of 4</p><h2>${esc(e.title)}</h2><p>${esc(e.text[page])}</p>
      <button class="btn big" data-act="ending-next">${last ? 'The end' : 'Continue'} <span class="k">Enter</span></button></div>`, 'ending', true);
  }
  endingNext() {
    const st = this.endingState;
    audio.sfx('page');
    if (st.page < st.e.text.length - 1) { st.page++; this.endingPage(); return; }
    this.endingState = null;
    this.setPalette(DEFAULT_PAL, 'lift');
    this.showSummary(st.s);
  }

  // ───────── toasts ─────────
  toast(title, text, kind = '') {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast';
    if (kind === 'clue' || kind === 'lost') el.style.borderLeftColor = 'var(--brass-hi)';
    el.innerHTML = `<b>${esc(title)}</b>${esc(text)}`;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 4200);
  }
  toastAch(a) {
    const rar = RARITY[a.r];
    audio.sfx('ach');
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast'; el.style.borderLeftColor = rar.color;
    el.innerHTML = `<span class="rar" style="color:${rar.color}">Achievement · ${rar.label}</span><b>${esc(a.name)}</b>${esc(a.desc)}`;
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 5200);
  }
}

function encName(id) { return ENC_BY_ID[id]?.name || 'Something'; }
