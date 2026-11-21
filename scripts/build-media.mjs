// Compresses the Hindsight source media (read only, in Dropbox) into media/ for the site.
// Run: npm run media. Skips any output newer than its source.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

const ROOT = 'C:/Users/Adam/Dropbox/Hindsight/01_Portfolio Site/00_Assets and Content';
const PHOTOS = `${ROOT}/00_Images`;
const ZIP_DIR = '.cache/zip';
const MB = 1024 * 1024;

const VIDEOS = [
  { name: 'loader', src: `${ROOT}/03_Brand Assets/LogoAnimation.mp4`, budget: 3 * MB, audio: false },
  { name: 'demo-reel', src: `${ROOT}/01_Video/Hindsight_DemoReel2024.mp4`, budget: 25 * MB, audio: true, posterAt: 12 },
  { name: 'live-reel', src: `${ROOT}/01_Video/Hindsight_LiveReel2026.mp4`, budget: 25 * MB, audio: true, posterAt: 72 },
];

const fresh = (out, src) => fs.existsSync(out) && fs.statSync(out).mtimeMs > fs.statSync(src).mtimeMs;

function run(args) {
  const r = spawnSync(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(' ')}`);
}

function encode({ name, src, budget, audio, posterAt = 1 }) {
  const out = `media/video/${name}.mp4`;
  if (!fresh(out, src)) {
    // Past CRF 30 at 1080p, motion-heavy visuals go blocky; 720p at a sane CRF looks better at the same size.
    const LADDER = [[1080, 26], [1080, 28], [1080, 30], [720, 26], [720, 28], [720, 30], [720, 32], [720, 34]];
    for (const [height, crf] of LADDER) {
      run(['-i', src, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
        '-vf', `scale=-2:'min(${height},ih)'`, '-movflags', '+faststart',
        ...(audio ? ['-c:a', 'aac', '-b:a', '160k'] : ['-an']), out]);
      const s = fs.statSync(out).size;
      console.log(`${name}: ${height}p crf ${crf} → ${(s / MB).toFixed(1)} MB`);
      if (s < budget) break;
    }
  } else console.log(`${name}: up to date`);
  if (audio) {
    const poster = `media/video/${name}-poster.jpg`;
    if (!fresh(poster, src)) run(['-ss', String(posterAt), '-i', src, '-frames:v', '1', '-vf', "scale=-2:'min(1080,ih)'", '-q:v', '4', poster]);
  }
}

async function photos() {
  const picks = JSON.parse(fs.readFileSync('scripts/photos.json', 'utf8'));
  for (const { src, slug } of picks) {
    const [kind, file] = src.split(':');
    const from = kind === 'zip' ? path.join(ZIP_DIR, file) : path.join(PHOTOS, file);
    if (!fs.existsSync(from)) throw new Error(`missing photo ${from} (zip not extracted to ${ZIP_DIR}?)`);
    for (const w of [1600, 800]) {
      const out = `media/img/${slug}-${w}.webp`;
      if (fresh(out, from)) continue;
      await sharp(from).rotate().resize(w, w, { fit: 'inside' }).webp({ quality: 78 }).toFile(out);
    }
  }
  console.log(`photos: ${picks.length}`);
}

fs.mkdirSync('media/video', { recursive: true });
fs.mkdirSync('media/img', { recursive: true });
for (const v of VIDEOS) encode(v);
await photos();
