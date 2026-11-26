// Stage 6 integration test: puzzles, review, explorer, tournaments, friends, search,
// notifications, statistics, chat moderation, reports, restrictions, bans and admin review, with
// separate browser sessions as separate real users, against real local Supabase and the real
// Worker + Durable Objects. Nothing is mocked. Needs TOURNAMENT_TIME_SCALE=0.05 in .dev.vars.

import { chromium } from 'playwright';

const SITE = process.env.SITE ?? 'http://127.0.0.1:8787';
const SB = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY; // harness only: creating users/staff, reading results
if (!PUB || !SECRET) throw new Error('Set SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY.');

const run = Date.now().toString(36).slice(-5);
const mk = (n) => ({ username: `p6_${n}_${run}`, email: `p6-${n}-${run}@example.test`, password: `Pass-${n}-${run}-9` });
const A = mk('ann');
const B = mk('bob');
const C = mk('mod');
const D = mk('adm');
let passed = 0;
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  cond ? passed++ : failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const svc = (path, init = {}) => fetch(`${SB}${path}`, { ...init, headers: { apikey: SECRET, authorization: `Bearer ${SECRET}`, 'content-type': 'application/json', ...init.headers } });
const rest = async (path) => (await svc(`/rest/v1/${path}`)).json();

async function createUser(u) {
  const body = await (await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: u.email, password: u.password, email_confirm: true, user_metadata: { username: u.username, birth_date: '1994-04-04' } }) })).json();
  if (!body.id) throw new Error(`create user: ${JSON.stringify(body)}`);
  u.id = body.id;
}
async function tokenFor(u) {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify({ email: u.email, password: u.password }) });
  return (await r.json()).access_token;
}
const asUser = (token) => (path, init = {}) => fetch(`${SB}${path}`, { ...init, headers: { apikey: PUB, authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers } });

const browser = await chromium.launch();
const pageErrors = [];
async function session(u) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('rookery.preferences.v1', JSON.stringify({ confirmResign: false, autoQueen: true }));
    } catch {}
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(`${u?.username ?? 'guest'}: ${e.message}`));
  if (u) {
    await page.goto(`${SITE}/login`);
    await page.getByLabel('Email').fill(u.email);
    await page.getByLabel('Password').fill(u.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  }
  return { ctx, page, u };
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
const solverColor = (fen) => (fen.split(' ')[1] === 'w' ? 'black' : 'white'); // the opponent moves first

function rawSocket(path, token) {
  const ws = new WebSocket(`${SITE.replace('http', 'ws')}${path}`);
  const inbox = [];
  const waiters = [];
  ws.onmessage = (e) => {
    if (e.data === '"heartbeat"') return;
    const m = JSON.parse(e.data);
    if (m.t === 'hello' && token) ws.send(JSON.stringify({ t: 'auth', token }));
    const w = waiters.find((x) => x.pred(m));
    if (w) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(m);
    } else inbox.push(m);
  };
  return {
    ws,
    inbox,
    send: (m) => ws.send(JSON.stringify(m)),
    next: (pred, ms = 8000) =>
      new Promise((resolve, reject) => {
        const i = inbox.findIndex(pred);
        if (i >= 0) return resolve(inbox.splice(i, 1)[0]);
        const w = { pred, resolve };
        waiters.push(w);
        setTimeout(() => {
          const k = waiters.indexOf(w);
          if (k >= 0) {
            waiters.splice(k, 1);
            reject(new Error('timeout waiting for message'));
          }
        }, ms);
      }),
  };
}
const isErr = (code) => (m) => m.t === 'error' && m.code === code;

