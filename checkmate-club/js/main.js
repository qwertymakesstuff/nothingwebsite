// Browser bootstrap.

import { App } from './app.js';
import { Assets } from './core/assets.js';

const root = document.getElementById('app');
try {
  const assets = await new Assets().load();
  window.checkmateClub = new App({ root, assets });
  document.getElementById('boot')?.remove();
} catch (err) {
  console.error(err);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'Checkmate Club could not start. Try reloading the page.';
}
