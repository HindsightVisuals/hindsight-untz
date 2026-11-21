// DOM wiring for both reels. The playback rules live in reels-logic.js (createReelController).
import { createReelController } from './reels-logic.js';

export function initReels(root = document) {
  const figures = [...root.querySelectorAll('.reel[data-reel]')];
  if (!figures.length) return;

  const els = figures.map(fig => ({ key: fig.dataset.reel, fig, video: fig.querySelector('video'), label: fig.querySelector('.reel-sound') }));
  const soundText = () => (c.sound.muted ? 'Click for sound' : 'Sound on');

  const c = createReelController(els.map(e => ({
    key: e.key,
    video: e.video,
    onState: state => {
      e.fig.classList.toggle('needs-tap', state === 'blocked');
      e.label.textContent = state === 'blocked' ? 'Tap to play' : soundText();
    },
  })));

  c.sound.subscribe(() => {
    for (const e of els) if (!e.fig.classList.contains('needs-tap')) e.label.textContent = soundText();
  });

  const io = new IntersectionObserver(entries => {
    for (const en of entries) c.setRatio(en.target.dataset.reel, en.isIntersecting ? en.intersectionRatio : 0);
    c.apply();
  }, { threshold: Array.from({ length: 21 }, (_, i) => i / 20) });

  for (const e of els) {
    io.observe(e.fig);
    e.fig.tabIndex = 0;
    e.fig.setAttribute('role', 'button');
    e.fig.setAttribute('aria-label', 'Toggle sound');
    e.fig.addEventListener('click', () => c.activate(e.key));
    e.fig.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); c.activate(e.key); }
    });
    // Our own pauses also fire this; apply() is idempotent, so only a pause of the active reel restarts it.
    e.video.addEventListener('pause', () => queueMicrotask(() => c.onSystemPause(e.key)));
  }

  document.addEventListener('visibilitychange', () => c.setHidden(document.hidden));
}
