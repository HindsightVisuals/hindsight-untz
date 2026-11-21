// Both reels: only the most-visible one plays, and sound is one page-wide setting.
import { pickActive, createSound } from './reels-logic.js';

export function initReels(root = document) {
  const figures = [...root.querySelectorAll('.reel[data-reel]')];
  if (!figures.length) return;
  const reels = figures.map(fig => ({ key: fig.dataset.reel, fig, video: fig.querySelector('video'), label: fig.querySelector('.reel-sound') }));
  const ratios = Object.fromEntries(reels.map(r => [r.key, 0]));
  const sound = createSound();
  let active = null;

  const tryPlay = r => r.video.play().then(
    () => r.fig.classList.remove('needs-tap'),
    () => { r.fig.classList.add('needs-tap'); r.label.textContent = 'Tap to play'; },
  );

  function apply() {
    active = document.hidden ? null : pickActive(ratios);
    for (const r of reels) {
      if (r.key === active) { if (r.video.paused) tryPlay(r); }
      else if (!r.video.paused) r.video.pause();
    }
  }

  const steps = Array.from({ length: 21 }, (_, i) => i / 20);
  const io = new IntersectionObserver(entries => {
    for (const e of entries) ratios[e.target.dataset.reel] = e.isIntersecting ? e.intersectionRatio : 0;
    apply();
  }, { threshold: steps });
  for (const r of reels) io.observe(r.fig);

  sound.subscribe(muted => {
    for (const r of reels) {
      r.video.muted = muted;
      r.label.textContent = muted ? 'Click for sound' : 'Sound on';
    }
  });

  for (const r of reels) {
    r.fig.tabIndex = 0;
    r.fig.setAttribute('role', 'button');
    r.fig.setAttribute('aria-label', 'Toggle sound');
    const onActivate = () => {
      // A blocked autoplay: the first tap starts playback rather than flipping sound.
      if (r.fig.classList.contains('needs-tap')) {
        r.label.textContent = sound.muted ? 'Click for sound' : 'Sound on';
        tryPlay(r);
        return;
      }
      sound.toggle();
      // iOS only lets an element play with sound if play() ran inside a gesture. Touch every reel here, then
      // pause whichever isn't on screen, so the other reel can later start with sound when it scrolls in.
      for (const other of reels) {
        const p = other.video.play();
        if (other.key !== active) p.then(() => other.video.pause(), () => {});
        else p.catch(() => {});
      }
    };
    r.fig.addEventListener('click', onActivate);
    r.fig.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate(); }
    });
  }

  document.addEventListener('visibilitychange', apply);
}
