# Hindsight × Untz Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A black-and-white one-page Hindsight portfolio for the Untz festival, live at `untz.thisishindsight.com`.

**Architecture:** A static site with no bundler: `index.html` plus a few ES-module JS files and one CSS file, served by
GitHub Pages. The media is pre-compressed by a Node script into `media/`, which is committed. The background is a
raw-WebGL port of the commms Gray-Scott RD.

**Tech Stack:** HTML/CSS, vanilla ES modules, WebGL1, Node 20+ (`node:test`), `ffmpeg-static` + `sharp` (dev only),
`npx http-server` for local preview, `gh` for the repo and Pages.

**Spec:** `docs/superpowers/specs/2026-11-20-hindsight-untz-site-design.md`

## Global Constraints

- Strictly black and white: no hue anywhere (no Wes green/lime). Allowed colours: `#000`, `#fff`, and greys.
- Source media is read only: `C:/Users/Adam/Dropbox/Hindsight/01_Portfolio Site/00_Assets and Content/`. Never
  write into Dropbox. Extract the zip to the scratchpad or `.cache/` (gitignored).
- Videos: H.264 MP4, max 1080p, `+faststart`, each reel ≲25 MB, the loader ≲3 MB. No committed file may exceed 50 MB.
- Photos: exactly 10, as WebP at 1600px and 800px long edge.
- Booking email: `vision@thisishindsight.com`. Domain: `untz.thisishindsight.com`.
- The client list, verbatim and in order: Know Good, Mickman, VCTRE, Thought Process, Dr. USHUU, Copycat, Kursa,
  EOS, Crawdad Sniper, Aliz Perez, Faceplant, Foxtail, LYNY, Humandala, Petals.
- Sound is one page-wide setting. Only one reel plays at a time: the most-visible reel that is in view. The live
  reel never plays before it scrolls into view.
- Fonts: Space Mono (Google Fonts) + Typekit `jhm5bdq` (Loos), with Krona One as fallback.
- Repo: `HindsightVisuals/hindsight-untz`; gh is already on the HindsightVisuals account.

## Review Focus

1. **iOS won't unmute the second reel without its own gesture.** Expected: after one unmute tap on either reel,
   the other reel later plays with sound. The unmute click handler must call `play()` on both elements inside the
   gesture (pausing the off-screen one straight after) to unlock them. Owned by Task 3, checked manually in Task 6.
2. **Autoplay blocked** (Low Power Mode, data saver). Expected: the posters show, a tap starts playback, and the
   loader exits anyway via its timeout. Owned by Tasks 3 and 4.
3. **Scrolling fast past both reels.** Expected: never two `<video>` elements unpaused at once. Pinned by the
   `pickActive` tests in Task 3.
4. **No WebGL / reduced motion.** Expected: black ground plus the gradient overlay, with no console errors. Owned
   by Task 5.
5. **Hidden tab.** Expected: the RD loop and both videos stop and resume on return. Owned by Tasks 3 and 5.

---

## File structure

```
index.html            page markup + copy
css/site.css          all styles (tokens at top)
js/main.js            boot: imports and starts loader, reels, rd
js/loader.js          logo-animation intro
js/reels-logic.js     pure: pickActive(), mute state (unit-tested)
js/reels.js           DOM wiring for both reels (IntersectionObserver, hover/click)
js/rd.js              WebGL RD background
media/                committed output of build-media (video/, img/, posters)
scripts/build-media.mjs
scripts/photos.json   the 10 chosen source filenames, in grid order
test/reels-logic.test.mjs
test/media.test.mjs   budget checks on media/
CNAME, .gitignore, package.json
```

---

### Task 1: Media pipeline + photo picks

**Files:**
- Create: `package.json`, `.gitignore` (`node_modules/`, `.cache/`), `scripts/build-media.mjs`,
  `scripts/photos.json`, `test/media.test.mjs`
- Output: `media/video/{loader,demo-reel,live-reel}.mp4`, `media/video/{demo-reel,live-reel}-poster.jpg`,
  `media/img/<slug>-{800,1600}.webp`

**Interfaces:**
- Produces: the file paths above, which Task 2's markup references. `npm run media` (re)builds; `npm test` runs
  `node --test test/`.

- [ ] **Step 1:** `npm init -y`, then `npm i -D ffmpeg-static sharp`. Set `"type": "module"` and add the scripts
  `media` and `test`.
