// End-to-end test of accounts and progression against a REAL Supabase stack (local Docker:
// Postgres, GoTrue auth, PostgREST, Storage, Mailpit) and the real Worker (wrangler dev).
// Nothing is mocked. See e2e/README.md for how to run it.

import { chromium } from 'playwright';

const SITE = process.env.SITE ?? 'http://127.0.0.1:8787';
const SB = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const PUB = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY; // test harness only (creating a second user, checking rows)
const MAIL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';
if (!PUB || !SECRET) throw new Error('Set SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY (from supabase status).');

const AVATAR_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAcUlEQVR4nO3RwQmAMAAEwUSs0PLsxsqSInwMgR2ugIOd3/usMc/dNQ53j6Uv/FMBrQJaBbQKaBXQKqBVQKuAVgGtAloFtApoFdAqoFVAq4BWAa0CWgW0CmgV0CqgVUCrgFYBrQJaBbQKaBXQKqAdX2ADaWFgTFdBQpkAAAAASUVORK5CYII=', 'base64');
const run = Date.now().toString(36);
const A = { username: `e2e_a_${run}`, email: `a-${run}@example.test`, password: 'Correct-Horse-9' };
const B = { username: `e2e_b_${run}`, email: `b-${run}@example.test`, password: 'Battery-Staple-7' };
let passed = 0;
let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
  cond ? passed++ : failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mailLink(to, kind) {
  // Links point at /auth/confirm (see packages/db/supabase/templates); kind is the link's `type`.
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`);
    const { messages = [] } = await res.json();
    for (const m of messages) {
      const full = await (await fetch(`${MAIL}/api/v1/message/${m.ID}`)).json();
      const body = (full.HTML || '') + ' ' + (full.Text || '');
      for (const raw of body.match(/https?:\/\/[^\s"'<>]+\/auth\/confirm\?[^\s"'<>]+/g) ?? []) {
        const url = new URL(raw.replaceAll('&amp;', '&'));
        if (url.searchParams.get('type') === kind) return `${SITE}${url.pathname}${url.search}`;
      }
    }
    await sleep(500);
  }
  throw new Error(`No ${kind} email for ${to}`);
}

const rest = (path, { token, method = 'GET', body, key = PUB, prefer } = {}) =>
  fetch(`${SB}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json', ...(prefer ? { prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

async function fillDob(page, d, m, y) {
  await page.getByRole('button', { name: 'Day' }).click();
  await page.getByRole('option', { name: String(d), exact: true }).click();
  await page.getByRole('button', { name: 'Month' }).click();
  await page.getByRole('option', { name: m, exact: true }).click();
  await page.getByRole('button', { name: 'Year' }).click();
  await page.getByRole('option', { name: String(y), exact: true }).click();
}

async function signIn(page, who, password = who.password) {
  await page.goto(`${SITE}/login`);
  await page.getByLabel('Email').fill(who.email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

const token = (page) =>
  page.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.startsWith('sb-') && x.endsWith('-auth-token'));
    return k ? JSON.parse(localStorage.getItem(k)).access_token : null;
  });

const browser = await chromium.launch();
const errors = [];
const newPage = async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('rookery.preferences.v1', JSON.stringify({ botMoveSpeed: 'instant', confirmResign: false })));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  return p;
};

