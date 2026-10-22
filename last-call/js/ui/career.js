// Career and finances: balance, standing, living costs, the shop (equipment, training, career,
// transport, housing, room decorations), your room, stats and earnings history.

import { esc, money, signed, toast } from './dom.js';
import { SHOP, CATEGORIES, canBuy, buy, owns, upkeep, SHOP_BY_ID } from '../upgrades.js';
import { PAY, CAREER } from '../config.js';
import { currentShift, totalShifts } from '../campaign.js';
import { shiftIdAt, SHIFTS } from '../shifts.js';
import { VENUES } from '../venues.js';

function roomSvg(p) {
  const has = id => owns(p, id);
  const studio = p.housing === 'studio';
  return `<svg class="room" viewBox="0 0 400 240" role="img" aria-label="Your room">
    <rect width="400" height="240" fill="${studio ? '#2a2440' : '#2a2026'}"/>
    <rect y="186" width="400" height="54" fill="${studio ? '#4a3a2e' : '#3a2a22'}"/>
    <rect x="${studio ? 270 : 280}" y="40" width="90" height="70" fill="#0d1a2e" stroke="#1a1220" stroke-width="5"/><path d="M${studio ? 315 : 325} 40 v70 M${studio ? 270 : 280} 75 h90" stroke="#1a1220" stroke-width="4"/><circle cx="${studio ? 340 : 350}" cy="58" r="7" fill="#f2e6b0"/>
    ${studio ? '<rect x="30" y="140" width="150" height="50" rx="8" fill="#5a4a7a" stroke="#1a1220" stroke-width="4"/><rect x="30" y="126" width="40" height="22" rx="6" fill="#e8e0d0" stroke="#1a1220" stroke-width="3"/>' : '<rect x="30" y="140" width="170" height="50" rx="12" fill="#7a5a3a" stroke="#1a1220" stroke-width="4"/><rect x="40" y="120" width="150" height="30" rx="10" fill="#8a6a4a" stroke="#1a1220" stroke-width="4"/><text x="115" y="215" fill="#ffffff55" font-size="10" text-anchor="middle" font-family="sans-serif">(Benny\'s couch)</text>'}
    ${has('rug') ? '<ellipse cx="200" cy="212" rx="120" ry="18" fill="#b0244a" stroke="#1a1220" stroke-width="3"/><ellipse cx="200" cy="212" rx="90" ry="11" fill="none" stroke="#f2c46b" stroke-width="3"/>' : ''}
    ${has('poster') ? '<rect x="40" y="30" width="60" height="80" fill="#1d3a2a" stroke="#1a1220" stroke-width="4"/><text x="70" y="62" fill="#9dff5c" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="700">MOTH</text><text x="70" y="78" fill="#9dff5c" font-size="11" text-anchor="middle" font-family="sans-serif" font-weight="700">&amp;STATIC</text>' : ''}
    ${has('neon-sign') ? '<text x="185" y="70" fill="#ff4fd8" font-size="22" text-anchor="middle" font-family="sans-serif" font-weight="900" class="room-neon">LAST CALL</text>' : ''}
    ${has('plant') ? '<rect x="226" y="160" width="26" height="28" fill="#c06a3a" stroke="#1a1220" stroke-width="3"/><path d="M239 160 Q220 130 214 110 M239 160 Q250 120 266 112 M239 160 Q238 130 240 100" stroke="#3a9a52" stroke-width="9" fill="none" stroke-linecap="round"/>' : ''}
    ${has('lava-lamp') ? '<path d="M372 186 l-10 -8 l4 -44 l12 0 l4 44 z" fill="#ff7a3a" stroke="#1a1220" stroke-width="3"/><circle cx="372" cy="150" r="5" fill="#ffd34a" class="lava"/>' : ''}
    ${has('record-player') ? '<rect x="290" y="150" width="70" height="36" fill="#4a3226" stroke="#1a1220" stroke-width="3"/><circle cx="318" cy="150" r="16" fill="#111" stroke="#1a1220" stroke-width="2"/><circle cx="318" cy="150" r="4" fill="#d65a3a"/>' : ''}
    ${has('aquarium') ? '<rect x="120" y="30" width="80" height="50" fill="#2a6a9a" stroke="#1a1220" stroke-width="4" opacity=".9"/><path d="M140 52 l8 -5 l0 10 z M168 62 l8 -5 l0 10 z M152 42 l6 -4 l0 8 z" fill="#ffb347"/>' : ''}
  </svg>`;
}

