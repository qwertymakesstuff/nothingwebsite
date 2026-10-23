// Tunable constants shared by the game logic.

export const SAVE_KEY = 'silicon-dreams-save';
export const SETTINGS_KEY = 'silicon-dreams-settings';
export const SAVE_VERSION = 1;

export const DAY_START = 9 * 60;   // 09:00
export const DAY_END = 19 * 60;    // 19:00

export const DIFFICULTIES = {
  relaxed: { label: 'Relaxed', money: 2500, deadline: 2, rent: 60, desc: 'More starting cash, longer deadlines, cheaper rent.' },
  standard: { label: 'Standard', money: 1500, deadline: 0, rent: 90, desc: 'The intended balance.' },
  hardcore: { label: 'Hardcore', money: 800, deadline: -1, rent: 130, desc: 'Tight cash, tight deadlines, pricier rent.' },
};

export const RENT_EVERY = 7;          // days between rent payments
export const BASE_CAPACITY = 40;      // shelf space units
export const BASE_INTAKE = 3;         // customer machines waiting on the intake rack
export const AMBIENT = 24;            // workshop temperature, °C
export const CPU_THROTTLE = 95;       // CPU starts throttling
export const CPU_SHUTDOWN = 108;      // CPU protection shutdown
export const GPU_THROTTLE = 88;
export const DUST_PROBLEM = 40;       // dust level that counts as needing a clean

// minutes each workshop action takes (before tool / upgrade speedups)
export const TIME = {
  install: { case: 5, motherboard: 15, cpu: 5, cooler: 10, ram: 2, storage: 6, psu: 10, gpu: 6, fan: 5 },
  removeFactor: 0.6,
  cable: 2, paste: 3, cleanPaste: 4, dust: 15, caseToggle: 2, power: 3, bios: 3,
  visual: 8, psuTest: 8, memtest: 45, temps: 10, storageHealth: 10, cpuBench: 10, gpuBench: 10,
  stability: 30, osDiag: 12, malware: 25, osInstall: 40, osRepair: 30, drivers: 15, format: 5, recover: 60, postCard: 3, thermalCam: 6,
};

export const LEVELS = [0, 250, 700, 1400, 2500, 4000, 6000, 9000];
