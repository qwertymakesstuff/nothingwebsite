// The prestige screen: what a new empire would give right now, what resets and what stays,
// a two-step confirmation, and the legacy shop where seals are spent.
import { formatNumber, formatGoal } from './numberFormatter.js';
import { LEGACY_UPGRADES, SEAL_BONUS, SEAL_BASE, legacyLevel } from './legacy.js';
import { RESETS, KEEPS, pendingSeals, nextSeal, canPrestige, prestige, legacyCost, buyLegacy, allTimeEarned } from './prestige.js';

const pct = sealsBig => `+${formatNumber(sealsBig.mul(SEAL_BONUS * 100))}%`;

export function createPrestigeView(state, { onPrestige, onLegacyBuy }) {
  const $ = id => document.getElementById(id);
  const dialog = $('prestigeDialog');
  const els = {
    badge: $('prestigePending'), available: $('sealsAvailable'), earned: $('sealsEarned'), bonus: $('sealsBonus'),
    gain: $('sealsGain'), after: $('sealsAfter'), nextText: $('nextSealText'), nextBar: $('nextSealBar'),
    go: $('prestigeGo'), reason: $('prestigeReason'), confirm: $('prestigeConfirm'), main: $('prestigeMain'),
    confirmText: $('prestigeConfirmText'), shop: $('legacyShop'),
  };
  $('prestigeResets').replaceChildren(...RESETS.map(t => Object.assign(document.createElement('li'), { textContent: t })));
  $('prestigeKeeps').replaceChildren(...KEEPS.map(t => Object.assign(document.createElement('li'), { textContent: t })));

  const cards = LEGACY_UPGRADES.map(def => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'legacy-card';
    el.innerHTML = '<span class="legacy-top"><strong></strong><span class="legacy-level"></span></span><span class="legacy-desc"></span><span class="legacy-cost"></span>';
    el.querySelector('strong').textContent = def.name;
    el.querySelector('.legacy-desc').textContent = def.description;
    el.addEventListener('click', () => {
      if (buyLegacy(state, def.id)) { onLegacyBuy(def); el.classList.remove('bought'); void el.offsetWidth; el.classList.add('bought'); }
      else { el.classList.remove('denied'); void el.offsetWidth; el.classList.add('denied'); }
      render();
    });
    el.addEventListener('animationend', () => el.classList.remove('bought', 'denied'));
    els.shop.appendChild(el);
    return { def, el, level: el.querySelector('.legacy-level'), cost: el.querySelector('.legacy-cost') };
  });

  function showConfirm(on) {
    els.confirm.hidden = !on;
    els.main.hidden = on;
  }

  function renderBadge() {
    const gain = pendingSeals(state);
    const text = gain.sign() > 0 ? `+${formatNumber(gain)}` : '';
    if (els.badge.textContent !== text) els.badge.textContent = text;
  }

  function render() {
    renderBadge();
    if (!dialog.open) return;
    const L = state.legacy, gain = pendingSeals(state), next = nextSeal(state);
    els.available.textContent = formatNumber(L.seals);
    els.earned.textContent = formatNumber(L.sealsEarned);
    els.bonus.textContent = `${pct(L.sealsEarned)} production`;
    els.gain.textContent = `+${formatNumber(gain)}`;
    const after = L.sealsEarned.add(gain);
    els.after.textContent = gain.sign() > 0
      ? `After founding: ${formatNumber(after)} seals earned in total, production bonus ${pct(after)} (now ${pct(L.sealsEarned)}).`
      : 'No seals to gain yet.';
    els.nextText.textContent = `Seal number ${formatNumber(next.total)} after ${formatGoal(next.needed.ceil())} more crowns earned (all empires together).`;
    els.nextBar.style.width = `${Math.floor(next.progress * 100)}%`;
    const ok = canPrestige(state);
    els.go.disabled = !ok;
    els.reason.textContent = ok ? ''
      : L.sealsEarned.sign() > 0 ? 'Earn more crowns to be owed at least one new seal.'
      : `Your first seal comes at ${formatGoal(SEAL_BASE)} crowns earned in total (you have ${formatNumber(allTimeEarned(state).floor())}).`;
    els.confirmText.textContent = `Found a new empire for +${formatNumber(gain)} Imperial Seal${gain.eq(1) ? '' : 's'}? Everything in "Resets" goes back to the start.`;
    for (const c of cards) {
      const level = legacyLevel(L, c.def.id), cost = legacyCost(state, c.def.id);
      c.level.textContent = c.def.maxLevel > 1 ? `Lv ${level}/${c.def.maxLevel}` : level ? 'Owned' : '';
      c.cost.textContent = cost ? `${formatNumber(cost)} seal${cost.eq(1) ? '' : 's'}` : 'Maxed';
      const affordable = !!cost && L.seals.gte(cost);
      c.el.classList.toggle('affordable', affordable);
      c.el.classList.toggle('maxed', !cost);
      c.el.setAttribute('aria-disabled', String(!affordable));
    }
  }

  $('prestigeBtn').addEventListener('click', () => { showConfirm(false); if (!dialog.open) dialog.showModal(); render(); });
  $('prestigeClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  els.go.addEventListener('click', () => { if (canPrestige(state)) { showConfirm(true); $('prestigeYes').focus(); } });
  $('prestigeNo').addEventListener('click', () => showConfirm(false));
  $('prestigeYes').addEventListener('click', () => {
    const result = prestige(state);
    showConfirm(false);
    if (result) { dialog.close(); onPrestige(result); }
    render();
  });

  return { render, renderBadge };
}
