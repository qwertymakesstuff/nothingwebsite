import { ACHIEVEMENTS, DESIGN_BY_ID, PLATE_DESIGNS, RARITIES, RARITY_BY_ID, UPGRADE_CONFIG } from './config.js';
import { rollPlate } from './generation.js';
import { loadSave, saveGame, newSave } from './save.js';
import { buyUpgrade, claimDaily, collectPending, collectionValue, recordSpin, sellPlate, toggleFavorite } from './progression.js';
import { escapeHtml, plateMarkup } from './plate.js';

const app = document.getElementById('app');
const toasts = document.getElementById('toasts');
const tabs = [['spin','Spin'],['collection','Collection'],['shop','Shop'],['statistics','Statistics'],['achievements','Achievements'],['settings','Settings']];
let state = loadSave();
let activeTab = 'spin';
let spinCount = 1;
let spinning = false;
let searchText = '';
let rarityFilter = 'all';
let regionFilter = 'all';
let sortBy = 'recent';
let sessionStarted = Date.now();

function money(value) { return Math.floor(value||0).toLocaleString(); }
function bestRarity() { return RARITIES[state.stats.highestRarity] || RARITIES[0]; }
function rarityOf(plate) { return RARITY_BY_ID[plate?.rarity] || RARITIES[0]; }
function designOf(plate) { return DESIGN_BY_ID[plate?.designId] || DESIGN_BY_ID['ma-beacon']; }
function dateText(value) { return value ? new Date(value).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—'; }
function duration(ms) { const seconds=Math.floor(ms/1000); return `${Math.floor(seconds/3600)}h ${Math.floor(seconds%3600/60)}m`; }
function unlockedIds() { return Object.keys(state.achievements); }

function toast(title, detail='') {
  const node=document.createElement('div'); node.className='toast';
  node.innerHTML=`<strong>${escapeHtml(title)}</strong>${escapeHtml(detail)}`;
  toasts.append(node); setTimeout(()=>node.remove(),4200);
}

function notifyAchievements(before) {
  for (const achievement of ACHIEVEMENTS) if (!before.includes(achievement.id) && state.achievements[achievement.id]) toast(`Achievement · ${achievement.name}`,`+${money(achievement.reward)} coins`);
}

function persist() { saveGame(state); }

function renderShell() {
  const best=state.stats.rarestRegistration;
  const tabsHtml=tabs.map(([id,label])=>`<button class="ph-tab" data-action="tab" data-tab="${id}" aria-current="${activeTab===id?'page':'false'}">${label}</button>`).join('');
  app.innerHTML=`<header class="ph-mast"><div class="ph-brand"><span class="ph-mark" aria-hidden="true">PH</span><div><p class="ph-kicker">Regional Registration Archive</p><h1 class="ph-title">PLATE HUNTER</h1><p class="ph-location">A long road. A lot of plates. One rare combination.</p></div></div><div class="ph-currency"><div class="currency-chip">Available spins<strong>${money(state.spins)}</strong></div><div class="currency-chip">Collector coins<strong>◈ ${money(state.coins)}</strong></div></div></header>
    <nav class="ph-tabs" aria-label="Game sections">${tabsHtml}</nav><section class="ph-page" id="page">${renderPage()}</section>`;
}

function renderPage() {
  switch(activeTab){case'collection':return renderCollection();case'shop':return renderShop();case'statistics':return renderStatistics();case'achievements':return renderAchievements();case'settings':return renderSettings();default:return renderSpin();}
}

function renderSpin() {
  const current=state.pending.at(-1)||state.lastPlate||null;
  const reveal=current?`<div class="reveal-line"><span>Current find</span><strong style="--rarity:${rarityOf(current).color}">${escapeHtml(rarityOf(current).name)}${current.special?` · ${escapeHtml(current.special)}`:''}</strong></div>`:'<div class="reveal-line"><span>Fresh plate every roll</span><strong>Roll to reveal its tier</strong></div>';
  const best=state.stats.rarestRegistration;
  const bulkMax=state.upgrades.bulk>=2?10:state.upgrades.bulk>=1?5:1;
  const validCount=Math.min(spinCount,bulkMax);
  const streakEvery=Math.max(25,50-state.upgrades.streak*5);
  const spinsToStreak=streakEvery-(state.streak.count%streakEvery);
  const canClaim=state.daily.lastClaimed!==new Date().toISOString().slice(0,10);
  const pending=state.pending.length;
  const pendingHtml=pending?`<section class="ph-panel pending-row"><div class="pending-copy"><strong>${pending} plate${pending===1?'':'s'} waiting in the tray</strong><span>Take your new finds into the collection, or leave them here while you look around.</span></div><div class="pending-actions"><button class="ph-button" data-action="sell-pending">Sell all for ◈ ${money(state.pending.reduce((s,p)=>s+p.value,0))}</button><button class="ph-button primary" data-action="collect">Collect ${pending} plate${pending===1?'':'s'}</button></div></section><div class="pending-plates">${state.pending.slice(-10).map(p=>`<div class="pending-mini">${plateMarkup(p,{compact:true})}<div class="pending-mini-label"><span>${escapeHtml(p.registration)}</span><span style="color:${rarityOf(p).color}">${escapeHtml(rarityOf(p).name)}</span></div></div>`).join('')}</div>`:'';
  const recent=Object.values(state.collection).sort((a,b)=>b.firstDiscoveredAt-a.firstDiscoveredAt).slice(0,4);
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">On the open road</p><h2>Spin for your next find</h2><p>Every roll has a different regional plate design. Unusual registrations are waiting out there.</p></div><button class="ph-button" data-action="claim-daily" ${canClaim?'':'disabled'}>${canClaim?'Claim daily drop':'Daily drop claimed'}</button></div>
    <div class="spin-layout"><section class="ph-panel spin-stage ${current?`tier-${rarityOf(current).id}`:''} ${spinning?'is-spinning':''}"><div class="stage-top"><span>Serial search · ${state.upgrades.luck?`Luck mod ${Math.round((1+state.upgrades.luck*.075)*100)}%`: 'standard odds'}</span><span>${spinning?'SEARCHING…':current?escapeHtml(current.region):'READY TO ROLL'}</span></div><div class="plate-wrap" id="spin-display">${plateMarkup(current)}</div>${reveal}<div class="spin-controls"><button class="spin-choice" data-action="spin-count" data-count="1" aria-pressed="${spinCount===1}">1×</button><button class="spin-choice" data-action="spin-count" data-count="5" ${bulkMax<5?'disabled':''} aria-pressed="${spinCount===5}">5× ${bulkMax<5?'🔒':''}</button><button class="spin-choice" data-action="spin-count" data-count="10" ${bulkMax<10?'disabled':''} aria-pressed="${spinCount===10}">10× ${bulkMax<10?'🔒':''}</button><button class="spin-button" data-action="spin" ${spinning||state.spins<validCount?'disabled':''}>${spinning?'ROLLING…':state.spins<validCount?'NEED MORE SPINS':`SPIN ${validCount>1?`${validCount}×`:''}`}</button></div><p class="spin-foot">${state.settings.skipAnimation?'Quick reveal enabled':'Slow roll reveal'} · <button data-action="toggle-setting" data-setting="skipAnimation">${state.settings.skipAnimation?'show animation':'skip animation'}</button> · Lucky streak in ${spinsToStreak} spins</p></section>
      <aside class="spin-side"><section class="ph-panel best-card"><h3>Rarest in your binder</h3>${best?`<div class="plate-wrap">${plateMarkup(best,{compact:true})}</div><div class="best-caption"><span>${escapeHtml(best.registration)}</span><span class="rarity-label" style="--rarity:${rarityOf(best).color}">${escapeHtml(rarityOf(best).name)}</span></div>`:'<p class="best-empty">Your rarest find will take pride of place here. The road is wide open.</p>'}</section><div class="quick-stats"><div class="quick-stat"><span>Unique plates</span><strong>${money(Object.keys(state.collection).length)}</strong></div><div class="quick-stat"><span>Spins made</span><strong>${money(state.stats.totalSpins)}</strong></div><div class="quick-stat"><span>Best rarity</span><strong style="color:${bestRarity().color}">${bestRarity().name}</strong></div><div class="quick-stat"><span>Collection value</span><strong>◈ ${money(collectionValue(state))}</strong></div></div><section class="ph-panel best-card"><h3>Active kit</h3><p class="ph-small">Better Luck · level ${state.upgrades.luck}<br>Spin Speed · level ${state.upgrades.speed}<br>Collector Bonus · +${state.upgrades.collector*12}%<br>Next streak reward · ${spinsToStreak} spins</p><button class="ph-button" data-action="tab" data-tab="shop">Visit the supply shop →</button></section></aside></div>
    ${pendingHtml}<section class="recent-section"><div class="section-label"><span>Recently filed</span><button class="ph-button" data-action="tab" data-tab="collection">Open collection →</button></div>${recent.length?`<div class="recent-grid">${recent.map(p=>`<article class="recent-item" data-action="inspect" data-id="${escapeHtml(p.id)}" tabindex="0">${plateMarkup(p,{compact:true})}<strong>${escapeHtml(p.registration)} · ×${p.quantity}</strong><small style="--rarity:${rarityOf(p).color}">${escapeHtml(rarityOf(p).name)}</small></article>`).join('')}</div>`:'<div class="empty-state"><strong>Nothing filed yet</strong>Collect your first roll to start the archive.</div>'}</section>`;
}

function renderCollection() {
  let entries=Object.values(state.collection);
  const regions=[...new Set(PLATE_DESIGNS.map(d=>d.region))].sort();
  if(searchText) entries=entries.filter(p=>`${p.registration} ${p.region} ${p.special||''}`.toLowerCase().includes(searchText.toLowerCase()));
  if(rarityFilter!=='all') entries=entries.filter(p=>p.rarity===rarityFilter);
  if(regionFilter!=='all') entries=entries.filter(p=>p.region===regionFilter);
  const rank=p=>rarityOf(p).rank;
  const sorts={recent:(a,b)=>b.firstDiscoveredAt-a.firstDiscoveredAt,value:(a,b)=>b.value-a.value,rarity:(a,b)=>rank(b)-rank(a)||b.value-a.value,alpha:(a,b)=>a.registration.localeCompare(b.registration),oldest:(a,b)=>a.firstDiscoveredAt-b.firstDiscoveredAt};
  entries.sort(sorts[sortBy]||sorts.recent);
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">Your binder · ${money(Object.keys(state.collection).length)} unique</p><h2>The collection</h2><p>Stack duplicates, pin a favorite and sell the plates you don't want to keep.</p></div><div class="ph-toolbar"><input class="ph-input" data-filter="search" type="search" placeholder="Search registration…" value="${escapeHtml(searchText)}" aria-label="Search collection"><select class="ph-select" data-filter="rarity" aria-label="Filter by rarity"><option value="all">All rarities</option>${RARITIES.map(r=>`<option value="${r.id}" ${rarityFilter===r.id?'selected':''}>${r.name}</option>`).join('')}</select><select class="ph-select" data-filter="region" aria-label="Filter by region"><option value="all">All regions</option>${regions.map(r=>`<option ${regionFilter===r?'selected':''}>${escapeHtml(r)}</option>`).join('')}</select><select class="ph-select" data-filter="sort" aria-label="Sort collection"><option value="recent" ${sortBy==='recent'?'selected':''}>Newest first</option><option value="oldest" ${sortBy==='oldest'?'selected':''}>Oldest first</option><option value="value" ${sortBy==='value'?'selected':''}>Value</option><option value="rarity" ${sortBy==='rarity'?'selected':''}>Rarity</option><option value="alpha" ${sortBy==='alpha'?'selected':''}>A–Z</option></select></div></div>
    ${entries.length?`<div class="collection-grid">${entries.map(collectionCard).join('')}</div>`:'<div class="empty-state"><strong>Nothing in this part of the binder</strong>Spin a plate or adjust your filters to see a find here.</div>'}`;
}

function collectionCard(plate) {
  const r=rarityOf(plate); const favorite=state.favorites.includes(plate.id);
  const sellOne=Math.max(1,Math.floor(plate.value*(1+state.upgrades.collector*.12)));
  return `<article class="ph-panel collection-card"><div class="collection-top"><span class="rarity-label" style="--rarity:${r.color}">${escapeHtml(r.name)}</span><button class="favorite-button ${favorite?'active':''}" title="${favorite?'Unfavorite':'Favorite'}" aria-label="${favorite?'Unfavorite':'Favorite'} plate" data-action="favorite" data-id="${escapeHtml(plate.id)}">${favorite?'★':'☆'}</button></div><div data-action="inspect" data-id="${escapeHtml(plate.id)}" tabindex="0">${plateMarkup(plate,{compact:true})}</div><div class="collection-meta"><span>Region<b>${escapeHtml(plate.region)}</b></span><span>Owned<b>×${money(plate.quantity)}</b></span><span>First found<b>${dateText(plate.firstDiscoveredAt)}</b></span><span>Est. value<b>◈ ${money(plate.value*plate.quantity)}</b></span></div>${plate.special?`<p class="ph-small">✦ ${escapeHtml(plate.special)}</p>`:''}<div class="collection-actions"><button class="ph-button" data-action="inspect" data-id="${escapeHtml(plate.id)}">Inspect</button><button class="ph-button" data-action="sell" data-id="${escapeHtml(plate.id)}" data-amount="1" ${favorite?'disabled':''}>Sell one · ◈${money(sellOne)}</button>${plate.quantity>1?`<button class="ph-button" data-action="sell" data-id="${escapeHtml(plate.id)}" data-amount="${plate.quantity-1}" ${favorite?'disabled':''}>Sell extras</button>`:''}</div></article>`;
}

function renderShop() {
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">Keep the wheels turning</p><h2>Outfitter's shop</h2><p>Small practical improvements. Better odds stay capped, and the hardest finds remain extraordinary.</p></div><div class="currency-chip">Your balance<strong>◈ ${money(state.coins)}</strong></div></div><div class="shop-grid">${Object.entries(UPGRADE_CONFIG).map(([id,u])=>{const level=state.upgrades[id]||0;const cost=u.costs[level];return `<article class="ph-panel upgrade-card"><div class="upgrade-head"><h3>${u.name}</h3><span class="level-pill">LEVEL ${level}${cost==null?' · MAX':''}</span></div><p>${u.description}</p><div class="upgrade-buy"><span>${cost==null?'Fully tuned':`Next · ◈ ${money(cost)}`}</span><button class="ph-button primary" data-action="buy" data-id="${id}" ${cost==null||state.coins<cost?'disabled':''}>${cost==null?'MAX LEVEL':'Purchase'}</button></div></article>`;}).join('')}</div><section class="ph-panel daily-card" style="margin-top:14px"><div><strong>Daily route bonus</strong><p>Check in once a day for coins and spins. Your streak builds to a seven-day reward.</p></div><button class="ph-button" data-action="claim-daily" ${state.daily.lastClaimed===new Date().toISOString().slice(0,10)?'disabled':''}>${state.daily.lastClaimed===new Date().toISOString().slice(0,10)?`Claimed · day ${state.daily.streak}`:'Claim daily reward'}</button></section>`;
}

function renderStatistics() {
  const stats=state.stats, unique=Object.keys(state.collection).length;
  const tiles=[['Total spins',money(stats.totalSpins),'Every completed roll'],['Plates discovered',money(stats.totalDiscovered),'Including unfiled results'],['Unique in binder',money(unique),'Distinct registration + design'],['Duplicate plates',money(stats.duplicates),'Extra copies collected'],['Best rarity',bestRarity().name,'Highest tier discovered'],['Total coins earned',`◈ ${money(stats.coinsEarned)}`,'Daily, sales and milestones'],['Total coins spent',`◈ ${money(stats.coinsSpent)}`,'All upgrade purchases'],['Play time',duration(stats.timePlayed),'On this device'],['Collection value',`◈ ${money(collectionValue(state))}`,'Current binder estimate'],['Collection progress',`${Math.min(100,Math.floor(unique/500*100))}%`,'Against 500 unique goal']];
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">Miles, metals & milestones</p><h2>Field statistics</h2><p>Your collecting log, stored on this device.</p></div></div><div class="stats-grid">${tiles.map(([label,value,sub])=>`<article class="ph-panel stat-tile"><span>${label}</span><strong>${escapeHtml(value)}</strong><small>${sub}</small></article>`).join('')}</div><div class="shop-grid" style="margin-top:14px"><section class="ph-panel best-card"><h3>Rarest registration</h3>${stats.rarestRegistration?plateMarkup(stats.rarestRegistration):'<p class="best-empty">No finds logged yet.</p>'}</section><section class="ph-panel best-card"><h3>Most valuable plate</h3>${stats.mostValuable?`${plateMarkup(stats.mostValuable)}<p class="ph-small">Est. value ◈ ${money(stats.mostValuable.value)}</p>`:'<p class="best-empty">No finds logged yet.</p>'}</section><section class="ph-panel best-card"><h3>Luckiest spin</h3>${stats.luckiestSpin?`${plateMarkup(stats.luckiestSpin)}<p class="ph-small">${escapeHtml(stats.luckiestSpin.odds||'A high rarity roll')}</p>`:'<p class="best-empty">Your luckiest roll will be recorded here.</p>'}</section><div class="future-note"><strong>Global standings</strong><br>This arcade runs without accounts or a shared database. Your stats stay here on this browser; no online ranking is shown.</div></div>`;
}

function renderAchievements() {
  const unlocked=unlockedIds().length;
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">Milestones on the map</p><h2>Achievements</h2><p>${unlocked} of ${ACHIEVEMENTS.length} badges earned. Rewards are added automatically when a milestone is reached.</p></div></div><div class="achievements-grid">${ACHIEVEMENTS.map(a=>{const done=!!state.achievements[a.id];return `<article class="ph-panel achievement-card ${done?'unlocked':''}"><h3>${a.name}${done?'<span class="achieved"> ✓</span>':''}</h3><p>${a.description}</p><small>◈ ${money(a.reward)} coins · ${done?`earned ${dateText(state.achievements[a.id])}`:'not yet earned'}</small></article>`}).join('')}</div>`;
}

function renderSettings() {
  const localToday=new Date().toISOString().slice(0,10);
  return `<div class="ph-page-head"><div><p class="ph-eyebrow">Your route, your rules</p><h2>Settings & daily route</h2><p>Settings and save data belong only to PLATE HUNTER.</p></div></div><section class="settings-list"><div class="ph-panel setting-row"><div><strong>Skip spin animation</strong><small>Rolls resolve quickly while keeping the result reveal.</small></div><button class="toggle" role="switch" aria-checked="${state.settings.skipAnimation}" data-action="toggle-setting" data-setting="skipAnimation" aria-label="Skip spin animation"></button></div><div class="ph-panel setting-row"><div><strong>Reveal sounds</strong><small>Uses short synthesized chimes; no sound files are downloaded.</small></div><button class="toggle" role="switch" aria-checked="${state.settings.sound}" data-action="toggle-setting" data-setting="sound" aria-label="Reveal sounds"></button></div><section class="ph-panel daily-card"><div><strong>Daily check-in · streak ${state.daily.streak} day${state.daily.streak===1?'':'s'}</strong><p>Daily claim status is stored with your local save.</p></div><button class="ph-button primary" data-action="claim-daily" ${state.daily.lastClaimed===localToday?'disabled':''}>${state.daily.lastClaimed===localToday?'Already claimed today':'Claim reward'}</button></section><div class="future-note">Your game uses a versioned localStorage save. No account, server, or other game's save data is touched. To use the same binder on another device, browser export/import would need to be added later.</div><section class="ph-panel settings-danger"><div class="setting-row" style="padding:0"><div><strong>Start a new collection</strong><small>Removes only this browser's PLATE HUNTER save.</small></div><button class="ph-button danger" data-action="reset">Reset game</button></div></section></section>`;
}

function render(){renderShell();}

function playChime(rank=0){
  if(!state.settings.sound)return;
  try{const ctx=new AudioContext();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type='sine';osc.frequency.value=rank>=5?660:rank>=3?520:390;gain.gain.setValueAtTime(.07,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+(rank>=5?.9:.35));osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+(rank>=5?.9:.35));osc.onended=()=>ctx.close();}catch{}
}

