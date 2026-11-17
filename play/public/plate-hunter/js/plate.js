import { DESIGN_BY_ID, RARITY_BY_ID } from './config.js';

export function plateMarkup(plate, { compact = false } = {}) {
  if (!plate) return '<div class="plate-empty"><span>READY FOR YOUR NEXT FIND</span><b>?</b></div>';
  const design = DESIGN_BY_ID[plate.designId] || DESIGN_BY_ID['ma-beacon'];
  const rarity = RARITY_BY_ID[plate.rarity] || RARITY_BY_ID.common;
  const fontSize = Math.max(11, design.size - Math.max(0,plate.registration.length-6)*1.7);
  return `<div class="plate ${compact?'plate-compact':''}" style="--plate-bg:url('../assets/plates/${design.id}.svg?v=2');--plate-aspect:${design.aspect}/1;--plate-ink:${design.color};--plate-font:${design.font};--plate-size:${fontSize}px;--plate-weight:${design.weight};--plate-spacing:${design.spacing};--plate-x:${design.x}%;--plate-y:${design.y}%;--plate-width:${design.width}%;--plate-height:${design.height}%;--plate-align:${design.align};--plate-emboss:${design.emboss};--rarity:${rarity.color}" role="img" aria-label="${escapeHtml(plate.registration)}, ${escapeHtml(design.region)}, ${escapeHtml(rarity.name)}"><span class="registration">${escapeHtml(plate.registration)}</span><span class="plate-dot plate-dot-left"></span><span class="plate-dot plate-dot-right"></span></div>`;
}

export function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
