// What goes inside the drawers. Each builder returns { key, lead, title, subtitle, body, foot, update } for Drawer.show().
//
// Panels never calculate. Every number comes from g.view(id) (= sim.view), and figures that change are
// registered as "live" items; main.js calls content.update() after each month and while a slider moves, so
// the panel refreshes in place without being rebuilt. Rows tagged "Soon" belong to later checkpoints.
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { toast } from './overlays.js';
import { flagImg } from './flags.js';
import { opinion, relation } from '../core/state.js';
import { country, ownerOf } from '../core/db.js';
import { RECRUIT_LEVELS, POLICY_LIMITS } from '../core/sim.js';
import { loadRegions, hasRegions, regionNoun } from '../core/regions.js';
import { RESOURCE_LABELS } from '../data/nations.js';
import { money, people, troops, monthLabel, monthShort, pct } from '../core/format.js';

// Political colour of a country (its owner's tint; gold for the player's).
export function swatchColor(g, id) {
  const owner = ownerOf(g.state, id);
  if (g.state && owner === g.state.player) return 'var(--land-player)';
  return `var(--land-${country(owner)?.tint ?? 0})`;
}
const section = (title, ...kids) => h('section.wd-section', title ? h('h3.wd-section-t', title) : '', ...kids);
const soonTag = () => h('span.wd-tag.plain', 'Soon');
function row({ ic, title, sub: s, end, onClick }) {
  return h('button.wd-row', { type: 'button', on: { click: onClick } },
    h('span.wd-row-ic', icon(ic)), h('span.wd-row-main', h('span.wd-row-t', title), s ? h('span.wd-row-s', s) : ''), end ? h('span.wd-row-end', end) : '');
}
export const soon = (what) => toast(`<b>${what}</b> arrives in a later checkpoint.`, { icon: 'sparkle', tone: 'gold', ms: 3200 });
const stabilityTone = (v) => (v >= 60 ? 'good' : v >= 35 ? 'warn' : 'bad');
const opinionTone = (o) => (o >= 10 ? 'good' : o > -20 ? 'info' : o > -45 ? 'warn' : 'bad');
const perPerson = (v) => (v >= 1000 ? '$' + (Math.round(v / 100) / 10).toLocaleString('en') + 'K' : '$' + Math.round(v)) + ' per person';
const count = (k) => (k >= 1 ? troops(k) : k > 0.0005 ? String(Math.round(k * 1000)) : '0');   // thousands -> '9K', '910', '0'
const trendArrow = (now, target) => (target - now > 1.5 ? '↑' : target - now < -1.5 ? '↓' : '→');

// ——— Live items: small functions that re-read the view and patch their element ———
function live(g, id) {
  const items = [];
  const L = {
    view: () => g.view(id),
    text(fn, tag = 'span') { const el = h(tag); items.push((v) => { el.textContent = fn(v); }); return el; },
    // fn returns [text, className]
    styled(fn, tag = 'span') { const el = h(tag); items.push((v) => { const [t, c] = fn(v); el.textContent = t; el.className = c; }); return el; },
    nodes(fn, tag = 'div') { const el = h(tag); items.push((v) => clear(el).append(...[fn(v)].flat().filter(Boolean))); return el; },
    meter(label, value, tone, shown) {
      const bar = h('span'), b = h('b'), wrap = h('div.wd-meter', h('div.wd-meter-top', h('span', label), b), h('div.wd-meter-bar', bar));
      items.push((v) => { const x = value(v); bar.style.width = Math.max(0, Math.min(100, x)) + '%'; b.textContent = shown ? shown(v) : Math.round(x) + '%'; wrap.className = 'wd-meter ' + tone(v); });
      return wrap;
    },
    update() { const v = g.view(id); for (const f of items) f(v); },
  };
  return L;
}
function statValue(L, label, value, sub) {
  const v = L.text(value); v.className = 'wd-stat-v';
  return h('div.wd-stat', h('span.wd-stat-l', label), v, sub ? L.styled(sub) : '');
}
const subLine = (text, tone = 'dim') => [text, 'wd-stat-d ' + tone];

function factorList(factors, fmt, max = 6) {
  if (!factors.length) return h('p.wd-note', 'Nothing unusual.');
  return h('div.wd-ledger', factors.slice(0, max).map((f) => h('div', h('span', f.label), h('b', { class: f.value > 0 ? 'up' : 'down' }, fmt(f.value)))));
}
const ledger = (lines) => lines.map((x) => h('div', h('span', x.label), h('b', money(x.value / 12) + ' /mo')));

