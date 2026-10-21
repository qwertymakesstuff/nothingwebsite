// Painted portraits in assets/portraits/<id>.jpg (512 × 512). Anyone without one is drawn
// from their `look` instead (js/portrait.js).
//   v_*    hand-written entrants          c_*  recurring cast (from phase 7)
//   h_*    the household (from phase 8)   pool_<nation>_<m|f>_<young|middle|older>  generated entrants

const NATIONS = ['cor', 'osk', 'vel', 'dra', 'kal'];
const BANDS = ['young', 'middle', 'older'];

export const PORTRAITS = new Set([
  'v_ilse_marek', 'v_tomas_reyl', 'v_anika_sorvald', 'v_mikel_arnsen', 'v_odessa_kain', 'v_piotr_halden',
  'c_radim_kessler', 'c_jarek_dusek', 'c_ruth_vlach', 'c_vera_novak', 'c_gleb_rasko', 'c_hedda_lindqvist',
  'c_arman_sevanyan', 'c_nare_sevanyan', 'c_otmar_vogt',
  'h_lena', 'h_tomek', 'h_agata',
  ...NATIONS.flatMap(n => ['m', 'f'].flatMap(s => BANDS.map(b => `pool_${n}_${s}_${b}`))),
]);

// age bands of the generic pool, in whole years
export const AGE_BANDS = [['young', 0, 35], ['middle', 36, 59], ['older', 60, 200]];

export const portraitPath = id => `assets/portraits/${id}.jpg`;