function rareFlash(){const node=document.createElement('div');node.className='rare-flash';document.body.append(node);setTimeout(()=>node.remove(),900);}

function runSpin(count) {
  if(spinning||state.spins<count)return;
  const before=unlockedIds();
  const recentIds=state.pending.map(p=>p.id);
  const plates=Array.from({length:count},()=>rollPlate({luckLevel:state.upgrades.luck,recentIds}));
  const milestones=recordSpin(state,plates);
  notifyAchievements(before);
  if(milestones) toast('Lucky streak',`You earned ${milestones} bonus spin${milestones===1?'':'s'}.`);
  persist();
  spinning=true;render();
  const finalPlate=plates.at(-1);const finalRank=rarityOf(finalPlate).rank;
  const speed=Math.max(520,2200-state.upgrades.speed*145);
  const durationMs=state.settings.skipAnimation?100:Math.min(3900,speed+(count-1)*160);
  const start=Date.now();
  function cycle(){
    const node=document.querySelector('#spin-display .registration');
    if(node){const len=finalPlate.registration.length;const chars='ABCDEFGHJKLMNPRSTUVWXYZ0123456789';node.textContent=Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join('');}
    const wrap=document.getElementById('spin-display');if(wrap)wrap.style.transform=`rotate(${Math.random()*2-1}deg) scale(${.985+Math.random()*.03})`;
    const elapsed=Date.now()-start;
    if(elapsed>=durationMs){spinning=false;render();document.querySelector('#spin-display')?.classList.add(`rarity-pulse`,`rarity-${rarityOf(finalPlate).id}`);playChime(finalRank);if(finalRank>=5)rareFlash();toast(`${rarityOf(finalPlate).name} find`,`${finalPlate.registration} · ${finalPlate.region}${finalPlate.special?` · ${finalPlate.special}`:''}`);return;}
    const progress=elapsed/durationMs;
    setTimeout(cycle,state.settings.skipAnimation?34:48+Math.round(progress*progress*270));
  }
  cycle();
}