function countryChip(g, id) {
  return h('button.wd-chip', { type: 'button', on: { click: () => g.select(id, { fly: true }) } },
    h('span.wd-swatch', { style: { background: swatchColor(g, id) } }), country(id).name);
}

// Regions section: filled in when the region file arrives (it's fetched on demand).
function regionsSection(g, c) {
  if (!hasRegions(c.id)) return '';
  const body = h('div.wd-chips', h('span.wd-note', 'Loading regions…'));
  const title = h('h3.wd-section-t', 'Regions');
  loadRegions(c.id).then((data) => {
    if (!data) return;
    const noun = regionNoun(data);
    title.textContent = `${data.regions.length} ${data.regions.length === 1 ? noun.one : noun.many}`;
    const top = data.regions.slice(0, 8);
    clear(body).append(...top.map((r) => h('button.wd-chip', { type: 'button', title: r.type, on: { click: () => g.focusRegion(c.id, r.id) } }, icon('region', 'sm'), r.name)),
      data.regions.length > top.length ? h('span.wd-note', { style: { alignSelf: 'center' } }, `+${data.regions.length - top.length} more — zoom in to see them all`) : '');
  }).catch(() => { clear(body).append(h('span.wd-note', 'Regions couldn’t be loaded.')); });
  return h('section.wd-section', title, body);
}

const dataNote = (c) => h('p.data-note', `Borders: Natural Earth. Starting figures: ${c.sources.population === 'estimate' ? 'rounded mid-2020s estimates' : 'Natural Earth 2019 estimates'}; from there everything is simulated month by month.`);

