// End-to-end test of live multiplayer: separate browser sessions as separate real users, against a
// real local Supabase stack and the real Worker + Durable Objects (wrangler dev). Nothing mocked.
// Plus raw-WebSocket attacks against the server. See e2e/README.md.

import http from 'node:http';
import { chromium } from 'playwright';

const SITE = process.env.SITE ?? 'http://127.0.0.1:8787';
const SB = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY; // harness only: creating users, reading results
const GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS ?? 8000); // must match .dev.vars
const FIRST_MOVE_MS = Number(process.env.FIRST_MOVE_MS ?? 20000);
if (!PUB || !SECRET) throw new Error('Set SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.');

const run = Date.now().toString(36).slice(-5);
const mk = (n) => ({ username: `mp_${n}_${run}`, email: `mp-${n}-${run}@example.test`, password: `Pass-${n}-${run}-9` });
const A = mk('a');
const B = mk('b');
const C = mk('c');
let passed = 0;
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  cond ? passed++ : failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const admin = (path, init = {}) =>
  fetch(`${SB}${path}`, { ...init, headers: { apikey: SECRET, authorization: `Bearer ${SECRET}`, 'content-type': 'application/json', ...init.headers } });
const rest = async (path) => (await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: SECRET } })).json();

async function createUser(u) {
  const res = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true, user_metadata: { username: u.username, birth_date: '1995-05-05' } }) });
  const body = await res.json();
  if (!body.id) throw new Error(`create user: ${JSON.stringify(body)}`);
  u.id = body.id;
}
async function tokenFor(u) {
  const res = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.password }) });
  return (await res.json()).access_token;
}
const blitz = async (u) => (await rest(`ratings?user_id=eq.${u.id}&category=eq.blitz&select=rating,rd,games`))[0];

