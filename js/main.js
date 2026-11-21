import { runLoader } from './loader.js';
import { initReels } from './reels.js';
import { startRD } from './rd.js';

const canvas = document.getElementById('rd-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const noGL = new URLSearchParams(location.search).has('nowebgl');
let rd = null;
if (!reduced && !noGL) {
  try { rd = startRD(canvas); } catch (e) { console.warn('RD disabled:', e); }
}
if (!rd) canvas.classList.add('off');

// The hero starts at its first frame as the loader clears, not part-way through.
runLoader().then(() => initReels());
