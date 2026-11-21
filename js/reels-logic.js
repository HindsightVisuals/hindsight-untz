// Pure logic for the two reels: which one plays, and the page-wide sound setting.

/** The key with the highest visible ratio at or above minRatio; ties go to the earlier key. null if none qualify. */
export function pickActive(ratios, minRatio = 0.35) {
  let best = null;
  let bestRatio = -1;
  for (const [key, ratio] of Object.entries(ratios)) {
    if (ratio >= minRatio && ratio > bestRatio) { best = key; bestRatio = ratio; }
  }
  return best;
}

/**
 * Playback for a set of reels: only the most-visible one plays, sound is shared, and a tap unmutes.
 * reels: [{ key, video, onState(state) }] where state is 'playing' | 'blocked'. DOM-free so it can be tested
 * with stub videos; js/reels.js feeds it intersection ratios and events.
 */
export function createReelController(reels, { minRatio = 0.35, onActive = () => {} } = {}) {
  const sound = createSound();
  const ratios = Object.fromEntries(reels.map(r => [r.key, 0]));
  const blocked = new Set();
  let active = null;
  let hidden = false;

  sound.subscribe(muted => { for (const r of reels) r.video.muted = muted; });

  // Only a NotAllowedError means autoplay is blocked. An AbortError just means we paused it before it started.
  function tryPlay(r) {
    const p = r.video.play();
    if (!p) return;
    p.then(
      () => { blocked.delete(r.key); r.onState('playing'); },
      e => { if (e && e.name === 'NotAllowedError') { blocked.add(r.key); r.onState('blocked'); } },
    );
  }

  function apply() {
    const next = hidden ? null : pickActive(ratios, minRatio);
    if (next !== active) { active = next; onActive(active); }
    for (const r of reels) {
      if (r.key === active) { if (r.video.paused && !blocked.has(r.key)) tryPlay(r); }
      else if (!r.video.paused) r.video.pause();
    }
  }

  /** A tap or click on a reel. */
  function activate(key) {
    const r = reels.find(x => x.key === key);
    if (!r) return;
    // A blocked reel's tap starts playback rather than flipping sound, and only if it's the one on screen.
    if (blocked.has(key)) { if (key === active) tryPlay(r); return; }
    sound.toggle();
    // iOS lets an element play with sound later only if play() ran inside a gesture. Calling play() and pause()
    // in the same tick unlocks each off-screen reel without it ever starting, so nothing is heard and the
    // on-screen reel isn't pre-empted.
    for (const other of reels) {
      if (other.key === active) continue;
      const p = other.video.play();
      other.video.pause();
      if (p) p.catch(() => {});
    }
  }

  return {
    sound,
    apply,
    activate,
    setRatio(key, ratio) { ratios[key] = ratio; },
    setHidden(h) { hidden = h; apply(); },
    /** The browser or OS paused a reel (e.g. iOS audio session); restart it if it should be playing. */
    onSystemPause(key) { if (key === active) apply(); },
    get active() { return active; },
  };
}

/** One sound setting shared by every reel. Starts muted. */
export function createSound() {
  const listeners = new Set();
  const sound = {
    muted: true,
    toggle() {
      sound.muted = !sound.muted;
      for (const fn of listeners) fn(sound.muted);
      return sound.muted;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return sound;
}