- [ ] **Step 2: Pick the 10 photos.** Extract the zip to `.cache/zip/`. Use sharp to make a contact sheet of all 44
  (256px thumbs, filenames burned in or listed) in the scratchpad, then view it. Pick 10 for variety: crowd, stage,
  light, close and wide, with a mix of the DSC set and the Submersion set, and favour shots that read well in B&W.
  Write `scripts/photos.json` as `[{ "src": "<path relative to the assets root or .cache/zip>", "slug": "01" }, …]`.
- [ ] **Step 3: Write the failing test** `test/media.test.mjs`:
  - `media/video/loader.mp4` exists and is < 3 MB.
  - `demo-reel.mp4` and `live-reel.mp4` exist and are each < 25 MB.
  - Both posters exist.
  - Exactly 10 `*-1600.webp` and 10 `*-800.webp` files.
  - Every file under `media/` is < 50 MB.
- [ ] **Step 4:** Run `npm test`. Expected: FAIL (`media/` is missing).
- [ ] **Step 5: Implement `scripts/build-media.mjs`.**
  - Videos run through ffmpeg-static with `-c:v libx264 -preset slow -crf <n> -vf scale=-2:'min(1080,ih)'
    -movflags +faststart -c:a aac -b:a 160k`. The loader is `-an` (no audio).
  - Start at CRF 26. If a reel exceeds its budget, retry at CRF +2 until it fits (the loop is the algorithm).
  - Posters are frame 1s, saved as JPEG q80.
  - Photos go through sharp `.resize({width|height long edge}).webp({quality: 78})` at 1600 and 800.
  - Skip any output that's newer than its source.
- [ ] **Step 6:** Run `npm run media && npm test`. Expected: PASS. Log the final sizes and CRFs.
- [ ] **Step 7: Commit** with `media/`: "Media pipeline: compressed reels, loader, 10 photos".

### Task 2: Page shell, styles, content

**Files:**
- Create: `index.html`, `css/site.css`, `js/main.js` (empty boot for now), `media/wordmark.svg` (copy of
  `03_Brand Assets/WordMark.svg`, with fill set to `#fff`)

**Interfaces:**
- Produces these DOM hooks for later tasks:
  - `#loader` containing `<video id="loader-video" muted playsinline src="media/video/loader.mp4">`
  - `#rd-canvas` (fixed, z-index below content) and `.rd-gradient` overlay div
  - Each reel is `<figure class="reel" data-reel="demo|live">` holding `<video muted playsinline loop preload>` with
    its poster, plus a `.reel-hud` overlay with a `.reel-sound` label
  - Sections `#gallery`, `#about`, `#list`, `#contact`

- [ ] **Step 1: Markup** (order per spec):
  1. Loader.
  2. Nav: wordmark left; `About` and `Contact` anchors right.
  3. Hero demo reel (`preload="auto"`).
  4. Gallery: 10 `<img>` with `srcset` 800w/1600w, `loading="lazy"`, `alt="Hindsight live visuals"`.
  5. Live reel (`preload="metadata"`, no `autoplay` attribute).
  6. About.
  7. List as `<ul>`.
  8. Contact: CTA button `mailto:vision@thisishindsight.com` plus the email in text.
  9. Footer with `© 2026 Hindsight`.

  Also add `<title>Hindsight × Untz</title>`, a meta description, the viewport meta and `<!doctype html>`.
- [ ] **Step 2: About copy.** Draft about 60–90 words in the first person plural/brand voice. Hindsight is a live
  visual and VJ project (live show visuals, album art, artist branding, tour visuals) for bass and electronic
  artists. Mark the paragraph with `<!-- DRAFT: Adam to rewrite -->`.
- [ ] **Step 3: Styles.**
  - Tokens: `--bg:#000; --fg:#fff; --muted:#8a8a8a; --line:rgba(255,255,255,.18)`.
  - Mono uppercase labels in Space Mono. Headings in Loos, falling back to Krona One.
  - Chamfer via `clip-path: polygon(...)` on buttons and the reel frames (45°, top-right + bottom-left, 12px).
  - HUD corner brackets come from a `::before`/`::after` pair on `.reel-hud` and buttons, shown on
    `:hover`/`:focus-visible`.
  - Buttons are a 1px white outline that fills white with a black label on hover.
  - Gallery grid: 3 columns desktop, 2 tablet, 1 phone, gap 8px. Make it an editorial mix where 2 of the 10 span
    two columns.
  - All content sits above `#rd-canvas`.