// ── Browser helpers ──────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const pageErrors = [];
async function session(u) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); // its own cookies/storage: a separate user
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('rookery.preferences.v1', JSON.stringify({ confirmResign: false }));
    } catch {
      /* about:blank (used to simulate leaving) has no storage */
    }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${u.username}: ${e.message}`));
  await page.goto(`${SITE}/login`);
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  return { ctx, page, u };
}
const gameId = (page) => new URL(page.url()).searchParams.get('id');

async function orientation(page) {
  // White's pieces are at the bottom when playing white: look at the bottom-left square's piece.
  return (await page.locator('cg-board piece.white.rook').first().evaluate((el) => el.getBoundingClientRect().top)) > (await page.locator('cg-board').boundingBox()).y + 300 ? 'white' : 'black';
}
async function clickMove(page, uci, color) {
  const box = await page.locator('cg-board').boundingBox();
  const z = box.width / 8;
  const at = (sq) => {
    const f = sq.charCodeAt(0) - 97;
    const r = Number(sq[1]) - 1;
    return color === 'white' ? { x: box.x + (f + 0.5) * z, y: box.y + (7 - r + 0.5) * z } : { x: box.x + (7 - f + 0.5) * z, y: box.y + (r + 0.5) * z };
  };
  const a = at(uci.slice(0, 2));
  const b = at(uci.slice(2, 4));
  await page.mouse.click(a.x, a.y);
  await page.mouse.click(b.x, b.y);
}
/** Waits until it's this player's turn (their board accepts moves), then plays `uci`. */
async function play(p, uci) {
  await p.page.getByText('Your turn.').or(p.page.getByText('Make your first move')).first().waitFor({ timeout: 15000 });
  await clickMove(p.page, uci, p.color);
  await sleep(300);
}
/** Plays a line alternately; `w`/`b` are the sessions playing white/black. */
async function line(w, b, moves) {
  for (let i = 0; i < moves.length; i++) await play(i % 2 === 0 ? w : b, moves[i]);
}
async function colours(x, y) {
  x.color = await orientation(x.page);
  y.color = await orientation(y.page);
  return x.color === 'white' ? [x, y] : [y, x];
}

// ── Raw socket helper (for attacks) ──────────────────────────────────────────────────────
function rawSocket(path, token) {
  const ws = new WebSocket(`${SITE.replace('http', 'ws')}${path}`);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (e) => {
    if (e.data === '"heartbeat"') return;
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'hello' && token) ws.send(JSON.stringify({ t: 'auth', token }));
    for (const w of [...waiters]) if (w.pred(m)) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(m);
    }
  };
  const closed = new Promise((r) => (ws.onclose = (e) => r(e.code)));
  return {
    ws,
    inbox,
    closed,
    send: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)),
    next: (pred, ms = 8000) =>
      new Promise((resolve, reject) => {
        const hit = inbox.find(pred);
        if (hit) {
          inbox.splice(inbox.indexOf(hit), 1);
          return resolve(hit);
        }
        const w = { pred: (m) => pred(m) && (inbox.splice(inbox.indexOf(m), 1), true), resolve };
        waiters.push(w);
        setTimeout(() => reject(new Error('timeout waiting for message')), ms);
      }),
  };
}
const isErr = (code) => (m) => m.t === 'error' && m.code === code;

try {
  for (const u of [A, B, C]) await createUser(u);
  ok(true, `created players ${A.username}, ${B.username}, ${C.username}`);
  const a = await session(A);
  const b = await session(B);
  ok(true, 'two players signed in from separate browser sessions');

  // ── 1. Matchmaking → a complete rated game ──────────────────────────────────────────────
  for (const s of [a, b]) {
    await s.page.goto(`${SITE}/play?tc=3%2B2`);
    await s.page.getByRole('button', { name: /Find an opponent/ }).waitFor();
    await s.page.waitForFunction(() => ![...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Find an opponent'))?.disabled, null, { timeout: 15000 });
  }
  await a.page.getByRole('button', { name: /Find an opponent/ }).click();
  await a.page.getByText(/Finding a rated 3 \| 2 game/).waitFor();
  ok(true, 'player A is searching (queue status shown)');
  await b.page.getByRole('button', { name: /Find an opponent/ }).click();
  await Promise.all([a.page.waitForURL(/\/game\?id=/, { timeout: 15000 }), b.page.waitForURL(/\/game\?id=/, { timeout: 15000 })]);
  const g1 = gameId(a.page);
  ok(g1 && g1 === gameId(b.page), `matched into the same game (${g1})`);
  await a.page.locator('cg-board').waitFor();
  await b.page.locator('cg-board').waitFor();
  let [w, bl] = await colours(a, b);
  ok(w !== bl && w.color === 'white' && bl.color === 'black', `colours assigned: ${w.u.username} white, ${bl.u.username} black`);
  ok((await w.page.getByText('Live').count()) > 0, 'connection indicator shows Live');

  const before = { w: await blitz(w.u), b: await blitz(bl.u) };
  await line(w, bl, ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
  await bl.page.getByText('You won').waitFor({ timeout: 10000 });
  await w.page.getByText('You lost').waitFor({ timeout: 10000 });
  ok(true, 'checkmate: black sees "You won", white sees "You lost"');
  await bl.page.getByText(/Rating \+\d+/).waitFor({ timeout: 15000 });
  ok(true, 'rating change shown once the result is saved');
  const row = (await rest(`games?id=eq.${g1}&select=rated,source,result,termination,plies,moves,white_id,black_id,white_delta,black_delta,category`))[0];
  ok(row && row.rated && row.source === 'online' && row.result === '0-1' && row.termination === 'checkmate' && row.plies === 4 && row.moves === 'f2f3 e7e5 g2g4 d8h4', 'game recorded once with the server-verified result');
  ok(row.white_id === w.u.id && row.black_id === bl.u.id, 'recorded with the right players');
  const after = { w: await blitz(w.u), b: await blitz(bl.u) };
  ok(Number(after.b.rating) > Number(before.b.rating) && Number(after.w.rating) < Number(before.w.rating) && after.b.games === before.b.games + 1, `ratings updated (black ${before.b.rating}→${after.b.rating}, white ${before.w.rating}→${after.w.rating})`);
  ok(row.black_delta > 100 && row.black_delta < 250 && row.white_delta === -row.black_delta, `Glicko-2 change for two new players: ±${row.black_delta}`);
  ok((await rest(`rating_history?game_id=eq.${g1}&select=user_id`)).length === 2, 'rating history written for both players');

  // ── 2. Rematch (colours swap) → draw by agreement ───────────────────────────────────────
  await bl.page.getByRole('button', { name: 'Rematch' }).first().click();
  await w.page.getByRole('button', { name: 'Accept rematch' }).first().click({ timeout: 10000 });
  await Promise.all([w.page.waitForURL((u) => u.searchParams.get('id') !== g1, { timeout: 10000 }), bl.page.waitForURL((u) => u.searchParams.get('id') !== g1, { timeout: 10000 })]);
  const g2 = gameId(w.page);
  ok(g2 === gameId(bl.page), 'rematch: both players moved to the new game');
  await w.page.locator('cg-board').waitFor();
  await sleep(500);
  [w, bl] = await colours(a, b);
  ok(w.u.id !== row.white_id, 'rematch swaps colours');
  await line(w, bl, ['e2e4', 'e7e5', 'g1f3']);
  await w.page.getByRole('button', { name: 'Draw' }).click();
  await bl.page.getByText(/offers a draw/).waitFor({ timeout: 10000 });
  ok(true, 'draw offer delivered to the opponent');
  await bl.page.getByRole('button', { name: 'Accept' }).click();
  await w.page.getByRole('dialog', { name: 'Game over' }).getByText('Draw', { exact: true }).waitFor({ timeout: 10000 });
  await bl.page.getByRole('dialog', { name: 'Game over' }).getByText('by agreement').waitFor();
  ok(true, 'draw by agreement shown to both players');

  // ── 3. Rematch → resignation ────────────────────────────────────────────────────────────
  await w.page.getByRole('button', { name: 'Rematch' }).first().click();
  await bl.page.getByRole('button', { name: 'Accept rematch' }).first().click({ timeout: 10000 });
  await Promise.all([w.page.waitForURL((u) => u.searchParams.get('id') !== g2), bl.page.waitForURL((u) => u.searchParams.get('id') !== g2)]);
  const g3 = gameId(w.page);
  await w.page.locator('cg-board').waitFor();
  await sleep(500);
  [w, bl] = await colours(a, b);
  await line(w, bl, ['d2d4', 'd7d5']);
  await bl.page.getByRole('button', { name: 'Resign' }).click();
  // Resign confirmation is on by default in account settings.
  await bl.page.getByRole('dialog').getByRole('button', { name: 'Resign' }).click({ timeout: 3000 }).catch(() => {});
  await w.page.getByText('You won').waitFor({ timeout: 10000 });
  await bl.page.getByText('by resignation').first().waitFor();
  ok(true, 'resignation ends the game for both');
  await sleep(1500);
  const g3row = (await rest(`games?id=eq.${g3}&select=result,termination`))[0];
  ok(g3row?.termination === 'resign' && g3row.result === (w.color === 'white' ? '1-0' : '0-1'), 'resignation recorded');

  // ── 4. Disconnect, reconnect, then abandonment ──────────────────────────────────────────
  await w.page.getByRole('button', { name: 'Rematch' }).first().click();
  await bl.page.getByRole('button', { name: 'Accept rematch' }).first().click({ timeout: 10000 });
  await Promise.all([w.page.waitForURL((u) => u.searchParams.get('id') !== g3), bl.page.waitForURL((u) => u.searchParams.get('id') !== g3)]);
  const g4 = gameId(w.page);
  await w.page.locator('cg-board').waitFor();
  await sleep(500);
  [w, bl] = await colours(a, b);
  await line(w, bl, ['e2e4', 'c7c5']);
  const leaver = bl;
  const stayer = w;
  await leaver.page.goto('about:blank'); // closes the game socket
  await stayer.page.getByText(/left the game/).waitFor({ timeout: 10000 });
  ok(true, 'opponent disconnect shown with a countdown');
  await leaver.page.goto(`${SITE}/game?id=${g4}`);
  await leaver.page.locator('cg-board').waitFor();
  await stayer.page.getByText(/left the game/).waitFor({ state: 'detached', timeout: 10000 });
  ok(true, 'reconnecting within the grace period resumes the game');
  await play(stayer, 'g1f3');
  await play(leaver, 'd7d6');
  ok((await stayer.page.locator('ol button').count()) === 4, 'moves continue after reconnection (4 plies)');
  await leaver.page.goto('about:blank');
  await stayer.page.getByText('You won').waitFor({ timeout: GRACE_MS + 10000 });
  await stayer.page.getByText('by abandonment').first().waitFor();
  ok(true, 'a player who stays away loses by abandonment');
  await sleep(1500);
  ok((await rest(`games?id=eq.${g4}&select=termination`))[0]?.termination === 'abandon', 'abandonment recorded');
  await leaver.page.goto(`${SITE}/game?id=${g4}`);
  await leaver.page.getByText('You lost').waitFor({ timeout: 10000 });
  ok(true, 'the player who left sees the result when they return');

  // ── 5. Challenges: by username, decline, invitation link, private room ───────────────────
  await a.page.goto(`${SITE}/play?tc=5%2B0`);
  await b.page.goto(`${SITE}/dashboard`);
  await a.page.getByLabel('Username to challenge').fill(B.username);
  await a.page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await a.page.waitForURL(/\/game\?id=/);
  const ch1 = gameId(a.page);
  await a.page.getByText(`Waiting for ${B.username}`).waitFor();
  ok(true, 'challenge created; challenger waits in the game room');
  await b.page.getByText(`${A.username} challenges you`).waitFor({ timeout: 10000 });
  ok(true, 'challenged player gets a live notification');
  await b.page.getByRole('status').filter({ hasText: 'challenges you' }).getByRole('button', { name: 'Decline' }).click();
  await a.page.getByText('Challenge declined').waitFor({ timeout: 10000 });
  ok(true, 'declining tells the challenger');

  await a.page.goto(`${SITE}/play?tc=5%2B0`);
  await a.page.getByLabel('Username to challenge').fill(B.username);
  await a.page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await a.page.waitForURL((u) => u.searchParams.get('id') && u.searchParams.get('id') !== ch1);
  const ch2 = gameId(a.page);
  await b.page.getByRole('status').filter({ hasText: 'challenges you' }).getByRole('button', { name: 'Accept' }).click({ timeout: 10000 });
  await b.page.waitForURL(new RegExp(ch2));
  await a.page.locator('cg-board').waitFor({ timeout: 10000 });
  await b.page.locator('cg-board').waitFor();
  ok(true, 'accepting a challenge starts the game for both');
  const c = await session(C);
  await c.page.goto(`${SITE}/game?id=${ch2}`);
  await c.page.getByText('Private game').waitFor({ timeout: 10000 });
  ok(true, 'a third player cannot enter a game between two others');
  await a.page.getByRole('button', { name: 'Abort' }).click();
  await a.page.getByText('Game aborted').waitFor({ timeout: 10000 });
  await b.page.getByText('Game aborted').waitFor();
  ok((await rest(`games?id=eq.${ch2}&select=id`)).length === 0, 'abort before any moves: no game recorded');

  await a.page.goto(`${SITE}/play?tc=10%2B0`);
  await a.page.getByRole('button', { name: /invitation link/ }).click();
  await a.page.waitForURL(/\/game\?id=/);
  const link = await a.page.getByLabel('Invitation link').inputValue();
  await a.page.getByText('Waiting for an opponent').waitFor();
  await c.page.goto(link);
  await c.page.locator('cg-board').waitFor({ timeout: 10000 });
  await a.page.locator('cg-board').waitFor({ timeout: 10000 });
  ok(true, 'an invitation link lets anyone signed in take the open seat');
  await c.page.getByRole('button', { name: 'Abort' }).click();
  await a.page.getByText('Game aborted').waitFor({ timeout: 10000 });

  // ── 6. Attacks on the server (raw WebSockets) ───────────────────────────────────────────
  const [tA, tB, tC] = await Promise.all([tokenFor(A), tokenFor(B), tokenFor(C)]);
  await a.page.goto(`${SITE}/dashboard`); // leave game pages; lobby sockets stay open
  const lA = rawSocket('/ws/lobby', tA);
  const lB = rawSocket('/ws/lobby', tB);
  await lA.next((m) => m.t === 'authed');
  await lB.next((m) => m.t === 'authed');
  lA.send({ t: 'seek', tc: '1+0', rated: false });
  lB.send({ t: 'seek', tc: '1+0', rated: false });
  const matched = await lA.next((m) => m.t === 'matched');
  await lB.next((m) => m.t === 'matched');
  const gid = matched.gameId;
  const sA = rawSocket(`/ws/game/${gid}`, tA);
  const sB = rawSocket(`/ws/game/${gid}`, tB);
  const stA = await sA.next((m) => m.t === 'state');
  await sB.next((m) => m.t === 'state');
  const white = stA.game.you === 'white' ? sA : sB;
  const black = white === sA ? sB : sA;
  const drain = (s) => s.inbox.splice(0);
  drain(sA);
  drain(sB);

  const anon = rawSocket(`/ws/game/${gid}`, null);
  await anon.next((m) => m.t === 'hello');
  anon.send({ t: 'move', uci: 'e2e4', ply: 0 });
  ok(Boolean(await anon.next(isErr('auth_required'))), 'unauthenticated socket cannot move');
  const forged = rawSocket(`/ws/game/${gid}`, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhdHRhY2tlciJ9.c2lnbmF0dXJl');
  await forged.next(isErr('auth_failed'));
  ok((await forged.closed) === 4001, 'forged token rejected and socket closed');
  const intruder = rawSocket(`/ws/game/${gid}`, tC);
  await intruder.next(isErr('not_a_player'));
  ok((await intruder.closed) === 4003, 'a signed-in non-player is refused');

  black.send({ t: 'move', uci: 'e7e5', ply: 0 });
  ok(Boolean(await black.next(isErr('not_your_turn'))), 'moving out of turn is rejected');
  white.send({ t: 'move', uci: 'e2e5', ply: 0 });
  ok(Boolean(await white.next(isErr('illegal_move'))), 'illegal move is rejected');
  white.send({ t: 'move', uci: 'e7e5', ply: 0 });
  ok(Boolean(await white.next(isErr('illegal_move'))), "moving the opponent's pieces is rejected");
  const e4 = { t: 'move', uci: 'e2e4', ply: 0 };
  white.send(e4);
  await white.next((m) => m.t === 'state' && m.game.moves.length === 1);
  white.send(e4); // the same message again (duplicate / replay)
  ok(Boolean(await white.next(isErr('stale'))), 'duplicated/replayed move message is rejected');
  black.send({ t: 'move', uci: 'e7e5', ply: 0 }); // built for an older position
  ok(Boolean(await black.next(isErr('stale'))), 'move aimed at an old position is rejected');
  black.send({ t: 'move', uci: 'e7e5', ply: 1 });
  await black.next((m) => m.t === 'state' && m.game.moves.length === 2);
  drain(white);
  await sleep(1500);
  white.send({ t: 'move', uci: 'g1f3', ply: 2, clock: { whiteMs: 999999 }, whiteMs: 999999, result: '1-0' });
  const st = await white.next((m) => m.t === 'state' && m.game.moves.length === 3);
  ok(st.game.clock.whiteMs < 60_000 && st.game.clock.whiteMs > 57_000 && st.game.status === 'active', `clock is charged by server time; forged clock/result fields ignored (white ${st.game.clock.whiteMs} ms)`);
  white.send({ t: 'draw', action: 'accept', ply: 3 });
  ok(Boolean(await white.next(isErr('no_offer'))), 'accepting a draw that was never offered is rejected');
  white.send({ t: 'resign', ply: 0 });
  ok(Boolean(await white.next(isErr('stale'))), 'a resignation replayed from an old position is rejected');
  white.send('{"t":"move","uci":"zz","ply":-1}');
  ok(Boolean(await white.next(isErr('bad_message'))), 'malformed messages are rejected');

  const rpc = await fetch(`${SB}/rest/v1/rpc/record_online_game`, { method: 'POST', headers: { apikey: PUB, authorization: `Bearer ${tA}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_game: { id: 'forgedgame01', white_id: A.id, black_id: B.id, source: 'online', rated: true, category: 'blitz', result: '1-0' }, p_white: null, p_black: null }) });
  ok(rpc.status === 401 || rpc.status === 403 || rpc.status === 404, `players cannot record results directly (${rpc.status})`);
  const crossSite = await new Promise((resolve) => {
    const u = new URL(`${SITE}/ws/game/${gid}`);
    http.get({ host: u.hostname, port: u.port, path: u.pathname, headers: { Upgrade: 'websocket', Connection: 'Upgrade', Origin: 'https://evil.example', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Version': '13' } }, (res) => resolve(res.statusCode)).on('error', () => resolve(0));
  });
  ok(crossSite === 403, 'sockets opened from another website are refused (403)');

  white.send({ t: 'resign', ply: 3 });
  await black.next((m) => m.t === 'state' && m.game.status === 'ended');
  await sleep(1500);
  ok((await rest(`games?id=eq.${gid}&select=rated,termination`))[0]?.rated === false, 'casual game recorded unrated');

  // First-move timeout: matched, nobody moves → aborted by the server's own alarm.
  lA.send({ t: 'seek', tc: '1+0', rated: true });
  lB.send({ t: 'seek', tc: '1+0', rated: true });
  const m2 = await lA.next((m) => m.t === 'matched');
  const idle = rawSocket(`/ws/game/${m2.gameId}`, tA);
  await idle.next((m) => m.t === 'state');
  const aborted = await idle.next((m) => m.t === 'state' && m.game.status === 'aborted', FIRST_MOVE_MS + 10000);
  ok(Boolean(aborted), 'a game with no first move is aborted by the server');
  for (const s of [lA, lB, sA, sB, idle, anon]) s.ws.close();

  ok(pageErrors.length === 0, `no page errors ${pageErrors.slice(0, 3).join(' | ')}`);
} catch (e) {
  failed++;
  console.log('FAIL exception:', e.message.split('\n').slice(0, 3).join(' / '));
  if (process.env.E2E_SHOTS) for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: `${process.env.E2E_SHOTS}/mp-fail-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
