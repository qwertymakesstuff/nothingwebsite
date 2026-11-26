import { describe, expect, it } from 'vitest';
import type { PlayerInfo } from '@rookery/protocol';
import * as R from '../src/game/room';

const p = (id: string, rating = 1500): PlayerInfo => ({ id, username: id, displayName: null, avatarPath: null, country: null, rating, provisional: true });
const W = p('white-user');
const B = p('black-user');
const TC = { id: '3+2', initialMs: 180_000, incrementMs: 2_000, category: 'blitz' as const };
const T0 = 1_000_000;

function game(now = T0) {
  return R.createRoom({ id: 'game00000001', source: 'online', rated: true, tc: TC, white: W, black: B, now });
}

/** Plays `moves` alternately, `gap` ms apart, asserting each is accepted. */
function play(s: R.RoomState, moves: string[], startAt = T0, gap = 1000) {
  let now = startAt;
  for (const uci of moves) {
    now += gap;
    const color = s.moves.length % 2 === 0 ? 'white' : 'black';
    const step = R.move(s, color, uci, s.moves.length, now);
    expect(step.error, `${uci}`).toBeUndefined();
    s = step.state;
  }
  return { s, now };
}

describe('game room: moves', () => {
  it('accepts legal moves in turn and ends on checkmate', () => {
    const { s } = play(game(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(s.status).toBe('ended');
    expect(s.result).toBe('0-1');
    expect(s.termination).toBe('checkmate');
  });

  it('rejects illegal moves, moves out of turn and moves after the game', () => {
    const s = game();
    expect(R.move(s, 'white', 'e2e5', 0, T0 + 1).error).toBe('illegal_move');
    expect(R.move(s, 'black', 'e7e5', 0, T0 + 1).error).toBe('not_your_turn');
    const { s: over } = play(game(), ['f2f3', 'e7e5', 'g2g4', 'd8h4']);
    expect(R.move(over, 'white', 'e2e4', 4, T0 + 99_000).error).toBe('not_active');
  });

  it('rejects duplicated and replayed moves (stale ply)', () => {
    const { s } = play(game(), ['e2e4', 'e7e5']);
    expect(R.move(s, 'white', 'e2e4', 0, T0 + 5000).error).toBe('stale'); // replay of move 1
    expect(R.move(s, 'white', 'g1f3', 1, T0 + 5000).error).toBe('stale');
    const ok = R.move(s, 'white', 'g1f3', 2, T0 + 5000);
    expect(ok.error).toBeUndefined();
    expect(R.move(ok.state, 'white', 'g1f3', 2, T0 + 5001).error).toBe('stale'); // the same message twice
  });
});

describe('game room: clocks are the server’s', () => {
  it('starts clocks after both first moves, charges real elapsed time and adds the increment', () => {
    let s = game();
    s = R.move(s, 'white', 'e2e4', 0, T0 + 10_000).state;
    s = R.move(s, 'black', 'e7e5', 1, T0 + 20_000).state;
    expect(s.clock.running).toBe('white');
    expect(s.clock.whiteMs).toBe(180_000); // no time used for first moves
    s = R.move(s, 'white', 'g1f3', 2, T0 + 32_000).state; // white thought 12 s
    expect(s.clock.whiteMs).toBe(180_000 - 12_000 + 2_000);
    const v = R.view(s, 'black', { white: true, black: true }, T0 + 35_000);
    expect(v.clock.blackMs).toBe(180_000 - 3_000);
  });

  it('a flag falls on the server even if nobody sends anything', () => {
    const { s, now } = play(game(), ['e2e4', 'e7e5', 'g1f3']);
    expect(R.nextDeadline(s)).toBe(now + 180_000);
    const flagged = R.settle(s, now + 180_000);
    expect(flagged.ended).toBe(true);
    expect(flagged.state.result).toBe('1-0');
    expect(flagged.state.termination).toBe('timeout');
  });

  it('a move that arrives after the flag loses on time instead of being played', () => {
    const { s, now } = play(game(), ['e2e4', 'e7e5', 'g1f3']);
    const late = R.move(s, 'black', 'b8c6', 3, now + 181_000);
    expect(late.state.termination).toBe('timeout');
    expect(late.state.moves.length).toBe(3);
  });
});

describe('game room: first moves, aborts and abandonment', () => {
  it('aborts when a player never makes a first move', () => {
    const s = game();
    expect(R.settle(s, T0 + 29_999).state.status).toBe('active');
    expect(R.settle(s, T0 + 30_000).state.status).toBe('aborted');
    const one = R.move(s, 'white', 'e2e4', 0, T0 + 5_000).state;
    expect(R.settle(one, T0 + 34_000).state.status).toBe('active');
    expect(R.settle(one, T0 + 35_000).state.status).toBe('aborted');
  });

  it('abort only before both sides moved; resigning that early aborts', () => {
    const one = R.move(game(), 'white', 'e2e4', 0, T0 + 1000).state;
    expect(R.abort(one, T0 + 2000).state.status).toBe('aborted');
    expect(R.resign(one, 'black', 1, T0 + 2000).state.status).toBe('aborted');
    const { s } = play(game(), ['e2e4', 'e7e5']);
    expect(R.abort(s, T0 + 9000).error).toBe('too_late_to_abort');
  });

  it('a disconnected player loses after the grace period, unless they come back', () => {
    const { s, now } = play(game(), ['e2e4', 'e7e5', 'g1f3', 'b8c6']);
    const away = R.presence(s, 'black', false, now).state;
    expect(R.view(away, 'white', { white: true, black: false }, now).away).toEqual({ color: 'black', deadline: now + 60_000 });
    const back = R.presence(away, 'black', true, now + 30_000).state;
    expect(R.settle(back, now + 61_000).state.status).toBe('active');
    const gone = R.settle(away, now + 60_000);
    expect(gone.state.result).toBe('1-0');
    expect(gone.state.termination).toBe('abandon');
  });
});

describe('game room: resign, draws, rematch', () => {
  it('resignation ends the game for the opponent', () => {
    const { s } = play(game(), ['e2e4', 'e7e5']);
    const r = R.resign(s, 'white', 2, T0 + 9000);
    expect(r.ended).toBe(true);
    expect(r.state.result).toBe('0-1');
    expect(R.resign(r.state, 'white', 2, T0 + 9001).error).toBe('not_active'); // replayed resign
  });

  it('draw offers: offer, accept at the same position, decline, no spam, moving declines', () => {
    const { s } = play(game(), ['e2e4', 'e7e5']);
    const offered = R.draw(s, 'white', 'offer', 2, T0 + 9000).state;
    expect(offered.drawOffer).toEqual({ by: 'white', ply: 2 });
    expect(R.draw(offered, 'white', 'accept', 2, T0 + 9000).error).toBe('no_offer'); // can't accept your own
    expect(R.draw(offered, 'black', 'accept', 1, T0 + 9000).error).toBe('stale');
    const accepted = R.draw(offered, 'black', 'accept', 2, T0 + 9500);
    expect(accepted.state.termination).toBe('agreement');
    expect(accepted.state.result).toBe('1/2-1/2');
    const declined = R.draw(offered, 'black', 'decline', 2, T0 + 9500).state;
    expect(declined.drawOffer).toBeNull();
    expect(R.draw(declined, 'white', 'offer', 2, T0 + 9600).error).toBe('too_soon');
    const movedOn = R.move(offered, 'white', 'g1f3', 2, T0 + 9500).state;
    expect(movedOn.drawOffer).toEqual({ by: 'white', ply: 2 }); // own offer stands after own move
    const answeredByMove = R.move(movedOn, 'black', 'b8c6', 3, T0 + 9900).state;
    expect(answeredByMove.drawOffer).toBeNull();
  });

  it('rematch needs both players and only after the game', () => {
    const { s } = play(game(), ['e2e4', 'e7e5']);
    expect(R.rematch(s, 'white', 'offer').error).toBe('not_finished');
    const over = R.resign(s, 'white', 2, T0 + 9000).state;
    const offered = R.rematch(over, 'white', 'offer').state;
    expect(R.rematch(offered, 'white', 'accept').error).toBe('no_offer');
    expect(R.rematch(offered, 'black', 'accept').rematch).toBe(true);
    expect(R.rematch(offered, 'black', 'offer').rematch).toBe(true); // crossing offers = accept
    expect(R.rematch(offered, 'black', 'decline').state.rematch.declined).toBe(true);
  });
});

describe('game room: challenges', () => {
  const waiting = () => R.createRoom({ id: 'game00000003', source: 'challenge', rated: false, tc: TC, white: W, black: null, creator: 'white', invited: { userId: 'black-user', username: 'black-user' }, now: T0 });

  it('only the invited player can take the seat; then the game starts', () => {
    const s = waiting();
    expect(s.status).toBe('waiting');
    expect(R.join(s, p('stranger'), T0 + 1).error).toBe('not_invited');
    const joined = R.join(s, B, T0 + 1);
    expect(joined.state.status).toBe('active');
    expect(joined.state.black?.id).toBe('black-user');
    expect(R.join(joined.state, p('late'), T0 + 2).error).toBe('seat_taken');
  });

  it('can be cancelled by the challenger, declined by the invitee, and expires', () => {
    expect(R.cancel(waiting(), 'white').state.status).toBe('cancelled');
    expect(R.cancel(waiting(), 'black').error).toBe('not_allowed');
    expect(R.decline(waiting(), 'black-user').state.status).toBe('declined');
    expect(R.decline(waiting(), 'someone-else').error).toBe('not_allowed');
    expect(R.settle(waiting(), T0 + 2 * 60 * 60_000).state.status).toBe('expired');
  });
});
