// Graphics quality: 'high' (shadows, sharp ground texture) or 'low' (no shadows, smaller textures). Phones start on low.
import { data, persist } from './save.js';
const touchy = typeof window !== 'undefined' && 'ontouchstart' in window && matchMedia('(pointer:coarse)').matches;
export let quality = (data.quality === 'high' || data.quality === 'low') ? data.quality : (touchy ? 'low' : 'high');
export function setQuality(q) { quality = q === 'low' ? 'low' : 'high'; data.quality = quality; persist(); }
