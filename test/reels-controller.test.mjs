import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReelController } from '../js/reels-logic.js';

// A stub <video>: play() flips paused and returns a promise the test settles; pause() rejects a pending play
// with AbortError, as browsers do.
function stubVideo() {
  const v = {
    paused: true, muted: true, plays: 0, pending: null,
    play() {
      v.plays++; v.paused = false;
      let res, rej;
      const p = new Promise((a, b) => { res = a; rej = b; });
      v.pending = { res, rej };
      return p;
    },
    pause() {
      v.paused = true;
      if (v.pending) { const e = new Error('aborted'); e.name = 'AbortError'; v.pending.rej(e); v.pending = null; }
    },
  };
  return v;
}
const tick = () => new Promise(r => setTimeout(r, 0));
function setup() {
  const demo = stubVideo(), live = stubVideo();
  const states = { demo: [], live: [] };
  const c = createReelController([
    { key: 'demo', video: demo, onState: s => states.demo.push(s) },
    { key: 'live', video: live, onState: s => states.live.push(s) },
  ]);
  return { c, demo, live, states };
}

test('unmuting unlocks the off-screen reel without leaving it playing', async () => {
  const { c, demo, live } = setup();
  c.setRatio('demo', 1); c.apply();
  demo.pending.res();
  c.activate('demo');
  assert.equal(c.sound.muted, false);
  assert.equal(live.plays, 1, 'off-screen reel got play() inside the gesture');
  assert.equal(live.paused, true, 'and was paused in the same tick');
  assert.equal(demo.paused, false, 'the tapped reel keeps playing');
  assert.equal(demo.muted, false);
  assert.equal(live.muted, false);
  await tick();
});

test('a late-settling unlock never pauses the reel scrolled to', async () => {
  const { c, demo, live } = setup();
  c.setRatio('demo', 1); c.apply(); demo.pending.res();
  c.activate('demo');
  c.setRatio('demo', 0); c.setRatio('live', 1); c.apply();
  assert.equal(live.paused, false);
  live.pending.res(); await tick();
  assert.equal(live.paused, false);
  assert.equal(demo.paused, true);
});

test('a play() aborted by scrolling away does not mark the reel as blocked', async () => {
  const { c, states } = setup();
  c.setRatio('demo', 1); c.apply();
  c.setRatio('demo', 0); c.apply();
  await tick();
  assert.ok(!states.demo.includes('blocked'));
});

test('a NotAllowedError marks the reel blocked, and a later success clears it', async () => {
  const { c, demo, states } = setup();
  c.setRatio('demo', 1); c.apply();
  const e = new Error('no'); e.name = 'NotAllowedError'; demo.pending.rej(e); demo.paused = true;
  await tick();
  assert.equal(states.demo.at(-1), 'blocked');
  c.activate('demo');
  demo.pending.res(); await tick();
  assert.equal(states.demo.at(-1), 'playing');
  assert.equal(c.sound.muted, true, 'the unblocking tap starts playback, it does not flip sound');
});

test('tapping a blocked reel that is not active does not start it', async () => {
  const { c, demo, live } = setup();
  c.setRatio('live', 1); c.apply();
  const e = new Error('no'); e.name = 'NotAllowedError'; live.pending.rej(e); live.paused = true;
  c.setRatio('live', 0); c.setRatio('demo', 1); c.apply(); demo.pending.res();
  await tick();
  c.activate('live');
  assert.equal(live.paused, true);
  assert.equal(demo.paused, false);
});

test('a reel paused by the system while active is restarted', async () => {
  const { c, demo } = setup();
  c.setRatio('demo', 1); c.apply(); demo.pending.res(); await tick();
  demo.paused = true; demo.pending = null;
  c.onSystemPause('demo'); await tick();
  assert.equal(demo.paused, false);
});

test('never two reels unpaused at once across a scroll sequence', () => {
  const { c, demo, live } = setup();
  for (const [d, l] of [[1, 0], [0.6, 0.4], [0.3, 0.7], [0, 1], [0.5, 0.5], [0, 0]]) {
    c.setRatio('demo', d); c.setRatio('live', l); c.apply();
    assert.ok([demo, live].filter(v => !v.paused).length <= 1, `${d},${l}`);
  }
});

test('onActive fires with the new key only when the active reel changes', () => {
  const seen = [];
  const mk = () => ({ paused: true, muted: true, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } });
  const c = createReelController([
    { key: 'demo', video: mk(), onState() {} },
    { key: 'live', video: mk(), onState() {} },
  ], { onActive: k => seen.push(k) });
  c.setRatio('demo', 1); c.apply();
  c.setRatio('demo', 0.9); c.apply();
  c.setRatio('demo', 0); c.setRatio('live', 1); c.apply();
  c.setRatio('live', 0); c.apply();
  assert.deepEqual(seen, ['demo', 'live', null]);
});
