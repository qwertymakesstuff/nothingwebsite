// What goes inside the drawers. Each builder returns { key, lead, title, subtitle, body, foot } for Drawer.show().
// Rows tagged "Soon" are placeholders for systems that arrive in later checkpoints; they say so instead of pretending.
import { h, clear } from './dom.js';
import { icon } from './icons.js';
import { toast } from './overlays.js';
import { flagImg } from './flags.js';
import { opinion, relation, budget, taxMood } from '../core/state.js';
import { country, ownerOf, stabilityOf, troopsOf } from '../core/db.js';
import { loadRegions, hasRegions, regionNoun } from '../core/regions.js';
import { RESOURCE_LABELS } from '../data/nations.js';
import { money, people, troops, monthLabel } from '../core/format.js';

// Political colour of a country (its owner's tint; gold for the player's).
export function swatchColor(g, id) {
  const owner = ownerOf(g.state, id);
  if (g.state && owner === g.state.player) return 'var(--land-player)';
  return `var(--land-${country(owner)?.tint ?? 0})`;
}
const stat = (label, value, delta) => h('div.wd-stat', h('span.wd-stat-l', label), h('span.wd-stat-v', value), delta || '');
const sub = (text, cls = '') => h('span.wd-stat-d' + cls, { style: { color: cls ? '' : 'var(--text-dim)' } }, text);
const meter = (label, value, tone, shown = Math.round(value) + '%') =>
  h(`div.wd-meter.${tone}`, h('div.wd-meter-top', h('span', label), h('b', shown)), h('div.wd-meter-bar', h('span', { style: { width: Math.max(0, Math.min(100, value)) + '%' } })));
const section = (title, ...kids) => h('section.wd-section', title ? h('h3.wd-section-t', title) : '', ...kids);
const soonTag = () => h('span.wd-tag.plain', 'Soon');
function row({ ic, title, sub: s, end, onClick }) {
  return h('button.wd-row', { type: 'button', on: { click: onClick } },
    h('span.wd-row-ic', icon(ic)), h('span.wd-row-main', h('span.wd-row-t', title), s ? h('span.wd-row-s', s) : ''), end ? h('span.wd-row-end', end) : '');
}
export const soon = (what) => toast(`<b>${what}</b> arrives with the simulation in a later checkpoint.`, { icon: 'sparkle', tone: 'gold', ms: 3200 });
const stabilityTone = (v) => (v >= 60 ? 'good' : v >= 35 ? 'warn' : 'bad');
const opinionTone = (o) => (o >= 10 ? 'good' : o > -20 ? 'info' : o > -45 ? 'warn' : 'bad');
const perPerson = (c) => (c.gdpPerCapita >= 1000 ? '$' + Math.round(c.gdpPerCapita / 100) / 10 + 'K' : '$' + c.gdpPerCapita) + ' per person';

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

function dataNote(c) {
  const est = c.sources.population === 'estimate';
  return h('p.data-note', `Borders: Natural Earth. ${est ? 'Population, economy and military: rounded real-world estimates (mid-2020s).' : 'Population and economy: Natural Earth 2019 estimates.'} Stability and strength are game values.`);
}

