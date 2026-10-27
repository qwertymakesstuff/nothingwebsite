// Entry point.
import { App } from './ui/app.js';

function storage() {
  try { const k = '__sd_test'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { 
    const m = new Map();
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
  }
}

const app = new App(document.getElementById('app'), storage());
window.siliconDreams = app;
app.go('menu');
document.getElementById('boot')?.remove();
