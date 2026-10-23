// Cases. `forms` are the motherboard sizes that fit; `gpuMax` and `coolerMax` are clearances (mm);
// `radiator` is the largest AIO radiator it mounts (0 = none); `bays35`/`bays25` drive bays;
// `fans` lists fan mounts by position; `airflow` is passive airflow through the panels; `damping`
// dB of noise the panels soak up.

export const CASES = [
  { id: 'case-boxwell-mini', name: 'Office Mini', brand: 'Boxwell', forms: ['mATX', 'ITX'], gpuMax: 250, coolerMax: 140, radiator: 0, psuForm: 'ATX', bays35: 2, bays25: 1, fans: { front: 1, rear: 1, top: 0 }, airflow: 10, damping: 3, price: 40, tier: 1, failRate: 0 },
  { id: 'case-boxwell-towerm', name: 'Tower M', brand: 'Boxwell', forms: ['ATX', 'mATX', 'ITX'], gpuMax: 320, coolerMax: 160, radiator: 240, psuForm: 'ATX', bays35: 2, bays25: 2, fans: { front: 2, rear: 1, top: 2 }, airflow: 15, damping: 3, price: 65, tier: 1, failRate: 0 },
  { id: 'case-nw-airflow', name: 'Airflow X Mesh', brand: 'Northwind', forms: ['ATX', 'mATX', 'ITX'], gpuMax: 360, coolerMax: 170, radiator: 360, psuForm: 'ATX', bays35: 2, bays25: 3, fans: { front: 3, rear: 1, top: 2 }, airflow: 28, damping: 1, price: 95, tier: 2, failRate: 0 },
  { id: 'case-hush-studio', name: 'Studio Silent', brand: 'Hushbox', forms: ['ATX', 'mATX', 'ITX'], gpuMax: 330, coolerMax: 168, radiator: 240, psuForm: 'ATX', bays35: 3, bays25: 2, fans: { front: 2, rear: 1, top: 1 }, airflow: 8, damping: 9, price: 120, tier: 2, failRate: 0 },
  { id: 'case-pocket-cube', name: 'Pocket Cube', brand: 'Pocketworks', forms: ['ITX'], gpuMax: 330, coolerMax: 60, radiator: 240, psuForm: 'SFX', bays35: 0, bays25: 2, fans: { front: 0, rear: 0, top: 2 }, airflow: 14, damping: 2, price: 90, tier: 2, failRate: 0 },
  { id: 'case-monolith', name: 'Monolith Showcase', brand: 'Northwind', forms: ['ATX', 'mATX', 'ITX'], gpuMax: 420, coolerMax: 180, radiator: 360, psuForm: 'ATX', bays35: 3, bays25: 4, fans: { front: 3, rear: 1, top: 3 }, airflow: 20, damping: 4, price: 175, tier: 3, failRate: 0 },
];