- [ ] **Step 4: Verify.** Run `npx http-server -p 5190 -c-1`, open it in Chrome, and screenshot at desktop width.
  Every section should render; there should be no hue anywhere (spot-check the computed colours in the console:
  no non-grey `rgb`), and no 404s in the network panel.
- [ ] **Step 5: Commit:** "Page shell: sections, copy, B&W Wes styling".

### Task 3: Reels — shared sound, one at a time

**Files:**
- Create: `js/reels-logic.js`, `js/reels.js`, `test/reels-logic.test.mjs`
- Modify: `js/main.js` (call `initReels()`)

**Interfaces:**
- `pickActive(ratios: Record<string, number>, minRatio = 0.35): string | null` — returns the key with the highest
  intersection ratio ≥ `minRatio`, or `null`.
- `createSound(): { muted: boolean, toggle(): boolean, subscribe(fn: (muted: boolean) => void): () => void }` —
  starts muted.
- `initReels(root = document): void` in `reels.js`.

- [ ] **Step 1: Write failing tests** in `test/reels-logic.test.mjs`:
  - `pickActive({demo: 0.9, live: 0})` → `'demo'`.
  - `pickActive({demo: 0.2, live: 0.1})` → `null`.
  - `pickActive({demo: 0.4, live: 0.6})` → `'live'`.
  - `pickActive({demo: 0.5, live: 0.5})` → `'demo'` (a tie goes to the first key, so there's no flicker).
  - `createSound()` starts with `.muted === true`. `toggle()` returns `false` and notifies the subscribers once with
    `false`. A second `toggle()` goes back to `true`. An unsubscribed fn is not called.
- [ ] **Step 2:** Run `npm test`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `reels-logic.js`.**
- [ ] **Step 4:** Run `npm test`. Expected: PASS.
- [ ] **Step 5: Implement `initReels` in `reels.js`.**
  - Observe both `.reel` figures with an IntersectionObserver (thresholds 0–1 in 0.05 steps) and keep a ratio map.
  - On each change, `pickActive`: `play()` the active reel and `pause()` the rest. `null` pauses both.
  - Wrap `play()` failures (autoplay blocked) in a catch that adds `.needs-tap` to show "tap to play".
  - Click or tap on a `.reel` calls `sound.toggle()`. Inside that same handler, for every reel set `muted` from the
    state and call `play()`, then immediately `pause()` any reel that isn't active. This unlocks iOS (Review Focus
    #1).
  - Subscribers update each `video.muted` and the `.reel-sound` label text (`click for sound` / `sound on`).
  - On `visibilitychange` to hidden, pause both. On visible, re-run the pick.
- [ ] **Step 6: Verify in Chrome.**
  - At the top only the demo plays. Scroll to the live reel: the demo pauses and the live reel plays.
  - Unmute on the demo, then scroll down: the live reel plays with sound.
  - In the console, `[...document.querySelectorAll('video')].filter(v => !v.paused).length <= 1` holds at every
    scroll position you check (top, gallery, live, bottom). The automation tab may freeze rAF but `play()`/pause
    state is still readable.
- [ ] **Step 7: Commit:** "Reels: one at a time, shared sound".

### Task 4: Loader

**Files:**
- Create: `js/loader.js`
- Modify: `js/main.js`, `css/site.css`

**Interfaces:**
- `runLoader(): Promise<void>` resolves when the loader has exited. `main.js` starts the reels after it resolves, so
  the hero starts at frame 0 visible.

- [ ] **Step 1: Implement.**
  - `body.loading` locks scroll.
  - Play `#loader-video`. On `ended`, or a 6 s hard timeout, or a `play()` rejection after 1.2 s, exit.
  - Exit: `#loader` fades to opacity 0 over 600ms with a slight upward clip/wipe, then `remove()` it and drop
    `body.loading`.
  - Under `prefers-reduced-motion`, skip the video and exit immediately.
  - Use `sessionStorage` `hs-loader-seen` to skip on reloads within the session (my call: repeat visitors
    shouldn't sit through it).
- [ ] **Step 2: Verify.** Hard reload: the loader shows and then reveals the hero. Set
  `HTMLMediaElement.prototype.play = () => Promise.reject()` before the scripts run (DevTools snippet / `?noplay`
  hook not needed; test via an override in the console followed by a reload with "preserve log"). The loader must
  exit within ~1.2 s and the page stays usable.
- [ ] **Step 3: Commit:** "Logo-animation loader".

### Task 5: RD background

**Files:**
- Create: `js/rd.js`
- Modify: `js/main.js`, `css/site.css`

**Interfaces:**
- `startRD(canvas: HTMLCanvasElement): { stop(): void } | null` — returns `null` when WebGL or float/half-float
  render targets are unavailable.

**Port source:** `04_Wes Portfolio` → `git show main:src/three/background.ts`.
- Port `SIM_FRAG` minus the mask, pull and advect branches.
- Keep `FEED 0.0545`, `KILL 0.062`, `SIM_MAX 512`, `STEPS_PER_FRAME 6`, `BURN_IN_STEPS 300`, `BRUSH_RADIUS 16`, the
  reseed timing (`4 ± 2` s, radius 5) and `PARALLAX_UV_PER_UNIT`/`BASE_OVERSCAN 1.03`.
- Wes V2's `index.html` (`05_Goo Field`, the `const rd = (() => {` block around line 2094) is already a raw-WebGL1
  port of the same sim: reuse its ping-pong and float-texture probing rather than writing new code.

- [ ] **Step 1: Implement the sim and view.**
  - The view shader outputs `lum = mix(0.0, PATTERN_LUM, mask * PATTERN_OPACITY)` on black, starting
    `PATTERN_LUM 0.22`, `PATTERN_OPACITY 1.0`. It stays faint; tune by eye so the reels win.
  - Use the same `smoothstep(0.18, 0.22, B)` mask.
- [ ] **Step 2: Mouse "camera".**
  - The pointer is eased (lerp 0.06/frame) into a UV offset of at most ±0.015, applied in the view shader as
    `uvZ = (vUv-0.5)/BASE_OVERSCAN + 0.5 + offset`.
  - The pointer also drives the erase brush in sim UV, using the same mapping so the hole sits under the cursor.
  - Without a fine pointer, the offset follows a slow Lissajous (period ~40 s) and there's no erase.
- [ ] **Step 3: Gradient overlay.**
  - `.rd-gradient { position: fixed; inset: 0; pointer-events: none; background: linear-gradient(90deg,
    rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 50%, rgba(0,0,0,.9) 100%); }`, between the canvas and the content.
  - The overlay is CSS, not shader, so it survives the no-WebGL fallback.
- [ ] **Step 4: Guards.**
  - Under `prefers-reduced-motion`, or when `startRD` returns `null`, leave the canvas hidden (black body + gradient
    remain).
  - Pause the rAF on `document.hidden`.
  - Cap DPR at 1, as the Wes V2 GPU pass did.
  - Resize is debounced at 150ms and rebuilds the sim.
- [ ] **Step 5: Verify.** The pattern is visible in the centre band and near-black at the edges; moving the mouse
  drifts it and parts it. In a headless/automation tab rAF may not run: confirm via a manual `stop()`/start in the
  console, plus a screenshot after forcing ~60 frames by calling the frame fn directly if one is exposed as
  `window.__rdStep` (debug only). Check for no console errors with `?nowebgl` (main.js skips `startRD`).
- [ ] **Step 6: Commit:** "RD background: white-on-black, mouse camera, edge gradient".

### Task 6: Ship to GitHub Pages + subdomain

**Files:**
- Create: `CNAME` (one line: `untz.thisishindsight.com`), `README.md` (with how to rebuild media)

- [ ] **Step 1:** Run `npm test`. Expected: PASS. Run `du -sh media`. Expected: < 100 MB.
- [ ] **Step 2:** `gh auth status` shows HindsightVisuals active. Then
  `gh repo create HindsightVisuals/hindsight-untz --public --source . --push`. Pages on a free account needs a
  public repo; tell Adam the repo is public.
- [ ] **Step 3:** `gh api -X POST repos/HindsightVisuals/hindsight-untz/pages -f "source[branch]=main" -f
  "source[path]=/"`, then `gh api -X PUT repos/HindsightVisuals/hindsight-untz/pages -f
  cname=untz.thisishindsight.com`.
- [ ] **Step 4:** Check the DNS with `nslookup untz.thisishindsight.com`. Expected: a CNAME to
  `hindsightvisuals.github.io`. Once `gh api repos/HindsightVisuals/hindsight-untz/pages` shows the cert
  approved, set `https_enforced=true`.
- [ ] **Step 5: Live check** at `https://untz.thisishindsight.com`:
  - The loader, both reels and all 10 images load (no 404s).
  - The mailto opens.
  - Ask Adam to do the iPhone check from Review Focus #1 and #2. Automation can't simulate iOS gesture rules.
- [ ] **Step 6:** Commit and push any fixes. Update memory with the project's location and status.