try {
  // ── Registration ─────────────────────────────────────────────────────────────────────
  const page = await newPage();
  await page.goto(`${SITE}/signup`);
  await page.getByLabel('Username').fill('admin');
  await page.getByText('unavailable').waitFor();
  ok(true, 'reserved username reported unavailable');
  await page.getByLabel('Username').fill(A.username);
  await page.getByText('available', { exact: true }).waitFor();
  ok(true, 'free username reported available');
  await page.getByLabel('Email').fill(A.email);
  await page.getByLabel('Password').fill(A.password);
  await fillDob(page, 14, 'March', 1995);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByText('Check your email').waitFor();
  ok(true, 'sign-up asks for email verification');

  // Unverified accounts cannot sign in
  await signIn(page, A);
  await page.getByText(/verify your email/i).waitFor();
  ok(true, 'unverified account cannot sign in');

  // ── Email verification ───────────────────────────────────────────────────────────────
  const verifyLink = await mailLink(A.email, 'email');
  await fetch(verifyLink); // an email security scanner "pre-opening" the link must not use it up
  await page.goto(verifyLink);
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
  await page.getByText(new RegExp(A.username)).first().waitFor();
  ok(true, 'verification link signs in and opens the dashboard');
  const tokA = await token(page);
  const me = await (await fetch(`${SB}/auth/v1/user`, { headers: { apikey: PUB, authorization: `Bearer ${tokA}` } })).json();
  const ratings = await (await rest(`ratings?user_id=eq.${me.id}&select=category,rating`)).json();
  ok(ratings.length === 5 && ratings.every((r) => Number(r.rating) === 500), 'profile created with 5 provisional ratings of 500');

  // ── Settings persist to the account (and follow to a new device) ────────────────────
  await page.goto(`${SITE}/settings`);
  await page.getByRole('button', { name: /Walnut/ }).click();
  await page.getByText('Saved to your account').waitFor({ timeout: 10000 });
  let srow = [];
  for (let i = 0; i < 20 && srow[0]?.board_theme !== 'walnut'; i++) {
    await sleep(250);
    srow = await (await rest(`user_settings?user_id=eq.${me.id}&select=board_theme`, { key: SECRET })).json();
  }
  ok(srow[0]?.board_theme === 'walnut', 'board theme saved in the database');
  const other = await newPage();
  await signIn(other, A);
  await other.waitForURL(/\/dashboard/);
  await other.goto(`${SITE}/settings`);
  await sleep(800);
  ok((await other.locator('.rk-board.theme-walnut').count()) > 0, 'settings follow the account to a fresh browser');

  // ── Profile editing + avatar ─────────────────────────────────────────────────────────
  await page.goto(`${SITE}/settings?section=profile`);
  await page.getByLabel('Display name').fill('Alice E2E');
  await page.getByLabel(/^Bio/).fill('Testing all the things.');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.getByText('Profile saved.').waitFor();
  await page.locator('#avatar-file').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: AVATAR_PNG });
  await page.getByText('Avatar updated.').waitFor({ timeout: 15000 });
  await page.goto(`${SITE}/u/${A.username}`);
  await page.getByText('Alice E2E').waitFor();
  const avatarSrc = await page.locator(`img[src*="/avatars/${me.id}/"]`).first().getAttribute('src');
  ok(avatarSrc && (await fetch(avatarSrc)).status === 200, 'profile shows edits and the uploaded avatar');

  // ── A bot game is validated by the server and saved; achievements are awarded ───────
  await page.goto(`${SITE}/bots?bot=pip`);
  await page.getByRole('radio', { name: 'White' }).click();
  await page.getByRole('button', { name: /^Play / }).click();
  await page.getByRole('button', { name: 'Resign' }).waitFor();
  const box = await page.locator('cg-board').boundingBox();
  const z = box.width / 8;
  const sq = (s) => ({ x: box.x + (s.charCodeAt(0) - 97 + 0.5) * z, y: box.y + (8 - Number(s[1]) + 0.5) * z });
  for (const [a, c] of [['e2', 'e4'], ['d2', 'd4']]) {
    await page.mouse.click(sq(a).x, sq(a).y);
    await page.mouse.click(sq(c).x, sq(c).y);
    await sleep(900);
  }
  await page.getByRole('button', { name: 'Resign' }).click();
  // Account settings (server copy) win over this device, so the confirm dialog may appear.
  const confirm = page.getByRole('dialog').getByRole('button', { name: 'Resign' });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  else await confirm.click({ timeout: 2000 }).catch(() => {});
  await page.getByText('Saved to your profile.').waitFor({ timeout: 15000 });
  await page.getByText(/Achievement unlocked: First move/).waitFor();
  ok(true, 'finished bot game saved to the account; "First move" unlocked');

  // A genuine win (scholar's mate) through the same API the game screen uses
  const scholar = { clientRef: `e2e-${run}-mate`, botId: 'pip', playerColor: 'white', timeControl: 'none', initialFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', moves: ['e2e4', 'e7e5', 'f1c4', 'b8c6', 'd1h5', 'g8f6', 'h5f7'], result: '1-0', termination: 'checkmate' };
  const post = (body, tok = tokA) => fetch(`${SITE}/api/games`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body) });
  const win = await post(scholar);
  const winBody = await win.json();
  ok(win.status === 201 && winBody.achievements.includes('first-win') && winBody.achievements.includes('quick-mate'), 'real checkmate accepted; first-win + quick-mate awarded');
  ok((await (await post(scholar)).json()).duplicate === true, 'resubmitting the same game is ignored');
  await page.goto(`${SITE}/u/${A.username}`);
  await page.getByRole('tab', { name: /Games/ }).waitFor();
  const gamesCount = await page.locator('tbody tr').count();
  ok(gamesCount === 2, `profile lists the 2 recorded games (${gamesCount})`);
  ok(await page.getByText('50%').count() > 0, 'win rate computed (1 win, 1 loss = 50%)');

  // ── Security: the server never trusts the client ─────────────────────────────────────
  ok((await post({ ...scholar, clientRef: `e2e-${run}-forged`, result: '0-1' })).status === 422, 'forged result rejected (422)');
  ok((await post({ ...scholar, clientRef: `e2e-${run}-illegal`, moves: ['e2e5'] })).status === 422, 'illegal move rejected (422)');
  ok((await post({ ...scholar, clientRef: `e2e-${run}-quick`, moves: ['e2e4', 'e7e5'], termination: 'resign', result: '1-0' })).status === 422, 'implausibly quick "bot resigned" win rejected');
  ok((await post(scholar, null)).status === 401, 'no session → 401');
  ok((await post(scholar, 'not-a-real-token')).status === 401, 'forged token → 401');

  // Second user, created through the admin API (test harness only)
  const created = await fetch(`${SB}/auth/v1/admin/users`, { method: 'POST', headers: { apikey: SECRET, authorization: `Bearer ${SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ email: B.email, password: B.password, email_confirm: true, user_metadata: { username: B.username, birth_date: '1990-01-01' } }) });
  const bUser = await created.json();
  ok(created.status === 200 && bUser.id, 'second user created');

  const insertGame = await rest('games', { token: tokA, method: 'POST', body: { white_id: me.id, bot_id: 'corvus', source: 'bot', category: 'untimed', time_control: 'none', initial_fen: 'x', plies: 1, result: '1-0', termination: 'resign' } });
  ok(insertGame.status === 401 || insertGame.status === 403, `client cannot insert games directly (${insertGame.status})`);
  const rate = await rest(`ratings?user_id=eq.${me.id}&category=eq.blitz`, { token: tokA, method: 'PATCH', body: { rating: 3000 }, prefer: 'return=representation' });
  ok(rate.status === 401 || rate.status === 403, `client cannot change its rating (${rate.status})`);
  const award = await rest('rpc/award_achievements', { token: tokA, method: 'POST', body: { p_user: me.id } });
  ok(award.status === 401 || award.status === 403 || award.status === 404, `client cannot award achievements (${award.status})`);
  const otherProfile = await rest(`profiles?id=eq.${bUser.id}`, { token: tokA, method: 'PATCH', body: { bio: 'hacked' }, prefer: 'return=representation' });
  ok(otherProfile.ok && (await otherProfile.json()).length === 0, "cannot edit another player's profile");
  const privB = await (await rest(`user_private?user_id=eq.${bUser.id}`, { token: tokA })).json();
  ok(Array.isArray(privB) && privB.length === 0, "cannot read another player's private data");
  const setB = await (await rest(`user_settings?user_id=eq.${bUser.id}`, { token: tokA })).json();
  ok(Array.isArray(setB) && setB.length === 0, "cannot read another player's settings");
  const badTheme = await rest(`user_settings?user_id=eq.${me.id}`, { token: tokA, method: 'PATCH', body: { board_theme: 'neon' } });
  ok(badTheme.status === 400, 'invalid setting value rejected by the database');
  const upB = await fetch(`${SB}/storage/v1/object/avatars/${bUser.id}/evil.png`, { method: 'POST', headers: { apikey: PUB, authorization: `Bearer ${tokA}`, 'content-type': 'image/png' }, body: AVATAR_PNG });
  ok(upB.status >= 400, `cannot upload into another player's avatar folder (${upB.status})`);
  const bundle = await (await fetch(`${SITE}/`)).text();
  ok(!bundle.includes('sb_secret_') && !bundle.includes(SECRET), 'secret key not present in the site');

  // ── Logout and protected routes ─────────────────────────────────────────────────────
  await page.goto(`${SITE}/dashboard`);
  await page.locator('button[aria-label="Account"]:visible').first().click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await page.waitForURL(`${SITE}/`);
  await page.goto(`${SITE}/dashboard`);
  await page.waitForURL(/\/login\?next=%2Fdashboard/, { timeout: 10000 });
  ok(true, 'signed out; /dashboard redirects to sign in');

  // ── Password recovery ───────────────────────────────────────────────────────────────
  await page.goto(`${SITE}/forgot-password`);
  await page.getByLabel('Email').fill(A.email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await page.getByText(/reset link is on its way/).waitFor();
  await page.goto(await mailLink(A.email, 'recovery'));
  await page.getByText('Choose a new password').waitFor({ timeout: 15000 });
  await page.getByLabel('New password', { exact: true }).fill('Brand-New-Pass-4');
  await page.getByLabel('Confirm new password').fill('Brand-New-Pass-4');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  ok(true, 'password reset via emailed link');
  const fresh = await newPage();
  await signIn(fresh, A, A.password);
  await fresh.getByText(/don’t match an account/).waitFor();
  await signIn(fresh, A, 'Brand-New-Pass-4');
  await fresh.waitForURL(/\/dashboard/);
  ok(true, 'old password rejected, new password works');

  // ── Under-13 sign-up is refused ─────────────────────────────────────────────────────
  const kid = await newPage();
  await kid.goto(`${SITE}/signup`);
  await kid.getByLabel('Username').fill(`e2e_k_${run}`);
  await kid.getByText('available', { exact: true }).waitFor();
  await kid.getByLabel('Email').fill(`k-${run}@example.test`);
  await kid.getByLabel('Password').fill('Kid-Password-1');
  await fillDob(kid, 1, 'January', new Date().getFullYear() - 10);
  await kid.getByRole('button', { name: 'Create account' }).click();
  await kid.getByText('You’re not able to create an account right now.').waitFor();
  ok(true, 'under-13 sign-up refused (neutral message)');

  // ── Account deletion ─────────────────────────────────────────────────────────────────
  await fresh.goto(`${SITE}/settings?section=account`);
  await fresh.getByRole('button', { name: 'Delete my account' }).click();
  await fresh.getByLabel(/to confirm/).fill(A.username);
  await fresh.getByRole('button', { name: 'Delete forever' }).click();
  await fresh.waitForURL(/\?deleted=1/, { timeout: 15000 });
  const gone = await (await rest(`profiles?username=eq.${A.username}`)).json();
  ok(gone.length === 0, 'account deleted: profile gone');
  await fresh.goto(`${SITE}/u/${A.username}`);
  await fresh.getByText('No player by that name').waitFor();
  ok(true, 'deleted profile shows "No player by that name"');

  ok(errors.length === 0, `no page errors ${errors.slice(0, 3).join(' | ')}`);
} catch (e) {
  failed++;
  console.log('FAIL exception:', e.message.split('\n').slice(0, 3).join(' / '));
  if (process.env.E2E_SHOTS) for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) await p.screenshot({ path: `${process.env.E2E_SHOTS}/fail-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}
