import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickActive, createSound } from '../js/reels-logic.js';

test('pickActive returns the only visible reel', () => {
  assert.equal(pickActive({ demo: 0.9, live: 0 }), 'demo');
});

test('pickActive returns null when nothing clears the threshold', () => {
  assert.equal(pickActive({ demo: 0.2, live: 0.1 }), null);
});

test('pickActive returns the most visible reel', () => {
  assert.equal(pickActive({ demo: 0.4, live: 0.6 }), 'live');
});

test('pickActive breaks a tie toward the first key', () => {
  assert.equal(pickActive({ demo: 0.5, live: 0.5 }), 'demo');
});

test('createSound starts muted', () => {
  assert.equal(createSound().muted, true);
});

test('toggle unmutes, returns the new state and notifies subscribers once', () => {
  const s = createSound();
  const seen = [];
  s.subscribe(m => seen.push(m));
  assert.equal(s.toggle(), false);
  assert.equal(s.muted, false);
  assert.deepEqual(seen, [false]);
});

test('a second toggle mutes again', () => {
  const s = createSound();
  s.toggle();
  assert.equal(s.toggle(), true);
  assert.equal(s.muted, true);
});

test('an unsubscribed listener is not called', () => {
  const s = createSound();
  let calls = 0;
  const off = s.subscribe(() => calls++);
  off();
  s.toggle();
  assert.equal(calls, 0);
});
