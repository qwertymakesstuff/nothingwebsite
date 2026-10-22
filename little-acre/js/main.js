// Entry point: title screen, then the game loop (input -> update -> draw -> HUD).

import { Game } from './game.js';
import { UI } from './ui/ui.js';
import { Renderer } from './render/renderer.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { showTitle } from './ui/title.js';
import { newGame } from './state.js';
import { loadGame, saveGame } from './save.js';
import { centerOf } from './world.js';
import { MAPS } from './data/maps.js';

const canvas = document.getElementById('view');
const ui = new UI();
const saved = loadGame();
const audio = new Audio(saved?.settings || { music: true, sfx: true, volume: 0.6 });

// a quiet look at the farm behind the title screen
const backdrop = newGame({ seed: 20240611 });
backdrop.date.minutes = 17 * 60;
[backdrop.player.x, backdrop.player.y] = centerOf(20, 12);
backdrop.player.map = 'farm';
let game = new Game(backdrop, { autosave: false });
const renderer = new Renderer(canvas, game);
let input = null;
let playing = false;

addEventListener('resize', () => renderer.resize());
// handy from the browser console (and for automated play-testing)
window.littleAcre = { get game() { return game; }, ui, renderer, audio };

function start(state) {
  game = new Game(state, { ui, sfx: n => audio.sfx(n) });
  renderer.game = game;
  ui.attach(game, renderer, audio);
  if (input) input.game = game; else input = new Input(game, ui, renderer, audio);
  audio.applySettings(state.settings);
  audio.unlock();
  audio.setTrack(MAPS[state.player.map].music);
  playing = true;
  game.save();
  if (state.stats.days === 1 && state.date.minutes <= 6 * 60 + 5 && !state.quests.done.length) {
    ui.say(null, [
      `Welcome to ${state.player.farm} Farm, ${state.player.name}.`,
      'Aunt Hazel left you a hoe, a watering can, an axe, a pickaxe, a scythe and 15 turnip seeds.',
      'Step outside, clear some weeds, till a patch of grass with the hoe (Space), plant the seeds and water them.',
      'Water every day. Turnips are ready in four days. Put what you harvest in the shipping bin beside the house to earn gold overnight.',
      'Bramblewick is east along the road. The villagers would love to meet you. Press Tab any time for your bag, quests, map and more.',
    ]);
  }
}

showTitle({
  save: saved,
  onContinue: () => start(saved),
  onNew: opts => start(newGame({ ...opts, seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0 })),
});

let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (playing) {
    input.update();
    game.update(dt, input.move());
    const mt = input.mouseTile && !input.touch ? input.mouseTile : null;
    const [tx, ty] = game.targetTile(mt);
    const inReach = mt && game.targetTile(mt) === mt;
    const act = ui.busy ? null : game.interaction(tx, ty);
    const use = ui.busy ? null : game.useLabel(tx, ty);
    renderer.target = ui.busy ? null : { x: tx, y: ty, active: !!(act || use) };
    if (mt && !inReach) renderer.target = { x: tx, y: ty, active: !!(act || use) };
    ui.setPrompt(game.fishing ? (game.fishing.phase === 'bite' ? 'Reel in!' : 'Waiting for a bite... (move to stop)') : use, game.fishing ? null : act?.label, input.touch);
    ui.updateHud();
    audio.setMood({ night: game.state.date.minutes >= 20 * 60, season: game.state.date.season });
  }
  renderer.draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

const flush = () => { if (playing) saveGame(game.state); };
addEventListener('pagehide', flush);
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
