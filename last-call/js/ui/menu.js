// Main menu and new-game flow.

import { esc, modal, confirmBox } from './dom.js';
import { nextStep, totalShifts } from '../campaign.js';
import { SHIFTS } from '../shifts.js';
import { VENUES } from '../venues.js';

export function streetSvg() {
  return `<svg class="street" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0716"/><stop offset="1" stop-color="#2a1430"/></linearGradient>
    <radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".55"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs>
    <rect width="1200" height="520" fill="url(#sky)"/>
    ${[[30, 180, 120], [170, 120, 100], [290, 200, 140], [860, 150, 120], [1000, 90, 90], [1100, 170, 120]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${520 - y}" fill="#140c1e"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${x + 14 + (i % 3) * 32}" y="${y + 20 + Math.floor(i / 3) * 44}" width="14" height="20" fill="${(x + i) % 3 ? '#2a1d38' : '#ffcf7a'}" opacity=".8"/>`).join('')}`).join('')}
    <rect x="440" y="150" width="380" height="370" fill="#1e1420" stroke="#0a0610" stroke-width="6"/>
    <rect x="560" y="300" width="140" height="220" fill="#0a0610" stroke="#3a2632" stroke-width="6"/>
    <rect x="574" y="314" width="112" height="206" fill="#ffb347" opacity=".12" class="door-light"/>
    <circle cx="380" cy="200" r="120" fill="url(#lamp)"/><rect x="376" y="200" width="8" height="320" fill="#0a0610"/><rect x="360" y="190" width="40" height="14" rx="4" fill="#ffcf7a"/>
    <rect x="0" y="500" width="1200" height="20" fill="#0a0610"/>
    <g class="rope"><rect x="470" y="440" width="10" height="70" fill="#c9a646"/><rect x="780" y="440" width="10" height="70" fill="#c9a646"/><path d="M480 450 Q630 500 780 450" fill="none" stroke="#b0244a" stroke-width="10"/></g>
  </svg>`;
}

export function renderMenu(app) {
  const { player } = app;
  const step = player ? nextStep(player) : null;
  const where = player && !player.gameOver && !player.ending ? SHIFTS[step?.shiftId] ?? null : null;
  app.audio.music(null);
  app.root.innerHTML = `
  <div class="screen menu">
    ${streetSvg()}
    <div class="menu-inner">
      <h1 class="neon" aria-label="Last Call"><span>LAST</span> <span class="flicker">CALL</span></h1>
      <p class="menu-sub">A nightclub door simulator. Check the papers. Make the call. Keep the job.</p>
      <nav class="menu-buttons">
        ${player ? `<button class="btn big" id="continue">Continue<small>${esc(player.name)} · ${player.ending ? 'campaign complete' : player.gameOver ? 'out of work' : `shift ${Math.min(player.index + 1, totalShifts())} of ${totalShifts()}${where ? ` · ${esc(VENUES[where.venue].name)}` : ''}`} · $${player.money}</small></button>` : ''}
        <button class="btn big ${player ? 'ghost' : ''}" id="newGame">New game</button>
        <button class="btn ghost" id="settings">Settings</button>
        <button class="btn ghost" id="howTo">How to play</button>
        <a class="btn ghost" href="/">missing.website</a>
      </nav>
      <p class="menu-foot">Original characters and venues. Saves in this browser.</p>
    </div>
  </div>`;
  document.getElementById('continue')?.addEventListener('click', () => { app.audio.unlock(); app.resume(); });
  document.getElementById('newGame').onclick = async () => {
    app.audio.unlock();
    if (player && !(await confirmBox('Start a new campaign? Your current save will be replaced.', 'Start over'))) return;
    const m = modal(`<h2>New hire</h2><label class="field">What should Dee call you?<input id="nameInput" maxlength="16" value="Sam" autocomplete="off" autofocus></label><div class="row end"><button class="btn ghost" data-close>Cancel</button><button class="btn" id="startBtn">Start first shift</button></div>`, { label: 'New game' });
    const input = m.el.querySelector('#nameInput');
    input.select();
    const go = () => { const name = input.value; m.close(); app.newGame(name); };
    m.el.querySelector('#startBtn').onclick = go;
    input.onkeydown = e => { if (e.key === 'Enter') go(); };
  };
  document.getElementById('settings').onclick = () => app.openSettings();
  document.getElementById('howTo').onclick = () => howToPlay();
}

export function howToPlay() {
  modal(`<h2>How to play</h2><ol class="help">
    <li><b>Each shift</b> you work the door at a venue. Guests arrive in a line outside; the one at the front steps up.</li>
    <li><b>Inspect</b> their ID and any other papers against <b>tonight's rules</b> (always shown on the right, full wording in the Rulebook).</li>
    <li><b>Admit</b> (A) or <b>Refuse</b> (X). Cite the broken rule when refusing for a bonus. Every decision is explained.</li>
    <li><b>Mistakes</b> cost fines; too many and you're sent home. <b>Waiting</b> guests lose patience and leave.</li>
    <li>After each shift: your <b>paycheck</b>, then the <b>career</b> screen to pay rent and buy equipment, training, transport and decorations.</li>
    <li>Between shifts, short <b>scenes</b> with choices shape the story. Miss your target three times and you're fired.</li>
    <li>Judge the evidence, not the look. Friendly people lie; scary-looking people are often fine.</li></ol>
    <div class="row end"><button class="btn" data-close autofocus>Got it</button></div>`, { label: 'How to play' });
}