// ——— Country panel ———
// opts.region: a region the player clicked (shown as context at the top).
export function countryPanel(g, id, opts = {}) {
  const c = country(id), st = g.state, L = live(g, id), v0 = L.view();
  const owner = ownerOf(st, id);
  const subtitle = owner !== id ? `Territory of ${country(owner).name}` : c.government.label;
  const isMe = !!st && id === st.player;
  const kicker = [];
  if (st) { const rel = relation(st, id); kicker.push(h(`span.wd-tag.${rel.key}`, rel.label)); }
  kicker.push(h('span.wd-tag.plain', c.subregion));
  kicker.push(L.styled((v) => (v.growth < 0 ? ['Recession', 'wd-tag bad'] : v.growth > 0.045 ? ['Booming', 'wd-tag good'] : ['', 'wd-tag'])));
  if (opts.region) kicker.push(h('span.wd-tag.info', { title: opts.region.type }, opts.region.name));

  const armed = !!v0.policy;
  const grid = section(null, h('div.wd-stat-grid',
    isMe ? statValue(L, 'Treasury', (v) => (v.treasury >= 0 ? money(v.treasury) : 'Debt ' + money(-v.treasury)), (v) => subLine(money(v.budget.monthly, { sign: true }) + ' / month', v.budget.monthly >= 0 ? 'up' : 'down'))
      : statValue(L, 'Population', (v) => people(v.pop), (v) => subLine(pct(v.popGrowth, { sign: true }) + ' a year')),
    statValue(L, 'Economy (GDP)', (v) => money(v.gdp), (v) => subLine(`${pct(v.growth, { sign: true })} · ${perPerson(v.gdpPerCapita)}`, v.growth < 0 ? 'down' : 'dim')),
    statValue(L, 'Military strength', (v) => (armed ? String(v.military.strength) : '—'), (v) => subLine(v.military.tier)),
    armed
      ? statValue(L, 'Troops', (v) => troops(v.military.troops), (v) => subLine(v.military.reserves >= 1 ? `+${troops(v.military.reserves)} reserves` : c.capital ? 'Capital: ' + c.capital : c.continent))
      : statValue(L, 'Capital', () => c.capital || '—', () => subLine(c.continent))));
  const meters = section(null,
    L.meter('Stability', (v) => v.stability, (v) => stabilityTone(v.stability), (v) => `${Math.round(v.stability)}% ${trendArrow(v.stability, v.stabilityTarget)}`),
    L.meter('Infrastructure', (v) => v.infra, () => 'info'));
  const resources = c.resources.length ? section('Resources', h('div.wd-chips', c.resources.slice(0, 6).map((r) => h('span.wd-tag.plain', RESOURCE_LABELS[r])))) : '';
  const borders = c.neighbors.length ? section('Borders', h('div.wd-chips', c.neighbors.map((x) => countryChip(g, x)))) : section('Borders', h('p.wd-note', 'No land borders.'));
  const base = { key: 'country:' + id, lead: flagImg(c), title: c.name, subtitle, keepScroll: g.drawerKeyIs('right', 'country:' + id), update: L.update };
  const why = section(isMe ? 'What drives your stability' : 'Stability factors', L.nodes((v) => factorList(v.stabilityFactors, (x) => (x > 0 ? '+' : '') + x)));
  const decisions = v0.agent && !isMe ? section('Recent decisions', L.nodes((v) => (v.log.length
    ? h('div.wd-ledger.log', v.log.slice(0, 4).map((e) => h('div', h('span', e.text), h('b', monthShort(e.month - 1)))))
    : h('p.wd-note', 'No policy changes yet. Countries review their budgets every three months.')))) : '';

  // Picking a starting nation: same panel, one primary action.
  if (!st) {
    const can = g.canPlay(id);
    const body = [h('div.wd-chips', kicker), grid, meters, resources, regionsSection(g, c), borders,
      can ? '' : h('p.wd-note', c.territory ? `Territories can’t be led directly. Pick ${country(owner).name}, or any independent country.` : 'This country can’t be played yet.'),
      dataNote(c)];
    L.update();
    return { ...base, body, foot: [h('button.wd-btn.primary.lg.block', { type: 'button', disabled: !can, on: { click: () => g.start(id) } }, icon('crown'), `Lead ${c.name}`)] };
  }

  const mine = ownerOf(st, id) === st.player;
  const body = [h('div.wd-chips', kicker), grid, meters];
  if (isMe) {
    body.push(why, section('Manage', h('div.wd-rows',
      row({ ic: 'economy', title: 'Economy', sub: 'Taxes, development and the budget', onClick: () => g.openTool('economy') }),
      row({ ic: 'military', title: 'Military', sub: 'Budget, recruitment and reserves', onClick: () => g.openTool('military') }))));
  } else {
    const o = opinion(st, owner);
    if (!mine) body.push(section(null, h('div.wd-meter.' + opinionTone(o), h('div.wd-meter-top', h('span', owner === id ? 'Their opinion of you' : `${country(owner).name}’s opinion of you`), h('b', (o > 0 ? '+' : '') + o)), h('div.wd-meter-bar', h('span', { style: { width: (o + 100) / 2 + '%' } })))));
    if (c.territory && !mine) {
      body.push(section('Actions', h('div.wd-rows', row({ ic: 'flag', title: `View ${country(owner).name}`, sub: 'The country that governs this territory', onClick: () => g.select(owner, { fly: true }) }))));
    } else if (!mine) {
      body.push(section('Actions', h('div.wd-rows',
        row({ ic: 'handshake', title: 'Improve relations', sub: `Send an envoy · ${money(g.envoyCost())}`, onClick: () => g.improveRelations(id) }),
        row({ ic: 'trade', title: 'Propose trade deal', end: soonTag(), onClick: () => soon('Trade deals') }),
        row({ ic: 'diplomacy', title: 'Propose alliance', end: soonTag(), onClick: () => soon('Alliances') }))));
    }
    body.push(decisions, why);
  }
  body.push(resources, regionsSection(g, c), borders, dataNote(c));
  L.update();
  const foot = [];
  if (!mine && !c.territory) foot.push(h('button.wd-btn.danger.block', { type: 'button', on: { click: () => g.confirmWar(id) } }, icon('swords'), 'Declare war'));
  return { ...base, body, foot };
}

// ——— Toolbar panels ———
export const TOOLS = [
  { key: 'military', label: 'Military', ic: 'military', hotkey: 'M' },
  { key: 'build', label: 'Build', ic: 'build', hotkey: 'B' },
  { key: 'diplomacy', label: 'Diplomacy', ic: 'diplomacy', hotkey: 'D' },
  { key: 'economy', label: 'Economy', ic: 'economy', hotkey: 'E' },
  { key: 'more', label: 'More', ic: 'more', hotkey: 'O' },
];