function handleAction(target) {
  const action=target.dataset.action;
  if(action==='tab'){activeTab=target.dataset.tab;render();window.scrollTo({top:0,behavior:'smooth'});return;}
  if(action==='spin-count'){const allowed=state.upgrades.bulk>=2?[1,5,10]:state.upgrades.bulk>=1?[1,5]:[1];const count=Number(target.dataset.count);if(allowed.includes(count)){spinCount=count;render();}return;}
  if(action==='spin'){runSpin(Math.min(spinCount,state.upgrades.bulk>=2?10:state.upgrades.bulk>=1?5:1));return;}
  if(action==='collect'){const before=unlockedIds();const result=collectPending(state);persist();render();toast('Filed in your binder',`${result.unique} new · ${result.duplicates} duplicate${result.duplicates===1?'':'s'}`);notifyAchievements(before);return;}
  if(action==='sell-pending'){const value=state.pending.reduce((s,p)=>s+p.value,0);const amount=state.pending.length;state.coins+=value;state.stats.coinsEarned+=value;state.pending=[];persist();render();toast('Plates sold',`${amount} plate${amount===1?'':'s'} · ◈ ${money(value)}`);return;}
  if(action==='claim-daily'){const reward=claimDaily(state);if(!reward){toast('Already claimed','Come back tomorrow for another daily drop.');return;}persist();render();toast(`Daily drop · day ${reward.streak}`,`+${reward.spins} spins · ◈ ${money(reward.coins)}`);return;}
  if(action==='buy'){const result=buyUpgrade(state,target.dataset.id);if(!result.ok)return;persist();render();toast('Upgrade installed',`${UPGRADE_CONFIG[target.dataset.id].name} · level ${result.level}`);return;}
  if(action==='favorite'){toggleFavorite(state,target.dataset.id);persist();render();return;}
  if(action==='sell'){const amount=Number(target.dataset.amount||1);const coins=sellPlate(state,target.dataset.id,amount);if(!coins)return;persist();render();toast('Sale recorded',`+◈ ${money(coins)}`);return;}
  if(action==='toggle-setting'){const key=target.dataset.setting;state.settings[key]=!state.settings[key];persist();render();toast(key==='sound'?'Sound setting updated':'Animation setting updated',state.settings[key]?'On':'Off');return;}
  if(action==='inspect'){openInspect(target.dataset.id);return;}
  if(action==='modal-close'){document.querySelector('.ph-modal-backdrop')?.remove();return;}
  if(action==='reset'){if(!window.confirm('Reset your PLATE HUNTER collection and start over? This cannot be undone.'))return;state=newSave();spinCount=1;persist();render();toast('Fresh binder','You start again with 100 spins.');return;}
}

