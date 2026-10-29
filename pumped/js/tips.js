// Short explanations for trading terms, shown on hover / tap of anything with data-tip="key".

export const TIPS = {
  networth: ['Net worth', 'Your cash plus everything you own at today\'s price (minus any borrowed money). This is your score.'],
  cash: ['Cash', 'Money not invested in anything. It can\'t pump, but it can\'t crash either.'],
  unrealized: ['Unrealized P/L', 'Profit or loss on things you still hold. It only becomes real when you sell.'],
  realized: ['Realized P/L', 'Profit or loss locked in by selling, after fees.'],
  sentiment: ['Sentiment', 'A fear & greed reading of the whole market, from recent moves, hype and market events. Extreme greed often comes before a drop.'],
  hype: ['Hype', 'How much attention an asset is getting. More hype means more and bigger pumps, but above 80 it is overheated: crashes and rug pulls get much more likely.'],
  leverage: ['Leverage', 'Trading with borrowed money. 5× means a 1% move becomes 5% on your stake, both ways. Lose too much and the position is liquidated.'],
  open: ['Open', 'The price when this run started.'],
  volatility: ['Volatility', 'How wildly the price normally swings. Extreme assets can double or halve in a minute.'],
  avg: ['Average price', 'What you paid per unit on average, across all your buys of this asset.'],
  liq: ['Liquidation price', 'If the price touches this, your leveraged position is force-sold and your stake is gone.'],
  fee: ['Trading fee', '0.1% of the value of every trade, on the full leveraged size.'],
};

export function bindTips(tipEl, enabled) {
  let cur = null;
  const show = el => {
    const t = TIPS[el.dataset.tip];
    if (!t || !enabled()) return;
    cur = el;
    tipEl.replaceChildren(Object.assign(document.createElement('b'), { textContent: t[0] }), document.createTextNode(t[1]));
    tipEl.hidden = false;
    const r = el.getBoundingClientRect(), w = tipEl.offsetWidth, hgt = tipEl.offsetHeight;
    const x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2));
    const y = r.bottom + 8 + hgt > innerHeight ? r.top - hgt - 8 : r.bottom + 8;
    tipEl.style.left = `${x}px`; tipEl.style.top = `${y}px`;
  };
  const hide = () => { cur = null; tipEl.hidden = true; };
  document.addEventListener('mouseover', e => { const el = e.target.closest('[data-tip]'); if (el && el !== cur) show(el); else if (!el && cur) hide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest('[data-tip]'); if (el) show(el); });
  document.addEventListener('click', e => { const el = e.target.closest('[data-tip]'); if (el && el !== cur) show(el); else if (!el || el === cur) hide(); }, true);
  addEventListener('scroll', hide, true);
}
