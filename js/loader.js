// Logo-animation intro. Resolves once the loader has left the screen.
const HARD_TIMEOUT_MS = 6000;
const BLOCKED_GRACE_MS = 1200;
const EXIT_MS = 600;

export function runLoader() {
  const el = document.getElementById('loader');
  const video = document.getElementById('loader-video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const finish = () => {
    el?.remove();
    document.body.classList.remove('loading');
  };
  if (!el || !video || reduced) { finish(); return Promise.resolve(); }

  return new Promise(resolve => {
    let done = false;
    const exit = () => {
      if (done) return;
      done = true;
      el.classList.add('out');
      setTimeout(() => { finish(); resolve(); }, EXIT_MS);
    };
    video.addEventListener('ended', exit, { once: true });
    video.addEventListener('error', exit, { once: true });
    setTimeout(exit, HARD_TIMEOUT_MS);
    const p = video.play();
    if (p) p.catch(() => setTimeout(exit, BLOCKED_GRACE_MS));
  });
}