function openInspect(id){const plate=state.collection[id]||state.pending.find(p=>p.id===id);if(!plate)return;const rank=rarityOf(plate);const overlay=document.createElement('div');overlay.className='ph-modal-backdrop';overlay.innerHTML=`<section class="ph-modal ph-panel" role="dialog" aria-modal="true" aria-labelledby="inspect-title"><button class="ph-button modal-close" data-action="modal-close" aria-label="Close">×</button><p class="ph-eyebrow">${escapeHtml(plate.region)}</p><div class="plate-wrap">${plateMarkup(plate)}</div><h2 class="modal-title" id="inspect-title">${escapeHtml(plate.registration)}</h2><div class="modal-meta"><span class="rarity-label" style="--rarity:${rank.color}">${escapeHtml(rank.name)}</span><span>Estimated value · ◈ ${money(plate.value)}</span></div>${plate.special?`<p class="ph-small">✦ ${escapeHtml(plate.special)}</p>`:''}<div class="modal-meta"><span>First discovered · ${dateText(plate.firstDiscoveredAt||plate.discoveredAt)}</span><span>${plate.quantity?`Quantity owned · ×${plate.quantity}`:escapeHtml(plate.odds||'New find')}</span></div></section>`;document.body.append(overlay);overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});}

app.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(target)handleAction(target);});
app.addEventListener('change',event=>{const input=event.target;if(input.dataset.filter==='rarity')rarityFilter=input.value;else if(input.dataset.filter==='region')regionFilter=input.value;else if(input.dataset.filter==='sort')sortBy=input.value;else return;render();});
app.addEventListener('input',event=>{const input=event.target;if(input.dataset.filter!=='search')return;searchText=input.value;const selection=input.selectionStart;render();const next=app.querySelector('[data-filter="search"]');next?.focus();next?.setSelectionRange(selection,selection);});
document.addEventListener('click',event=>{const target=event.target.closest('[data-action="modal-close"]');if(target)target.closest('.ph-modal-backdrop')?.remove();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelector('.ph-modal-backdrop')?.remove();if(activeTab==='spin'&&!spinning&&(event.code==='Space'||event.key==='Enter')&&!event.target.matches('button,a,input,select,textarea')){event.preventDefault();runSpin(Math.min(spinCount,state.upgrades.bulk>=2?10:state.upgrades.bulk>=1?5:1));}});

render();
setInterval(()=>{state.stats.timePlayed+=1000;if(Date.now()-sessionStarted>15000){sessionStarted=Date.now();persist();}},1000);
