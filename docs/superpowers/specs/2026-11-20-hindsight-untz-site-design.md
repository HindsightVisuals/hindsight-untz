# Hindsight × Untz — one-page portfolio site

**Date:** 2026-11-20 · **Size:** small project (one sitting) · **Live at:** `untz.thisishindsight.com`

## Intent

The Untz music festival asked Hindsight for a portfolio. This is a single page for them: a reel of Hindsight's
visuals, live show footage, photos, a short about, and who Hindsight has worked and performed with. The reader is a
festival booker deciding whether to book Hindsight, so the page ends on a booking contact.

## Goals

- Open with Hindsight's logo animation, then the 2024 demo reel.
- A gallery of still photos.
- The 2026 live show reel.
- About + client/performed-with list + booking contact.
- Loads fast on festival wifi and phones.

## Non-goals

- No work / case-study section (Cohesion, EOS, Thought Process clips) for now.
- No photo credits.
- No CMS, no build framework, no analytics.

## Anti-goals

- Any colour. The site is strictly black and white: no Wes green or lime.
- A background that competes with the reels.
- Multi-hundred-MB media that stalls on a phone.

## Approaches considered

- **A. Fresh single HTML file in Wes styling, static on GitHub Pages (picked).** Wes's type, chamfered corners, HUD
  brackets and mono labels, plus a ported RD background. Fast and easy to change.
- B. Fork Wes V2 (goo field). Rejected: the goo fights two autoplaying reels, it's heavy on phones, and it carries
  lots of code to strip out.
- C. Squarespace. Rejected: hard to match the Wes look, and the loader and unmute hovers need code injection anyway.

## Page, top to bottom

1. **Loader:** full-screen black, `03_Brand Assets/LogoAnimation.mp4` plays muted, then fades or wipes into the page.
   The page loads behind it. If the video can't autoplay, or after a timeout, the loader is skipped.
2. **Nav:** Hindsight wordmark (`WordMark.svg`, white) on the left; anchors on the right (About, Contact).
3. **Hero:** `01_Video/Hindsight_DemoReel2024.mp4`, autoplays muted and loops.
4. **Gallery:** exactly 10 photos, chosen by the builder from the 44 available (10 `DSC_*` + 34 from the Mickman
   *Submersion* zip). No lightbox and no full gallery (Adam, 2026-11-20). Only the 10 picks get processed.
5. **Live show reel:** `01_Video/Hindsight_LiveReel2026.mp4`. It does not play until it scrolls into view.
6. **About:** a short paragraph, drafted by Claude for Adam to rewrite.
7. **Worked + performed with:** one list, in this order: Know Good, Mickman, VCTRE, Thought Process, Dr. USHUU,
   Copycat, Kursa, EOS, Crawdad Sniper, Aliz Perez, Faceplant, Foxtail, LYNY, Humandala, Petals.
8. **Contact / footer:** booking CTA → `mailto:vision@thisishindsight.com`.

**Both reels:** on hover a white HUD-bracket overlay appears with a "click for sound" label. Clicking toggles
mute/unmute; on touch screens, a tap toggles sound.

**Sound is one shared, page-wide setting (Adam, 2026-11-20):** unmuting either reel unmutes both, and muting either
mutes both. Only one reel plays at a time, so two audio tracks never overlap:
- The hero plays while it's in view and pauses once scrolled away.
- The live reel plays only once it's in view and pauses when it leaves.
- If both are partly visible, the one with more of itself on screen plays.

## Background

The commms reaction-diffusion background (`04_Wes Portfolio`, `src/three/background.ts`), ported to raw WebGL in the
page, with the colours inverted:

- A faint white Gray-Scott pattern on black, kept low-contrast.
- The pattern parts under the cursor and heals behind it, with a slight parallax "camera" drift following the mouse.
  On touch it drifts slowly by itself.
- A horizontal overlay gradient: black at 90% at both edges → 0% in the centre.
- Fixed behind everything; the content scrolls over it.
- If WebGL is unavailable, or `prefers-reduced-motion` is set, it falls back to plain black with the gradient.
- It runs only when the tab is visible.

## Look

- Black and white only. Text is white or grey.
- Buttons and toggles are white outlines that fill white (with black label) on hover.
- Wes atoms kept: 45° chamfer, HUD corner brackets on hover and focus, Space Mono uppercase labels.
- Fonts: Space Mono plus Wes's Typekit kit (`jhm5bdq`, Loos). **Builder check:** the Typekit kit may be locked to
  the Wes domain. If Loos doesn't load on `untz.thisishindsight.com`, Adam adds the domain to the kit; until then
  the fallback is Krona One.

## Media pipeline

- No ffmpeg or image tools are installed. Use `ffmpeg-static` and `sharp` as dev dependencies in the repo
  (`node_modules` is gitignored), driven by a `build-media` script.
- Videos: H.264 MP4, 1080p max, CRF tuned so each reel is ≲25 MB, with `+faststart` and a poster frame.
  Hero and loader go 720p on phones only if size demands it (builder's call).
- Photos: the 10 picks only, as WebP at ~1600px long edge, plus a ~800px `srcset` size for phones.
- The Dropbox originals are read only, never modified. The zip is extracted to a temp dir, not into Dropbox.

## Hosting

- New repo `HindsightVisuals/hindsight-untz` (gh is already on that account), GitHub Pages from `main`.
- A `CNAME` file containing `untz.thisishindsight.com`.
- **DNS (Adam, in Squarespace):** CNAME record, host `untz` → `hindsightvisuals.github.io`. Then enable "Enforce
  HTTPS" in Pages settings once the cert issues.
- Repo location: `Documents/02_Claude Project Repos/09_Hindsight Untz`.

## Left to the builder

The grid layout and which 10 photos make it, the loader exit transition, the exact RD tuning values, and the about
copy draft.
