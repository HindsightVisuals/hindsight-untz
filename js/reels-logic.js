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
