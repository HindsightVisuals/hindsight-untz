import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const MB = 1024 * 1024;
const size = p => fs.statSync(p).size;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);

test('loader video exists and is under 3 MB', () => {
  assert.ok(size('media/video/loader.mp4') < 3 * MB);
});

test('both reels exist and are each under 25 MB', () => {
  for (const r of ['demo-reel', 'live-reel']) assert.ok(size(`media/video/${r}.mp4`) < 25 * MB, r);
});

test('both reel posters exist', () => {
  for (const r of ['demo-reel', 'live-reel']) assert.ok(size(`media/video/${r}-poster.jpg`) > 0, r);
});

test('exactly 10 photos at 1600 and 800', () => {
  const img = fs.readdirSync('media/img');
  assert.equal(img.filter(f => f.endsWith('-1600.webp')).length, 10);
  assert.equal(img.filter(f => f.endsWith('-800.webp')).length, 10);
});

test('no file under media/ is 50 MB or more', () => {
  for (const f of walk('media')) assert.ok(size(f) < 50 * MB, f);
});

test('reel posters show footage, not the near-black logo sting', async () => {
  const sharp = (await import('sharp')).default;
  for (const r of ['demo-reel', 'live-reel']) {
    const { channels } = await sharp(`media/video/${r}-poster.jpg`).stats();
    const mean = channels.slice(0, 3).reduce((n, c) => n + c.mean, 0) / 3;
    assert.ok(mean > 30, `${r} poster mean brightness ${mean.toFixed(1)}`);
  }
});