// A policy slider: changes go straight into the simulation (g.setPolicy) and every live figure updates as you drag.
function policySlider(g, L, key, { label, hint, step = 1, fmt }) {
  const [min, max] = POLICY_LIMITS[key];
  const val = L.text((v) => fmt(v.policy[key]), 'b');
  const input = h('input', { type: 'range', id: 'policy-' + key, min, max, step, value: L.view().policy[key], 'aria-label': label,
    on: { input: (e) => g.setPolicy(key, +e.target.value) } });
  return h('div.wd-slider', h('div.wd-meter-top', h('span', label), val), input, hint ? h('p.wd-note', hint) : '');
}
// Recruitment level buttons (a segmented control kept in sync as a live item).
function recruitControl(g, L) {
  const btns = RECRUIT_LEVELS.map((name, i) => h('button', { type: 'button', 'aria-pressed': 'false', on: { click: () => g.setPolicy('recruit', i) } }, name));
  const seg = h('div.wd-seg.wide', { role: 'group', 'aria-label': 'Recruitment' }, btns);
  const sync = L.text((v) => { btns.forEach((b, i) => { b.classList.toggle('on', i === v.policy.recruit); b.setAttribute('aria-pressed', String(i === v.policy.recruit)); }); return ''; });
  sync.hidden = true;
  return h('div.wd-slider', h('div.wd-meter-top', h('span', 'Recruitment'), L.text((v) => RECRUIT_LEVELS[v.policy.recruit], 'b')), seg, sync,
    L.text((v) => (v.policy.recruit === 0 ? 'No new recruits. The army shrinks as soldiers retire.'
      : `Aiming for ${troops(v.military.target)} in uniform: +${count(v.military.recruitsPerMonth)} recruits and −${count(v.military.attritionPerMonth)} leaving each month.`), 'p'));
}

