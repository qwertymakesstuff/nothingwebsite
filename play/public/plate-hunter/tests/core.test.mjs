import test from 'node:test';
import assert from 'node:assert/strict';
import { RARITIES, PLATE_DESIGNS, SPECIAL_REGISTRATIONS } from '../js/config.js';
import { classifyPattern, rollPlate } from '../js/generation.js';
import { buyUpgrade, claimDaily, collectPending, recordSpin, sellPlate, toggleFavorite } from '../js/progression.js';
import { loadSave, newSave, saveGame } from '../js/save.js';
import { plateMarkup } from '../js/plate.js';

const samplePlate = (id='ma-beacon:ABC123',rarity='uncommon') => ({id,registration:id.split(':')[1],designId:'ma-beacon',region:'Massachusetts',rarity,value:8,discoveredAt:Date.now(),odds:'1 in 10'});

test('configuration contains all requested rarity tiers and 15 local designs',()=>{
  assert.deepEqual(RARITIES.map(r=>r.name),['Common','Uncommon','Rare','Very Rare','Epic','Legendary','Mythical','Impossible']);
  assert.equal(RARITIES.find(r=>r.id==='impossible').odds,100000);
  assert.equal(PLATE_DESIGNS.length,15);
  assert.ok(PLATE_DESIGNS.every(d=>d.background.startsWith('assets/plates/')));
});

test('plate renderer keeps the registration as a responsive layer over its local blank design',()=>{
  const html=plateMarkup(samplePlate());
  assert.match(html,/\.\.\/assets\/plates\/ma-beacon\.svg\?v=2/);
  assert.match(html,/--plate-aspect:2\/1/);
  assert.match(html,/--plate-width:78%/);
  assert.match(html,/--plate-height:15%/);
  assert.match(html,/>ABC123</);
});

test('special plates and pattern floors retain their explicit rarity',t=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'crypto');
  Object.defineProperty(globalThis,'crypto',{configurable:true,value:{getRandomValues(bytes){bytes.fill(0);return bytes;}}});
  t.after(()=>Object.defineProperty(globalThis,'crypto',original));
  const plate=rollPlate();
  assert.equal(SPECIAL_REGISTRATIONS[0].registration,'A001AAA');
  assert.equal(plate.registration,'A001AAA');
  assert.equal(plate.rarity,'impossible');
  assert.equal(classifyPattern('7777777'),'legendary');
  assert.equal(classifyPattern('1234321'),'rare');
});

test('spins, collection stacking and sales preserve the binder',()=>{
  const state=newSave();
  const plate=samplePlate();
  recordSpin(state,[plate,plate]);
  assert.equal(state.spins,98);
  assert.equal(state.stats.totalSpins,2);
  const result=collectPending(state);
  assert.deepEqual(result,{count:2,unique:1,duplicates:1});
  assert.equal(state.collection[plate.id].quantity,2);
  const firstSale=sellPlate(state,plate.id,1);
  assert.equal(firstSale,8);
  assert.equal(state.collection[plate.id].quantity,1);
  toggleFavorite(state,plate.id);
  assert.equal(sellPlate(state,plate.id,1),0);
  assert.equal(state.collection[plate.id].quantity,1);
});

test('upgrade levels, bulk unlock and costs are bounded',()=>{
  const state=newSave(); state.coins=6000;
  assert.equal(buyUpgrade(state,'bulk').level,1);
  assert.equal(buyUpgrade(state,'bulk').level,2);
  assert.equal(buyUpgrade(state,'bulk').ok,false);
  assert.equal(state.upgrades.bulk,2);
  assert.equal(state.coins,900);
});

test('daily reward is once per day and rewards a continuing streak',()=>{
  const state=newSave();
  const first=claimDaily(state,new Date('2026-11-16T12:00:00Z'));
  assert.equal(first.coins,120); assert.equal(first.spins,3); assert.equal(first.streak,1);
  assert.equal(claimDaily(state,new Date('2026-11-16T17:00:00Z')),null);
  const second=claimDaily(state,new Date('2026-11-17T12:00:00Z'));
  assert.equal(second.streak,2); assert.equal(second.coins,140);
});

test('save restores the versioned game state',()=>{
  const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const data=new Map();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)||null}});
  try {
    const state=newSave(); state.spins=42; state.coins=900; state.upgrades.speed=2;
    assert.equal(saveGame(state),true);
    const restored=loadSave();
    assert.equal(restored.version,1); assert.equal(restored.spins,42); assert.equal(restored.coins,900); assert.equal(restored.upgrades.speed,2);
  } finally {
    if(original) Object.defineProperty(globalThis,'localStorage',original); else delete globalThis.localStorage;
  }
});