// ——— Country panel ———
// opts.region: a region the player clicked (shown as context at the top).
export function countryPanel(g, id, opts = {}) {
  const c = country(id), st = g.state;
  const owner = ownerOf(st, id);
  const subtitle = owner !== id ? `Territory of ${country(owner).name}` : c.government.label;
  const lead = flagImg(c);
  const stab = stabilityOf(st, id), tr = troopsOf(st, id);
  const kicker = [];
  if (st) { const rel = relation(st, id); kicker.push(h(`span.wd-tag.${rel.key}`, rel.label)); }
  kicker.push(h('span.wd-tag.plain', c.subregion));
  if (opts.region) kicker.push(h('span.wd-tag.info', { title: opts.region.type }, opts.region.name));
  const grid = section(null, h('div.wd-stat-grid',
    stat('Population', people(c.population), sub(Math.round(c.areaKm2).toLocaleString('en') + ' km²')),
    stat('Economy (GDP)', money(c.gdp), sub(perPerson(c))),
    stat('Military', troops(tr), sub(c.military.tier)),
    stat('Capital', c.capital || '—', sub(c.continent))));
  const resources = c.resources.length ? section('Resources', h('div.wd-chips', c.resources.slice(0, 6).map((r) => h('span.wd-tag.plain', RESOURCE_LABELS[r])))) : '';
  const borders = c.neighbors.length
    ? section('Borders', h('div.wd-chips', c.neighbors.map((x) => countryChip(g, x))))
    : section('Borders', h('p.wd-note', 'No land borders.'));
  const base = { key: 'country:' + id, lead, title: c.name, subtitle, keepScroll: g.drawerKeyIs('right', 'country:' + id) };

  // Picking a starting nation: same panel, one primary action.
  if (!st) {
    const can = g.canPlay(id);
    return {
      ...base,
      body: [h('div.wd-chips', kicker), grid, section(null, meter('Stability', stab, stabilityTone(stab))), regionsSection(g, c), borders,
        can ? '' : h('p.wd-note', c.territory ? `Territories can’t be led directly. Pick ${country(owner).name}, or any independent country.` : 'This country can’t be played yet.'),
        dataNote(c)],
      foot: [h('button.wd-btn.primary.lg.block', { type: 'button', disabled: !can, on: { click: () => g.start(id) } }, icon('crown'), `Lead ${c.name}`)],
    };
  }

  const mine = owner === st.player;
  const body = [h('div.wd-chips', kicker)];
  if (id === st.player) {
    const b = budget(st);
    body.push(
      section(null, h('div.wd-stat-grid',
        stat('Treasury', money(st.treasury), h(`span.wd-stat-d.${b.balance >= 0 ? 'up' : 'down'}`, money(b.balance, { sign: true }) + ' / month')),
        stat('Population', people(c.population)), stat('Economy (GDP)', money(c.gdp), sub(perPerson(c))), stat('Military', troops(st.army), sub(c.military.tier)))),
      section(null, meter('Stability', st.stability, stabilityTone(st.stability)), meter('Infrastructure', c.infrastructure, 'info')),
      section('Manage', h('div.wd-rows',
        row({ ic: 'economy', title: 'Economy', sub: 'Taxes and the monthly budget', onClick: () => g.openTool('economy') }),
        row({ ic: 'build', title: 'Build', sub: 'Infrastructure and industry', onClick: () => g.openTool('build') }),
        row({ ic: 'military', title: 'Military', sub: 'Armies and defence', onClick: () => g.openTool('military') }))),
    );
  } else {
    const o = opinion(st, owner);
    body.push(grid, section(null, meter('Stability', stab, stabilityTone(stab)),
      mine ? '' : meter(owner === id ? 'Their opinion of you' : `${country(owner).name}’s opinion of you`, (o + 100) / 2, opinionTone(o), (o > 0 ? '+' : '') + o)));
    if (c.territory && !mine) {
      body.push(section('Actions', h('div.wd-rows', row({ ic: 'flag', title: `View ${country(owner).name}`, sub: 'The country that governs this territory', onClick: () => g.select(owner, { fly: true }) }))));
    } else if (!mine) {
      body.push(section('Actions', h('div.wd-rows',
        row({ ic: 'handshake', title: 'Improve relations', sub: `Send an envoy · ${money(g.envoyCost())}`, onClick: () => g.improveRelations(id) }),
        row({ ic: 'trade', title: 'Propose trade deal', end: soonTag(), onClick: () => soon('Trade deals') }),
        row({ ic: 'diplomacy', title: 'Propose alliance', end: soonTag(), onClick: () => soon('Alliances') }),
      )));
    }
  }
  body.push(resources, regionsSection(g, c), borders, dataNote(c));

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

export function toolPanel(g, key) {
  const st = g.state, me = country(st.player);
  const keepScroll = g.drawerKeyIs('left', key);
  switch (key) {
    case 'military': return {
      key, keepScroll, title: 'Military', subtitle: 'Your armed forces at a glance',
      body: [
        section(null, h('div.wd-stat-grid', stat('Active troops', troops(st.army)), stat('Upkeep', money(st.army * 0.00008) + ' / mo'))),
        section(null, meter('Readiness', 72, 'info')),
        section('Orders', h('div.wd-rows',
          row({ ic: 'people', title: 'Recruit troops', sub: 'Raise new divisions', end: soonTag(), onClick: () => soon('Recruitment') }),
          row({ ic: 'swords', title: 'Move armies', sub: 'Drag units across the map', end: soonTag(), onClick: () => soon('Army movement') }),
          row({ ic: 'barracks', title: 'Garrisons', sub: 'Defend your borders', end: soonTag(), onClick: () => soon('Garrisons') }))),
        h('p.wd-note', 'To declare war, click a country on the map.'),
      ],
    };
    case 'build': {
      const items = [
        ['factory', 'Factory', 'More output, more pollution', 4], ['road', 'Road network', 'Faster armies and trade', 2],
        ['anchor', 'Port', 'Opens sea trade routes', 5], ['school', 'University', 'Faster research', 6],
        ['hospital', 'Hospital', 'Healthier, happier people', 3], ['barracks', 'Barracks', 'Cheaper recruitment', 3],
      ];
      const scale = Math.max(0.2, me.gdp * 0.002);
      return {
        key, keepScroll, title: 'Build', subtitle: `Invest in ${me.name}`,
        body: [section('Projects', h('div.wd-rows', items.map(([ic, t, s, c]) => row({ ic, title: t, sub: s, end: money(c * scale), onClick: () => soon('Construction') })))),
          h('p.wd-note', 'Projects will be placed on the map in provinces you control.')],
      };
    }
    case 'diplomacy': {
      const ids = [...me.neighbors].filter((id) => !country(id).territory).sort((a, b) => opinion(st, b) - opinion(st, a));
      const relRow = (id) => { const n = country(id), r = relation(st, id), o = opinion(st, id);
        return row({ ic: 'flag', title: n.name, sub: r.label, end: (o > 0 ? '+' : '') + o, onClick: () => g.select(id, { fly: true }) }); };
      return {
        key, keepScroll, title: 'Diplomacy', subtitle: 'How the world sees you',
        body: [
          section(null, h('div.wd-stat-grid', stat('Alliances', 'None'), stat('Wars', 'None'))),
          ids.length ? section('Neighbours', h('div.wd-rows', ids.map(relRow))) : section('Neighbours', h('p.wd-note', 'You have no land neighbours.')),
          h('p.wd-note', 'Tip: click any country on the map to negotiate with it.'),
        ],
      };
    }
    case 'economy': {
      const b = budget(st), mood = taxMood(st.taxRate);
      const moodText = (m) => (m === 0 ? 'Stability: no change per month.' : `Stability: ${m > 0 ? '+' : '−'}${Math.abs(m)} per month.`);
      // While dragging, only patch the live labels (re-rendering would drop the slider mid-drag); redraw on release.
      const slider = h('input', { type: 'range', min: 10, max: 60, step: 1, value: st.taxRate, 'aria-label': 'Tax rate',
        on: {
          input: (e) => {
            g.setTax(+e.target.value, false);
            const nb = budget(st);
            rateEl.textContent = st.taxRate + '%'; moodEl.textContent = moodText(taxMood(st.taxRate));
            incomeEl.textContent = money(nb.income); balanceEl.textContent = money(nb.balance, { sign: true });
            balanceD.className = 'wd-stat-d ' + (nb.balance >= 0 ? 'up' : 'down');
          },
          change: (e) => g.setTax(+e.target.value, true),
        } });
      const rateEl = h('b', st.taxRate + '%'), moodEl = h('p.wd-note', moodText(mood));
      const balanceD = h(`span.wd-stat-d.${b.balance >= 0 ? 'up' : 'down'}`, 'per month');
      const balanceStat = stat('Balance', money(b.balance, { sign: true }), balanceD), incomeStat = stat('Income', money(b.income));
      const balanceEl = balanceStat.children[1], incomeEl = incomeStat.children[1];
      return {
        key, keepScroll, title: 'Economy', subtitle: `Budget for ${monthLabel(st.day)}`,
        body: [
          section(null, h('div.wd-stat-grid',
            stat('Treasury', money(st.treasury)),
            balanceStat, incomeStat, stat('Expenses', money(b.expenses)))),
          section('Tax rate', h('div.wd-slider', h('div.wd-meter-top', h('span', 'Low taxes keep people happy'), rateEl), slider, moodEl)),
          section('Policies', h('div.wd-rows',
            row({ ic: 'coins', title: 'Trade policy', end: soonTag(), onClick: () => soon('Trade policy') }),
            row({ ic: 'bolt', title: 'Industry focus', end: soonTag(), onClick: () => soon('Industry focus') }))),
        ],
      };
    }
    default: return {
      key: 'more', keepScroll, title: 'More', subtitle: 'Game options',
      body: [
        section('Game', h('div.wd-rows',
          row({ ic: 'save', title: 'Save game', sub: g.savedLabel(), onClick: () => g.save(true) }),
          row({ ic: 'refresh', title: 'New game', sub: 'Choose a different nation', onClick: () => g.confirmNewGame() }),
          row({ ic: 'megaphone', title: 'Preview an event', sub: 'Shows the sample event window', onClick: () => g.triggerSampleEvent() }))),
        section('Help', h('div.wd-rows',
          row({ ic: 'book', title: 'How to play', onClick: () => g.showHelp() }),
          row({ ic: 'keyboard', title: 'Keyboard shortcuts', onClick: () => g.showKeys() }),
          row({ ic: 'palette', title: 'Design system', sub: 'UI components and colours', onClick: () => { location.href = 'design.html'; } }))),
        h('a.wd-btn.ghost.block', { href: '../play/public/' }, icon('exit'), 'Back to the arcade'),
      ],
    };
  }
}
