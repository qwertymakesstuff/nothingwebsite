// Browser bootstrap.

import { App } from './app.js';

const root = document.getElementById('app');
try {
  window.checkmateClub = new App({ root });
  document.getElementById('boot')?.remove();
} catch (err) {
  console.error(err);
  const boot = document.getElementById('boot');
  if (boot) boot.textContent = 'Checkmate Club could not start. Try reloading the page.';
}