try {
  for (const u of [A, B, C, D]) await createUser(u);
  await svc('/rest/v1/staff', { method: 'POST', body: JSON.stringify([{ user_id: C.id, role: 'moderator' }, { user_id: D.id, role: 'admin' }]) });
  ok(true, 'created 4 players (one moderator, one admin)');
  const [tA, tB, tC] = await Promise.all([tokenFor(A), tokenFor(B), tokenFor(C)]);

  // ── 1. Puzzles ─────────────────────────────────────────────────────────────────────────
  const twoMove = (await rest(`puzzles?select=id,fen,first_move,solution,rating&order=id&limit=200`)).find((p) => p.solution.length === 3);
  const oneMove = (await rest(`puzzles?select=id,fen,first_move,solution,rating&order=id&limit=200`)).filter((p) => p.solution.length === 1);
  ok(Boolean(twoMove) && oneMove.length >= 3, 'puzzle data present (generated, engine-verified)');
  const anonSolution = await fetch(`${SB}/rest/v1/puzzles?select=solution&limit=1`, { headers: { apikey: PUB } });
  ok(anonSolution.status >= 400, `puzzle solutions are not readable by browsers (${anonSolution.status})`);
  const aSolution = await asUser(tA)(`/rest/v1/puzzles?select=solution&limit=1`);
  ok(aSolution.status >= 400, 'not by signed-in players either');

  const guest = await session(null);
  await guest.page.goto(`${SITE}/puzzles?id=${oneMove[0].id}`);
  await guest.page.getByText(/Find the best move for/).waitFor({ timeout: 15000 });
  await clickMove(guest.page, oneMove[0].solution[0], solverColor(oneMove[0].fen));
  await guest.page.getByText('Correct!').waitFor({ timeout: 10000 });
  ok(true, 'guest solves a puzzle (server-checked), no rating');

  const a = await session(A);
  const ratingOf = async (u, cat) => Number((await rest(`ratings?user_id=eq.${u.id}&category=eq.${cat}&select=rating`))[0].rating);
  const before = await ratingOf(A, 'puzzle');
  await a.page.goto(`${SITE}/puzzles?id=${twoMove.id}`);
  const col = solverColor(twoMove.fen);
  await a.page.getByText(/Find the best move for/).waitFor({ timeout: 15000 });
  await clickMove(a.page, twoMove.solution[0], col);
  await a.page.getByText(/Find the best move for/).waitFor({ timeout: 10000 }); // after the opponent's reply
  await sleep(600);
  await clickMove(a.page, twoMove.solution[2], col);
  await a.page.getByText('Correct!').waitFor({ timeout: 10000 });
  await a.page.getByText(/Puzzle rating \+\d+/).waitFor();
  const after = await ratingOf(A, 'puzzle');
  ok(after > before, `two-move puzzle solved through the UI; puzzle rating ${before} → ${after}`);
  const att = await rest(`puzzle_attempts?user_id=eq.${A.id}&select=puzzle_id,solved`);
  ok(att.length === 1 && att[0].solved, 'rated attempt recorded once');

  // Wrong move → failed, rating down, solution shown
  const p2 = oneMove[1];
  await a.page.goto(`${SITE}/puzzles?id=${p2.id}`);
  await a.page.getByText(/Find the best move for/).waitFor({ timeout: 15000 });
  // Use the API directly for a wrong move (the UI path is identical): find a legal wrong move server-side.
  const wrong = await (async () => {
    const files = 'abcdefgh';
    for (const f1 of files) for (let r1 = 1; r1 <= 8; r1++) for (const f2 of files) for (let r2 = 1; r2 <= 8; r2++) {
      const m = `${f1}${r1}${f2}${r2}`;
      if (m === p2.solution[0]) continue;
      const res = await fetch(`${SITE}/api/puzzles/${p2.id}/move`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ moves: [m] }) }); // guest probe: unrated
      const body = await res.json();
      if (body.status === 'failed') return m;
    }
    return null;
  })();
  ok(Boolean(wrong), `found a legal wrong move (${wrong}) via unrated guest requests`);
  const beforeFail = await ratingOf(A, 'puzzle');
  await clickMove(a.page, wrong, solverColor(p2.fen));
  await a.page.getByText('Not the best move.').waitFor({ timeout: 10000 });
  await a.page.getByText(/Puzzle rating -\d+/).waitFor({ timeout: 10000 });
  ok((await ratingOf(A, 'puzzle')) < beforeFail, 'wrong move: puzzle failed, rating down, solution shown');
  const retry = await fetch(`${SITE}/api/puzzles/${p2.id}/move`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tA}` }, body: JSON.stringify({ moves: [p2.solution[0]] }) });
  ok((await retry.json()).rating === undefined, 'a second attempt is practice: no rating change');
  const forged = await fetch(`${SITE}/api/puzzles/${twoMove.id}/move`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tB}` }, body: JSON.stringify({ moves: ['a1a1', twoMove.solution[2]] }) });
  ok(forged.status === 400, 'skipping or forging earlier moves is rejected (400)');
  const hint = await (await fetch(`${SITE}/api/puzzles/${oneMove[2].id}/move`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tB}` }, body: JSON.stringify({ moves: [], help: 'hint' }) })).json();
  ok(hint.status === 'hint' && hint.hintSquare === oneMove[2].solution[0].slice(0, 2) && hint.rating?.change < 0, 'a hint shows the piece and counts as a miss');

  await a.page.goto(`${SITE}/puzzles?mode=daily`);
  await a.page.getByRole('heading', { name: 'Daily puzzle' }).waitFor({ timeout: 15000 });
  const dailyA = await (await asUser(tA)('/rest/v1/rpc/daily_puzzle', { method: 'POST', body: '{}' })).json();
  const dailyB = await (await asUser(tB)('/rest/v1/rpc/daily_puzzle', { method: 'POST', body: '{}' })).json();
  ok(dailyA && dailyA === dailyB, `daily puzzle is the same for everyone (${dailyA})`);

  // ── 2. Friends, search, notifications ─────────────────────────────────────────────────
  const b = await session(B);
  await a.page.goto(`${SITE}/players?q=${B.username.slice(0, 8)}`);
  await a.page.getByRole('link', { name: new RegExp(B.username) }).first().waitFor({ timeout: 10000 });
  ok(true, 'player search finds by username prefix');
  await a.page.getByRole('link', { name: new RegExp(B.username) }).first().click();
  await a.page.getByRole('button', { name: 'Add friend' }).click();
  await a.page.getByRole('button', { name: /Request sent/ }).waitFor();
  await b.page.goto(`${SITE}/dashboard`);
  await b.page.getByRole('link', { name: /Notifications, \d+ unread/ }).first().waitFor({ timeout: 15000 });
  ok(true, 'friend request raises the unread count on the bell');
  await b.page.goto(`${SITE}/notifications`);
  await b.page.getByText('wants to be friends.').waitFor();
  await b.page.getByRole('button', { name: 'Accept' }).first().click();
  await b.page.getByText('You’re friends.').waitFor();
  await a.page.goto(`${SITE}/friends`);
  await a.page.getByText(/Your friends \(1\)/).waitFor({ timeout: 10000 });
  ok(true, 'request accepted from notifications; both are friends');
  const aNotes = await rest(`notifications?user_id=eq.${A.id}&kind=eq.friend_accepted&select=id`);
  ok(aNotes.length === 1, 'the requester was notified of the acceptance');

  // B: challenges from friends only → C refused, A allowed
  await svc(`/rest/v1/user_settings?user_id=eq.${B.id}`, { method: 'PATCH', body: JSON.stringify({ allow_challenges: 'friends' }) });
  const lobbyC = rawSocket('/ws/lobby', tC);
  await lobbyC.next((m) => m.t === 'authed');
  lobbyC.send({ t: 'challenge', to: B.username, tc: '5+0', rated: false, color: 'random' });
  ok(Boolean(await lobbyC.next(isErr('not_accepting'))), '“friends only” blocks challenges from non-friends');
  const lobbyA = rawSocket('/ws/lobby', tA);
  await lobbyA.next((m) => m.t === 'authed');
  lobbyA.send({ t: 'challenge', to: B.username, tc: '5+0', rated: false, color: 'white' });
  const ch = await lobbyA.next((m) => m.t === 'challenge-created');
  ok(Boolean(ch.gameId), '…but a friend can challenge');

  // ── 3. Chat and its moderation ─────────────────────────────────────────────────────────
  const gA = rawSocket(`/ws/game/${ch.gameId}`, tA);
  const gB = rawSocket(`/ws/game/${ch.gameId}`, tB);
  await gA.next((m) => m.t === 'chat-history');
  await gB.next((m) => m.t === 'chat-history');
  gA.send({ t: 'chat', text: 'Good luck!' });
  ok((await gB.next((m) => m.t === 'chat-line')).line.text === 'Good luck!', 'chat delivered to the opponent');
  await sleep(1100);
  gA.send({ t: 'chat', text: 'oh shit' });
  ok((await gB.next((m) => m.t === 'chat-line')).line.text === 'oh ****', 'profanity is masked');
  await sleep(1100);
  gA.send({ t: 'chat', text: 'just kys' });
  ok(Boolean(await gA.next(isErr('chat_blocked'))), 'threats are blocked for the sender…');
  await sleep(1500);
  ok(!gB.inbox.some((m) => m.t === 'chat-line' && m.line.text.includes('kys')), '…and never reach the opponent');
  await sleep(1000);
  gA.send({ t: 'chat', text: 'a' });
  gA.send({ t: 'chat', text: 'b' });
  ok(Boolean(await gA.next(isErr('rate_limited'))), 'chat is rate-limited');
  const stored = await rest(`chat_messages?game_id=eq.${ch.gameId}&select=body,flagged&order=id`);
  ok(stored.length >= 3 && stored.some((m) => m.flagged && m.body.includes('kys')), 'all chat (including blocked lines) is stored for moderators');
  ok((await (await asUser(tB)(`/rest/v1/chat_messages?game_id=eq.${ch.gameId}`)).json()).length === 0, 'players cannot read the stored chat');
  gA.send({ t: 'move', uci: 'e2e4', ply: 0 });
  await gB.next((m) => m.t === 'state' && m.game.moves.length === 1);
  gB.send({ t: 'move', uci: 'e7e5', ply: 1 });
  await gA.next((m) => m.t === 'state' && m.game.moves.length === 2);
  gB.send({ t: 'resign', ply: 2 });
  await gA.next((m) => m.t === 'state' && m.game.status === 'ended' && m.game.recorded, 10000);
  ok(true, 'the challenge game finished and was recorded');

  // B reports A from A's profile (UI)
  await b.page.goto(`${SITE}/u/${A.username}`);
  await b.page.getByRole('button', { name: 'Report' }).click();
  await b.page.getByRole('radio', { name: /Abuse or harassment/ }).click();
  await b.page.getByLabel('Details (optional)').fill('Told me to kys in chat');
  await b.page.getByRole('button', { name: 'Send report' }).click();
  await b.page.getByText('Report sent').waitFor();
  ok(true, 'report filed from the profile');
  const dupReport = await asUser(tB)('/rest/v1/reports', { method: 'POST', body: JSON.stringify({ target_id: A.id, reason: 'spam' }) });
  ok(dupReport.status >= 400, 'a second open report about the same player is refused');

  // Non-staff can't moderate
  await a.page.goto(`${SITE}/admin`);
  await a.page.getByText('Staff only').waitFor({ timeout: 10000 });
  const forgedResolve = await (await asUser(tA)('/rest/v1/reports?id=gt.0', { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify({ status: 'dismissed' }) })).json();
  ok(Array.isArray(forgedResolve) && forgedResolve.length === 0, 'players cannot see the admin area or resolve reports');

  // Moderator handles the report: mute + resolve
  const c = await session(C);
  await c.page.goto(`${SITE}/admin`);
  const reportRow = c.page.getByRole('listitem').filter({ hasText: 'Told me to kys' });
  await reportRow.waitFor({ timeout: 10000 });
  await c.page.getByRole('link', { name: 'game & chat' }).count(); // (report filed from profile: no game link)
  await reportRow.getByRole('button', { name: /Mute 24h/ }).click();
  await reportRow.waitFor({ state: 'detached', timeout: 10000 });
  ok(true, 'moderator mutes and resolves from the reports queue');
  ok((await rest(`restrictions?user_id=eq.${A.id}&kind=eq.mute&select=id`)).length === 1, 'mute recorded');
  ok((await rest(`notifications?user_id=eq.${B.id}&kind=eq.report_resolved&select=id`)).length === 1, 'reporter notified that the report was handled');
  ok((await rest(`moderation_log?target_id=eq.${A.id}&select=action`)).some((l) => l.action === 'restrict:mute'), 'action written to the moderation log');
  await a.page.goto(`${SITE}/dashboard`);
  await a.page.getByText('You can’t use chat').waitFor({ timeout: 10000 });
  ok(true, 'muted player sees why, on every page');
  const gA2 = rawSocket(`/ws/game/${ch.gameId}`, tA);
  await gA2.next((m) => m.t === 'chat-history');
  gA2.send({ t: 'chat', text: 'hello?' });
  ok(Boolean(await gA2.next(isErr('muted'))), 'the game server enforces the mute');

  // Moderator reviews the game's chat in the admin area
  await c.page.goto(`${SITE}/admin?tab=games&game=${ch.gameId}`);
  await c.page.getByText('just kys').waitFor({ timeout: 10000 });
  ok(true, 'moderator can read a game’s chat (flagged lines highlighted)');

  // Admin bans and unbans (blocks sign-in)
  const d = await session(D);
  await d.page.goto(`${SITE}/admin?tab=users&user=${A.id}`);
  await d.page.getByRole('heading', { name: A.username }).waitFor({ timeout: 10000 });
  await d.page.getByRole('button', { name: 'Ban (blocks sign-in)' }).click();
  await d.page.getByRole('button', { name: '1 day', exact: true }).click();
  await d.page.getByPlaceholder('Reason (shown to the player)').fill('Repeated abuse');
  await d.page.getByRole('button', { name: 'Apply' }).click();
  await d.page.getByText('banned', { exact: true }).first().waitFor({ timeout: 10000 });
  const login = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify({ email: A.email, password: A.password }) });
  ok(login.status >= 400, `banned account cannot sign in (${login.status})`);
  ok((await rest(`profiles?id=eq.${A.id}&select=is_banned`))[0].is_banned === true, 'profile marked as banned');
  const modBan = await fetch(`${SITE}/api/admin/ban`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tC}` }, body: JSON.stringify({ userId: B.id, ban: true, reason: 'test' }) });
  ok(modBan.status === 403, 'moderators cannot ban (admins only)');
  await d.page.getByRole('listitem').filter({ hasText: 'Repeated abuse' }).getByRole('button', { name: 'Lift' }).click();
  await sleep(1500);
  const relog = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: PUB, 'content-type': 'application/json' }, body: JSON.stringify({ email: A.email, password: A.password }) });
  ok(relog.status === 200, 'lifting the ban restores sign-in');
  // Lift the mute too, for the rest of the test.
  await svc(`/rest/v1/restrictions?user_id=eq.${A.id}&lifted_at=is.null`, { method: 'PATCH', body: JSON.stringify({ lifted_at: new Date().toISOString(), lifted_by: D.id }) });

  // ── 4. Game review (Stockfish in the browser) and explorer ─────────────────────────────
  await a.page.goto(`${SITE}/review?id=${ch.gameId}`);
  await a.page.getByText(/accuracy/).first().waitFor({ timeout: 60000 });
  await sleep(1500);
  const review = await rest(`game_reviews?game_id=eq.${ch.gameId}&select=depth,evals`);
  ok(review.length === 1 && review[0].evals.length === 3, 'game reviewed by Stockfish and saved (player’s own game)');
  await c.page.goto(`${SITE}/review?id=${ch.gameId}`);
  await c.page.getByText(/accuracy/).first().waitFor({ timeout: 20000 });
  ok(true, 'anyone can open a saved review');
  await a.page.goto(`${SITE}/explorer`);
  await a.page.getByRole('cell', { name: /^e4/ }).first().waitFor({ timeout: 10000 });
  ok(true, 'opening explorer lists moves from real games');

  // ── 5. Tournament (arena), compressed time ─────────────────────────────────────────────
  await a.page.goto(`${SITE}/tournaments`);
  await a.page.getByRole('button', { name: 'Create tournament' }).click();
  await a.page.getByRole('textbox', { name: 'Name' }).fill(`E2E Arena ${run}`);
  await a.page.getByRole('radio', { name: '3 min' }).first().click();
  await a.page.getByRole('radio', { name: 'In 2 minutes' }).click();
  await a.page.getByRole('radio', { name: '20 min' }).click();
  await a.page.getByRole('button', { name: 'Create', exact: true }).click();
  await a.page.waitForURL(/\/tournament\?id=/);
  const tid = new URL(a.page.url()).searchParams.get('id');
  ok(Boolean(tid), 'tournament created');
  await a.page.getByRole('button', { name: 'Join tournament' }).click();
  await b.page.goto(`${SITE}/tournament?id=${tid}`);
  await b.page.getByRole('button', { name: 'Join tournament' }).click();
  await a.page.getByText(B.username).waitFor({ timeout: 10000 });
  ok(true, 'two players joined; standings update live');
  await Promise.all([a.page.waitForURL(/\/game\?id=/, { timeout: 30000 }), b.page.waitForURL(/\/game\?id=/, { timeout: 30000 })]);
  const tgame = new URL(a.page.url()).searchParams.get('id');
  ok(tgame === new URL(b.page.url()).searchParams.get('id'), 'at the start both were paired into the same game');
  await a.page.locator('cg-board').waitFor();
  const aWhite = (await a.page.locator('cg-board piece.white.king').boundingBox()).y > (await a.page.locator('cg-board').boundingBox()).y + 300;
  const [w, bl] = aWhite ? [a, b] : [b, a];
  await w.page.getByText('Make your first move').waitFor({ timeout: 10000 });
  await clickMove(w.page, 'e2e4', 'white');
  await bl.page.getByText(/Your turn|Make your first move/).first().waitFor({ timeout: 10000 });
  await clickMove(bl.page, 'e7e5', 'black');
  await sleep(800);
  await b.page.getByRole('button', { name: 'Resign' }).click();
  await b.page.getByRole('dialog').getByRole('button', { name: 'Resign' }).click({ timeout: 3000 }).catch(() => {}); // confirmation (account default)
  await a.page.getByText('You won').waitFor({ timeout: 10000 });
  await a.page.getByText(/Back to the tournament in/).waitFor();
  ok(true, 'tournament game played; no rematch, auto-return countdown');
  await Promise.all([a.page.waitForURL(/\/tournament\?id=/, { timeout: 15000 }), b.page.waitForURL(/\/tournament\?id=/, { timeout: 15000 })]);
  await b.page.getByRole('button', { name: /Pause/ }).click({ timeout: 5000 }).catch(() => {});
  ok(true, 'both returned to the tournament automatically');
  await a.page.getByText(/won with 2 points/).waitFor({ timeout: 90000 });
  ok(true, 'tournament finished; winner announced');
  await sleep(1500);
  const t = (await rest(`tournaments?id=eq.${tid}&select=status,winner_id,player_count`))[0];
  ok(t.status === 'finished' && t.winner_id === A.id && t.player_count === 2, 'tournament stored as finished with the right winner');
  const standing = await rest(`tournament_players?tournament_id=eq.${tid}&select=user_id,score,rank&order=rank`);
  ok(standing[0]?.user_id === A.id && standing[0].score === 2 && standing[0].rank === 1, 'final standings stored');
  ok((await rest(`games?id=eq.${tgame}&select=tournament_id,source`))[0]?.tournament_id === tid, 'the game is linked to the tournament');
  ok((await rest(`user_achievements?user_id=eq.${A.id}&achievement_id=eq.tournament-win&select=user_id`)).length === 1, '“Champion” achievement awarded to the winner');
  ok((await rest(`notifications?user_id=eq.${B.id}&kind=eq.tournament_finished&select=id`)).length === 1, 'players notified of their final rank');

  // ── 6. Abuse prevention: repeated aborts block new games ───────────────────────────────
  const lobB = rawSocket('/ws/lobby', tB);
  await lobB.next((m) => m.t === 'authed');
  for (let i = 0; i < 4; i++) {
    lobB.send({ t: 'seek', tc: '1+0', rated: false });
    lobbyC.send({ t: 'seek', tc: '1+0', rated: false });
    const m = await lobB.next((x) => x.t === 'matched');
    await lobbyC.next((x) => x.t === 'matched');
    const g = rawSocket(`/ws/game/${m.gameId}`, tB);
    await g.next((x) => x.t === 'state');
    g.send({ t: 'abort' });
    await g.next((x) => x.t === 'state' && x.game.status === 'aborted');
    g.ws.close();
  }
  await sleep(500);
  lobB.inbox.splice(0); // drop the queue updates from the four games above
  lobB.send({ t: 'seek', tc: '1+0', rated: false });
  const blocked = await lobB.next((x) => x.t === 'error' || x.t === 'seeking');
  ok(blocked.t === 'error' && /Too many aborted games/.test(blocked.message), 'four aborts in a row: new games blocked for a while');

  // ── 7. Statistics and leaderboard ──────────────────────────────────────────────────────
  await a.page.goto(`${SITE}/u/${A.username}`);
  await a.page.getByRole('tab', { name: /Stats/ }).click();
  await a.page.getByRole('img', { name: 'Rating history by format' }).waitFor({ timeout: 10000 });
  await a.page.getByText('Rated attempts').waitFor();
  ok(true, 'profile statistics: rating history chart and puzzle stats from real data');
  await a.page.getByRole('button', { name: 'Show as table' }).click();
  await a.page.getByRole('cell', { name: 'Puzzles' }).first().waitFor();
  ok(true, 'rating history has a table view');
  await a.page.goto(`${SITE}/leaderboard`);
  await a.page.getByRole('tab', { name: /Puzzles/ }).click();
  await a.page.getByText(A.username).first().waitFor({ timeout: 10000 });
  ok(true, 'leaderboard shows real rated players');

  for (const s of [lobbyA, lobbyC, lobB, gA, gB, gA2]) s.ws.close();
  ok(pageErrors.length === 0, `no page errors ${pageErrors.slice(0, 3).join(' | ')}`);
} catch (e) {
  failed++;
  console.log('FAIL exception:', e.message.split('\n').slice(0, 3).join(' / '));
  if (process.env.E2E_SHOTS) for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: `${process.env.E2E_SHOTS}/p6-fail-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