export function toolPanel(g, key) {
  const st = g.state, me = country(st.player), L = live(g, st.player);
  const keepScroll = g.drawerKeyIs('left', key);
  const done = (content) => { L.update(); return { key, keepScroll, update: L.update, ...content }; };
  switch (key) {
    case 'economy': return done({
      title: 'Economy', subtitle: `Budget for ${monthLabel(st.month)}`,
      body: [
        section(null, h('div.wd-stat-grid',
          statValue(L, 'Treasury', (v) => (v.treasury >= 0 ? money(v.treasury) : 'Debt ' + money(-v.treasury)), (v) => subLine(v.treasury < 0 ? `${Math.round(v.budget.debtRatio * 100)}% of GDP` : 'Cash reserves', v.treasury < 0 ? 'down' : 'dim')),
          statValue(L, 'Balance', (v) => money(v.budget.monthly, { sign: true }), (v) => subLine('per month', v.budget.monthly >= 0 ? 'up' : 'down')),
          statValue(L, 'GDP', (v) => money(v.gdp), (v) => subLine(`${pct(v.growth, { sign: true })} a year`, v.growth < 0 ? 'down' : 'up')),
          statValue(L, 'Tax collection', (v) => Math.round(v.budget.efficiency * 100) + '%', () => subLine('better with infrastructure')))),
        section('Policy',
          policySlider(g, L, 'tax', { label: 'Tax rate', fmt: (x) => x + '%', hint: 'More income now; slower growth and less stability.' }),
          policySlider(g, L, 'invest', { label: 'Development spending', step: 0.5, fmt: (x) => x + '% of GDP', hint: 'Builds infrastructure: faster growth and better tax collection later.' })),
        section('Monthly budget', L.nodes((v) => [
          h('div.wd-ledger', h('div.head', h('span', 'Income'), h('b', money(v.budget.incomeTotal / 12) + ' /mo')), ledger(v.budget.income)),
          h('div.wd-ledger', h('div.head', h('span', 'Expenses'), h('b', money(v.budget.expenseTotal / 12) + ' /mo')), ledger(v.budget.expenses)),
        ])),
        section('What drives growth', L.nodes((v) => factorList(v.growthFactors, (x) => pct(x, { sign: true }), 7))),
        h('p.wd-note', 'Military spending is set in the Military panel.'),
      ],
    });
    case 'military': return done({
      title: 'Military', subtitle: L.text((v) => `${v.military.tier} · strength ${v.military.strength} of 100`),
      body: [
        section(null, h('div.wd-stat-grid',
          statValue(L, 'Active troops', (v) => troops(v.military.troops), (v) => { const d = v.military.recruitsPerMonth - v.military.attritionPerMonth; return subLine(`${d >= 0 ? '+' : '−'}${count(Math.abs(d))} / month`, d >= 0 ? 'up' : 'down'); }),
          statValue(L, 'Reserves', (v) => troops(v.military.reserves), () => subLine('cheaper, weaker')),
          statValue(L, 'Strength', (v) => String(v.military.strength), (v) => subLine(v.military.tier)),
          statValue(L, 'Readiness', (v) => Math.round(v.military.readiness * 100) + '%', (v) => subLine(v.military.readiness < 1 ? 'Underfunded' : 'Fully paid', v.military.readiness < 1 ? 'down' : 'dim')))),
        section('Policy',
          policySlider(g, L, 'military', { label: 'Military budget', step: 0.1, fmt: (x) => x + '% of GDP' }),
          L.text((v) => `${money(v.military.budget)} a year. Soldiers’ pay takes ${money(v.military.upkeep)}; the rest goes on training and equipment.`, 'p'),
          recruitControl(g, L),
          policySlider(g, L, 'reserve', { label: 'Kept in reserve', step: 5, fmt: (x) => x + '%', hint: 'Reserves cost a quarter as much as active troops but count for about a third of the strength.' })),
        section('Details', L.nodes((v) => h('div.wd-ledger',
          h('div', h('span', 'Manpower used'), h('b', `${Math.round(v.military.poolUsed * 100)}% of ${troops(v.military.pool)}`)),
          h('div', h('span', 'Equipment quality'), h('b', Math.round(v.military.quality * 100) + '%')),
          h('div', h('span', 'Willingness to enlist'), h('b', Math.round((0.5 + 0.5 * v.stability / 100) * 100) + '%'))))),
        section('Orders', h('div.wd-rows',
          row({ ic: 'swords', title: 'Move armies', sub: 'Drag units across the map', end: soonTag(), onClick: () => soon('Army movement') }),
          row({ ic: 'barracks', title: 'Garrisons', sub: 'Defend your borders', end: soonTag(), onClick: () => soon('Garrisons') }))),
      ],
    });
    case 'build': return done({
      title: 'Build', subtitle: `Invest in ${me.name}`,
      body: [
        section(null, h('div.wd-stat-grid',
          statValue(L, 'Infrastructure', (v) => Math.round(v.infra) + '%', (v) => subLine(`development ${v.policy.invest}% of GDP`)),
          statValue(L, 'Upkeep', (v) => money(v.budget.expenses.find((x) => x.key === 'upkeep').value / 12) + ' /mo', () => subLine('roads, power, buildings')))),
        section(null, row({ ic: 'economy', title: 'Development spending', sub: 'The way to build infrastructure today', onClick: () => g.openTool('economy') })),
        section('Projects', h('div.wd-rows', [
          ['factory', 'Factory', 'More output, more pollution'], ['road', 'Road network', 'Faster armies and trade'], ['anchor', 'Port', 'Opens sea trade routes'],
          ['school', 'University', 'Faster research'], ['hospital', 'Hospital', 'Healthier, happier people'], ['barracks', 'Barracks', 'Cheaper recruitment'],
        ].map(([ic, t, s]) => row({ ic, title: t, sub: s, end: soonTag(), onClick: () => soon('Individual projects') })))),
      ],
    });
    case 'diplomacy': {
      const ids = [...me.neighbors].filter((id) => !country(id).territory).sort((a, b) => opinion(st, b) - opinion(st, a));
      const relRow = (id) => {
        const n = country(id), r = relation(st, id), o = opinion(st, id), v = g.view(id);
        return row({ ic: 'flag', title: n.name, sub: `${r.label} · strength ${v.military.strength}`, end: (o > 0 ? '+' : '') + o, onClick: () => g.select(id, { fly: true }) });
      };
      return done({
        title: 'Diplomacy', subtitle: 'How the world sees you',
        body: [
          section(null, h('div.wd-stat-grid', statValue(L, 'Alliances', () => 'None'), statValue(L, 'Wars', () => 'None'))),
          ids.length ? section('Neighbours', h('div.wd-rows', ids.map(relRow))) : section('Neighbours', h('p.wd-note', 'You have no land neighbours.')),
          h('p.wd-note', 'Tip: click any country on the map to see its decisions and negotiate with it.'),
        ],
      });
    }
    default: return done({
      title: 'More', subtitle: 'Game options',
      body: [
        section('Game', h('div.wd-rows',
          row({ ic: 'save', title: 'Save game', sub: g.savedLabel(), onClick: () => g.save(true) }),
          row({ ic: 'refresh', title: 'New game', sub: 'Choose a different nation', onClick: () => g.confirmNewGame() }),
          row({ ic: 'megaphone', title: 'Preview an event', sub: 'Shows a protest event window', onClick: () => g.triggerSampleEvent() }))),
        section('Help', h('div.wd-rows',
          row({ ic: 'book', title: 'How to play', onClick: () => g.showHelp() }),
          row({ ic: 'keyboard', title: 'Keyboard shortcuts', onClick: () => g.showKeys() }),
          row({ ic: 'palette', title: 'Design system', sub: 'UI components and colours', onClick: () => { location.href = 'design.html'; } }))),
        h('a.wd-btn.ghost.block', { href: '../play/public/' }, icon('exit'), 'Back to the arcade'),
      ],
    });
  }
}
