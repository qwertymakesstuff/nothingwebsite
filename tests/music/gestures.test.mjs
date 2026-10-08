import test from 'node:test';
import assert from 'node:assert/strict';
import { lockAxis, velocityOf, swipeDirection, THRESHOLDS } from '../../music/js/utils/gestures.js';

test('lockAxis waits for movement, then picks the dominant axis', () => {
  assert.equal(lockAxis(0, 0), null);
  assert.equal(lockAxis(5, 5), null);
  assert.equal(lockAxis(12, 3), 'x');
  assert.equal(lockAxis(-12, 3), 'x');
  assert.equal(lockAxis(3, -12), 'y');
  assert.equal(lockAxis(10, 10), 'x'); // ties go horizontal
  assert.equal(lockAxis(4, 0, 3), 'x'); // custom lock distance
});

test('velocityOf uses only the recent window', () => {
  assert.deepEqual(velocityOf([]), { vx: 0, vy: 0 });
  assert.deepEqual(velocityOf([{ t: 0, x: 0, y: 0 }]), { vx: 0, vy: 0 });
  const slowThenFast = [{ t: 0, x: 0, y: 0 }, { t: 400, x: 10, y: 0 }, { t: 450, x: 60, y: 0 }, { t: 500, x: 110, y: 0 }];
  const v = velocityOf(slowThenFast);
  assert.ok(Math.abs(v.vx - 1) < 1e-9, `vx ${v.vx}`); // 100px / 100ms
  assert.equal(velocityOf([{ t: 5, x: 0, y: 0 }, { t: 5, x: 50, y: 0 }]).vx, 0); // zero dt
  assert.ok(velocityOf([{ t: 0, x: 0, y: 0 }, { t: 50, x: 0, y: -40 }]).vy < 0);
});

test('swipeDirection: long drag, quick flick, and not-enough', () => {
  assert.equal(swipeDirection({ axis: 'x', dx: -100, dy: 5, vx: 0, vy: 0 }), 'left');
  assert.equal(swipeDirection({ axis: 'x', dx: 100, dy: 5, vx: 0, vy: 0 }), 'right');
  assert.equal(swipeDirection({ axis: 'y', dx: 0, dy: -90, vx: 0, vy: 0 }), 'up');
  assert.equal(swipeDirection({ axis: 'y', dx: 0, dy: 90, vx: 0, vy: 0 }), 'down');
  assert.equal(swipeDirection({ axis: 'x', dx: -30, dy: 0, vx: -0.8, vy: 0 }), 'left');   // short but fast
  assert.equal(swipeDirection({ axis: 'x', dx: -10, dy: 0, vx: -2, vy: 0 }), null);        // too short even if fast
  assert.equal(swipeDirection({ axis: 'x', dx: -40, dy: 0, vx: -0.1, vy: 0 }), null);      // slow and short
  assert.equal(swipeDirection({ axis: 'y', dx: 0, dy: 40, vx: 0, vy: 0.1 }), null);
  assert.equal(swipeDirection({ axis: null, dx: 100, dy: 0, vx: 1, vy: 0 }), null);
  assert.equal(swipeDirection({ axis: 'x', dx: -60, dy: 0, vx: 0, vy: 0 }, { distance: 50, speed: 1, minFlick: 20 }), 'left'); // custom
  assert.ok(THRESHOLDS.distance > THRESHOLDS.lock);
});
