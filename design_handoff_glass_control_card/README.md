# Handoff: Sawaari Radio — Glass Control Card (Desktop "C")

## Overview
Desktop now-playing control card for "Sawaari Radio," an in-bus radio streaming platform. A frosted-glass card floats over a full-bleed bus-dashboard photo, holding track info, a progress bar, and transport controls (shuffle, previous, pause/play, next, repeat). This is one of several player-treatment explorations for the product; this package covers only this "glass control card" treatment.

## About the Design Files
The bundled HTML file is a **design reference** — a static prototype showing intended look, layout, and copy. It is not production code. Recreate this design in the target codebase's existing framework (React, Vue, native, etc.) using its established component patterns and styling approach — not by shipping the HTML/inline-styles directly. If no frontend framework exists yet in the target repo, choose the most appropriate one for the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, blur, and radii below are final values taken directly from the design file. Recreate pixel-accurately, translating inline styles into the codebase's native styling system.

## Screens / Views

### Now Playing — Desktop glass card
**Purpose:** Persistent playback control surface on a desktop-width screen (bus infotainment display / web dashboard). Shows current track and lets the rider control playback.

**Canvas:** 1280×720. The card is anchored to the bottom-left of the screen, not full width — treat the rest of the frame as the app's live background/content (here, a bus-dashboard photo).

**Layers (back to front):**
1. Background photo (`dashboard-bg.png`, included in this folder), `background-size: cover`, `background-position: 45% 60%`.
2. Full-bleed scrim for legibility of the masthead text: `linear-gradient(180deg, rgba(20,14,10,.5) 0%, rgba(20,14,10,.08) 42%, rgba(14,9,6,.72) 100%)`.
3. Top-left status row (time + streaming-app deep links) — top 22px, left/right 48px, flex row `justify-content: space-between`, `DM Mono` 13px, `rgba(255,255,255,.85)`.
4. Masthead — top 76px, left 48px: title "सवारी रेडियो" two lines, weight 800, 86px, line-height .9, color `#fff`, letter-spacing -0.03em; subtitle "NON-STOP HIGHWAY RADIO" below (margin-top 18px), `DM Mono` 12px, letter-spacing .28em, uppercase, `rgba(255,255,255,.75)`.
5. **The glass control card** — positioned absolute, `left/right: 48px`, `bottom: 56px`. It sits inside a full-width flex row (`justify-content: flex-start` by default — see Interactions) and is itself a fixed-width box, not stretched.

