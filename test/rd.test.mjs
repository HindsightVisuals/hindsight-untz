import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenToSim, PARALLAX_MAX, BASE_OVERSCAN } from '../js/rd.js';

test('screen centre maps to sim centre plus the offset', () => {
  assert.deepEqual(screenToSim(0.5, 0.5, [0.01, -0.01]), [0.51, 0.49]);
});

test('at full parallax the screen corners still sample inside the texture', () => {
  for (const sx of [0, 1]) for (const sy of [0, 1]) for (const ox of [-PARALLAX_MAX, PARALLAX_MAX]) {
    const [u, v] = screenToSim(sx, sy, [ox, ox], BASE_OVERSCAN);
    assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1, `corner ${sx},${sy} offset ${ox} → ${u},${v}`);
  }
});