export function renderCareer(app, onContinue) {
  const p = app.player;
  let cat = app.ui.shopTab ?? 'equipment';
  const nextId = shiftIdAt(p.index + 1, p.flags);
  const next = nextId ? SHIFTS[nextId] : null;
  const render = () => {
    const u = upkeep(p);
    const daily = u.housing + u.transport + PAY.food;
    const items = SHOP.filter(i => i.cat === cat);
    const maxNet = Math.max(1, ...p.history.map(h => Math.abs(h.net)));
    app.root.innerHTML = `
    <div class="screen career">
      <header class="career-head">
        <div><span class="kicker">Career &amp; finances</span><h1>${esc(p.name)}</h1></div>
        <div class="career-money"><span>Balance</span><b class="${p.money < 0 ? 'neg' : ''}">${money(p.money)}</b></div>
        <div class="career-money"><span>Costs per shift</span><b>${money(daily)}</b><small>rent ${money(u.housing)} · food ${money(PAY.food)} · transport ${money(u.transport)}</small></div>
        <div class="career-money"><span>Warnings</span><b class="${p.warnings ? 'warn' : ''}">${p.warnings} / ${CAREER.maxWarnings}</b></div>
      </header>
      <div class="career-grid">
        <section class="card shop">
          <div class="tabs" role="tablist">${CATEGORIES.map(([id, t]) => `<button role="tab" type="button" class="tab ${cat === id ? 'on' : ''}" data-cat="${id}" aria-selected="${cat === id}">${t}</button>`).join('')}</div>
          <div class="shop-items">${items.map(i => {
            const c = canBuy(p, i.id);
            const inUse = i.slot && p[i.slot] === i.id;
            const label = inUse ? 'In use' : (i.slot && owns(p, i.id)) ? 'Use' : owns(p, i.id) ? 'Owned' : i.price ? `Buy ${money(i.price)}` : 'Use';
            return `<article class="item ${owns(p, i.id) ? 'owned' : ''}"><div><h3>${esc(i.name)}</h3><p>${esc(i.desc)}</p>${i.upkeep != null ? `<small class="muted">${money(i.upkeep)} per shift</small>` : ''}</div><button class="btn small ${c.ok ? '' : 'disabled'}" data-buy="${i.id}" ${c.ok ? '' : 'disabled'} title="${esc(c.why ?? '')}">${label}</button></article>`;
          }).join('')}</div>
          <p class="muted small">Equipment and training make evidence easier to read. They never make the decision for you.</p>
        </section>
        <section class="card">
          <h2>Your room</h2>${roomSvg(p)}
          <h2>Record</h2>
          <dl class="stats"><dt>Shifts worked</dt><dd>${p.stats.shifts}</dd><dt>Accuracy</dt><dd>${p.stats.correct + p.stats.wrong ? Math.round(p.stats.correct / (p.stats.correct + p.stats.wrong) * 100) : 0}%</dd><dt>Fakes caught</dt><dd>${p.stats.fakesCaught}</dd><dt>Underage stopped</dt><dd>${p.stats.underageStopped}</dd><dt>Tips earned</dt><dd>${money(p.stats.tips)}</dd><dt>Best streak</dt><dd>${p.stats.bestStreak}</dd></dl>
          <h3>Net per shift</h3>
          <div class="history" role="img" aria-label="Net earnings per shift">${p.history.map(h => `<span class="hbar ${h.net < 0 ? 'neg' : ''} ${h.passed ? '' : 'failed'}" style="--h:${Math.abs(h.net) / maxNet}" title="${esc(h.shiftId)}: ${signed(h.net)}, rating ${h.rating}"></span>`).join('')}</div>
        </section>
      </div>
      <footer class="brief-foot"><button class="btn ghost" id="menuBtn">Save &amp; menu</button><span class="muted">${next ? `Next: shift ${p.index + 2} of ${totalShifts()} — ${esc(VENUES[next.venue].name)}` : 'Next: the end of the story'}</span><button class="btn big" id="next" autofocus>Continue</button></footer>
    </div>`;
    app.root.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { cat = b.dataset.cat; app.ui.shopTab = cat; render(); });
    app.root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const r = buy(p, b.dataset.buy);
      if (!r.ok) { toast(r.why, 'bad'); return; }
      app.audio.sfx('buy');
      toast(`${SHOP_BY_ID[b.dataset.buy].name}: done.`, 'good', 1800);
      app.save();
      render();
    });
    document.getElementById('menuBtn').onclick = () => { app.save(); app.go('menu'); };
    document.getElementById('next').onclick = onContinue;
  };
  render();
}