**Glass card** — width 420px, `padding: 20px 22px 18px`, `box-sizing: border-box`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,.3)`, `box-shadow: 0 20px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.22)`.

Glass fill (the tunable "glass" effect — see Interactions for why these two values move together):
- `background: rgba(28,20,14,0.26)` at the default/reference setting.
- `backdrop-filter: blur(7.8px) saturate(1.1)` at the default/reference setting (blur radius = 30px × the same 0.26 fraction — see below).
- All text inside the card carries `text-shadow: 0 1px 10px rgba(0,0,0,.6)` so copy stays legible over the photo regardless of glass strength.

Card contents, top to bottom:
1. **Track info row** — flex row, `align-items: center`, gap 14px:
   - Album art placeholder — 58×58px, `border-radius: 12px`, `background: linear-gradient(140deg,#c8452f,#e8a34a)`, `box-shadow: 0 4px 14px rgba(0,0,0,.35)`. Replace with real album art image (keep the 12px radius and shadow).
   - Track text: title "गाड़ी बुला रही है", 20px, weight 600, color `#fff`, single line with ellipsis overflow (`white-space:nowrap; overflow:hidden; text-overflow:ellipsis`); artist "किशोर कुमार" below, 14px, `rgba(255,255,255,.6)`.
2. **Time labels** — margin-top 16px, flex row `justify-content: space-between`, `DM Mono` 11px, `rgba(255,255,255,.7)`: elapsed "1:02" / remaining "-2:56".
3. **Progress bar** — margin-top 6px, height 3px, `border-radius: 2px`, `background: rgba(255,255,255,.28)`; filled portion `background:#fff`, 26% width, same radius; a round white scrubber handle (11×11px, `border-radius:50%`, `background:#fff`) centered on the fill's leading edge via `left:26%; top:50%; transform:translate(-50%,-50%)`.
4. **Transport row** — margin-top 16px, flex row, `justify-content: space-between`, `align-items:center`, `padding: 0 2px`, icon color `#fff`, base icon size 17px:
   - Shuffle (leftmost) — accent color `#e8a34a` (the only non-white icon), inline SVG (crossing-arrows glyph), 17×17, `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`. Exact path data is in the HTML file — copy it directly rather than re-drawing.
   - Previous — text glyph `⏮` (skip-to-start), 17px.
   - Pause — text glyph `⏸`, 17px. Toggle to `▶` (play) when paused.
   - Next — text glyph `⏭`, 17px.
   - Repeat (rightmost) — white, inline SVG (looped-arrows glyph), same 17×17 spec as shuffle, path data in the HTML file.

## Interactions & Behavior
- **The "glass strength" control**: this design has one tunable dial — call it `glassAmount` (0–1, default **0.26**) — that governs how see-through the card is. It intentionally drives *two* CSS properties together, not just background opacity alone:
  - `background-color` alpha = `glassAmount` directly → `rgba(28,20,14, glassAmount)`.
  - `backdrop-filter` blur radius = `30px × glassAmount` (so at `glassAmount = 0` the card is fully sharp/see-through with zero blur, and at `glassAmount = 1` it's a fully frosted, blurred, more opaque glass panel).
  - This coupling matters: driving tint alpha down while leaving blur radius fixed makes the card look like a flat "smoothed" solid patch instead of true transparency, because a large blur radius averages the photo behind it into a near-solid color regardless of tint. Keep blur and tint scaling together.
  - Card content (art, text, progress bar, transport icons) is **never** affected by `glassAmount` — only the card's own background fill and blur change. Text opacity stays at 1 always; legibility over a low-glass (near-transparent) card is handled by the constant `text-shadow` on the text nodes, not by dimming the card.
- **Card position**: the card sits at `justify-content: flex-start` (bottom-left) by default. In the source exploration file this was a tunable alignment (left/center/right) — not required, but if you want to keep that flexibility, wrap the card in a full-width flex row and drive `justify-content` from a `left | center | right` setting.
- Play/pause button (rendered here as the `⏸`/`▶` glyph) toggles playback state.
- Prev/next buttons skip queue tracks.
- Shuffle and repeat toggle their respective playback modes; consider an active/inactive visual state (e.g. the amber accent shown here = on, muted white = off) if the design should reflect current mode.
- Progress bar fill width and handle position reflect `currentTime / duration`; should be draggable/seekable.
- No hover states are specified in the mock — add standard hover/focus/pressed states per the codebase's interaction conventions. All transport icons should meet at least a 32×32px hit target even though the visible glyph is 17px.

## State Management
- `isPlaying: boolean`
- `isShuffling: boolean`, `repeatMode: 'off' | 'all' | 'one'`
- `currentTrack: { title, artist, artworkUrl, durationSec }`
- `currentTimeSec: number` (drives progress bar + elapsed/remaining labels)
- `glassAmount: number` (0–1) — if this is meant to be a user- or context-driven setting (e.g. dims further in bright daylight, or is a design-system-wide "glass strength" token), wire it as described above; otherwise hardcode to 0.26.

## Design Tokens

**Colors**
- Base background (behind photo): `#2b241f`
- Scrim gradient: `rgba(20,14,10,.5)` → `rgba(20,14,10,.08)` → `rgba(14,9,6,.72)`
- Glass card fill: `rgba(28,20,14, glassAmount)` (reference value 0.26)
- Card border: `rgba(255,255,255,.3)`
- Accent (shuffle icon only): `#e8a34a`
- Album-art placeholder gradient: `#c8452f` → `#e8a34a`
- White text/icons: `#fff`; secondary text `rgba(255,255,255,.6–.85)`

**Typography**
- Display/headline font: **Anek Devanagari** (weights 400/500/600/800) — supports Devanagari + Latin.
- Monospace/label font: **DM Mono** (weights 400/500) — status row, timestamps, eyebrow labels.
- Masthead: 86px / 0.9 line-height, weight 800, letter-spacing -0.03em.
- Track title: 20px, weight 600.
- Artist: 14px, regular.
- Subtitle/eyebrow: 12px `DM Mono`, letter-spacing .28em, uppercase.

**Spacing / Radii**
- Screen margin: 48px (status row, masthead, card all align to this).
- Card radius: 20px. Album art radius: 12px. Progress bar / fill radius: 2px.
- Card padding: `20px 22px 18px`.

**Shadows**
- Card: `0 20px 50px rgba(0,0,0,.4)` + inset highlight `0 1px 0 rgba(255,255,255,.22)`.
- Album art: `0 4px 14px rgba(0,0,0,.35)`.
- Text: `0 1px 10px rgba(0,0,0,.6)` (keeps copy legible at low glass strength).

## Assets
- Background photo: `dashboard-bg.png` (included in this folder) — bus dashboard/street scene, placeholder; source the final licensed/production asset separately.
- Album art: placeholder gradient only — wire up real artwork per track.
- Fonts: Google Fonts — Anek Devanagari, DM Mono.
- Icons: shuffle and repeat are inline SVGs (path data in the HTML file); prev/next/pause use the Unicode glyphs ⏮ ⏸ ⏭ — swap for your icon system's equivalents if preferred, keeping the same 17px scale and spacing.

## Files
- `glass-control-card.html` — full HTML/CSS reference for this screen, at the reference `glassAmount = 0.26` setting (included in this folder).
- `dashboard-bg.png` — background photo asset used in the reference file.
