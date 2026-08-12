# Handoff: Sawaari Radio — Glass Control Card (Mobile)

## Overview
Mobile now-playing screen for "Sawaari Radio," an in-bus radio streaming platform. A frosted-glass card floats over a full-bleed bus-dashboard photo, holding track info, a progress bar, and transport controls (shuffle, previous, pause/play, next, repeat). This is the mobile counterpart of the "glass control card" desktop treatment (see the sibling `design_handoff_glass_control_card` folder, if present) — same visual language, laid out for a 390×844 phone frame with a home-indicator bar.

## About the Design Files
The bundled HTML file is a **design reference** — a static prototype showing intended look, layout, and copy. It is not production code. Recreate this design in the target codebase's existing mobile framework (React Native, SwiftUI, Jetpack Compose, mobile web, etc.) using its established component patterns — not by shipping the HTML/inline-styles directly. If no mobile framework exists yet, choose the most appropriate one for the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, blur, and radii below are final values taken directly from the design file. Recreate pixel-accurately, translating inline styles into the codebase's native styling system.

## Screens / Views

### Now Playing — Mobile glass card
**Purpose:** Default/home screen on a phone. Passenger sees what's currently playing and controls playback, including shuffle and repeat.

**Canvas:** 390×844 (iPhone-class portrait frame). Design with safe-area insets in mind for notch/home-indicator devices; the card and masthead stay anchored to fixed margins rather than scaling with screen size.

**Layers (back to front):**
1. Background photo (`dashboard-bg.png`, included in this folder), cropped/zoomed via `background-size: 1755px 878px`, `background-position: 35% 65%` (a ~450%-zoom crop centered on the dashboard/shrine area). Expose zoom level and focal point as tunable values in production so the crop can be re-aimed per background image.
2. Full-bleed vertical scrim: `linear-gradient(180deg, rgba(20,14,10,.55) 0%, rgba(20,14,10,.15) 40%, rgba(14,9,6,.75) 100%)`.
3. Status bar row (time + signal glyph) — top 14px, left/right 24px, flex row `justify-content: space-between`, `DM Mono` 13px, `#fff`. This is a design stand-in for the OS status bar — prefer the native one in production.
4. Masthead — top 196px, left 24px: title "सवारी रेडियो" two lines, weight 800, 46px, line-height .92, color `#fff`, letter-spacing -0.02em, `text-shadow: 0 4px 26px rgba(0,0,0,.5)`; subtitle "NON-STOP HIGHWAY RADIO" below (margin-top 12px), `DM Mono` 11px, letter-spacing .22em, uppercase, `rgba(255,255,255,.75)`.
5. **The glass control card** — `left/right: 24px`, `bottom: 34px`, full width of that margin (no fixed px width — it stretches edge to edge minus the 24px gutters).
6. Home-indicator bar — centered, `bottom: 9px`, 134×5px, `border-radius:3px`, `background: rgba(255,255,255,.55)`. Design stand-in for the OS home indicator; on iOS this is drawn by the system, on Android use the platform's own gesture-nav treatment.

**Glass card** — `box-sizing: border-box`, `padding: 20px 20px 18px`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,.3)`, `box-shadow: 0 20px 50px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.22)`.

Glass fill (the tunable "glass" effect — see Interactions for why these two values move together):
- `background: rgba(28,20,14,0.26)` at the default/reference setting.
- `backdrop-filter: blur(7.8px) saturate(1.1)` at the default/reference setting (blur radius = 30px × the same 0.26 fraction).
- All text inside the card carries `text-shadow: 0 1px 10px rgba(0,0,0,.6)` so copy stays legible over the photo regardless of glass strength.

Card contents, top to bottom:
1. **Track info row** — flex row, `align-items: center`, gap 14px:
   - Album art placeholder — 56×56px, `border-radius: 12px`, `background: linear-gradient(140deg,#c8452f,#e8a34a)`, `box-shadow: 0 4px 14px rgba(0,0,0,.35)`. Replace with real album art image (keep the 12px radius and shadow).
   - Track text (min-width:0 so it truncates): title "गाड़ी बुला रही है", 19px, weight 600, color `#fff`, single line with ellipsis overflow; artist "किशोर कुमार" below, 13px, `rgba(255,255,255,.6)`.
2. **Time labels** — margin-top 16px, flex row `justify-content: space-between`, `DM Mono` 11px, `rgba(255,255,255,.7)`: elapsed "1:02" / remaining "-2:56".
3. **Progress bar** — margin-top 6px, height 3px, `border-radius: 2px`, `background: rgba(255,255,255,.28)`; filled portion `background:#fff`, 26% width; a round white scrubber handle (12×12px) centered on the fill's leading edge.
4. **Transport row** — margin-top 16px, flex row, `justify-content: space-between`, `align-items:center`, `padding: 0 2px`, icon color `#fff`, base icon size 19px:
   - Shuffle (leftmost) — accent color `#e8a34a` (the only non-white icon), inline SVG (crossing-arrows glyph), 18×18, `stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`, viewBox `0 0 24 24`. Path data is in the HTML file — copy it directly.
   - Previous — text glyph `⏮`.
   - Pause — text glyph `⏸`. Toggle to `▶` (play) when paused.
   - Next — text glyph `⏭`.
   - Repeat (rightmost) — white, inline SVG (looped-arrows glyph), same spec as shuffle, path data in the HTML file.

## Interactions & Behavior
- **The "glass strength" control**: one tunable dial — call it `glassAmount` (0–1, default **0.26**) — governs how see-through the card is, and it intentionally drives *two* CSS properties together:
  - `background-color` alpha = `glassAmount` directly → `rgba(28,20,14, glassAmount)`.
  - `backdrop-filter` blur radius = `30px × glassAmount` (at `glassAmount = 0` the card is fully sharp/see-through with zero blur; at `glassAmount = 1` it's a fully frosted glass panel).
  - Keep blur and tint scaling together: dropping tint alpha while leaving blur radius fixed makes the card read as a flat "smoothed" solid patch rather than true transparency, since a large fixed blur radius averages the busy photo behind it into a near-solid color regardless of tint.
  - Card content (art, text, progress bar, transport icons) is **never** affected by `glassAmount` — only the card's own background fill and blur change. Text stays fully opaque; legibility at low glass strength comes from the constant `text-shadow`, not from dimming the card.
- Play/pause button toggles playback state.
- Prev/next buttons skip queue tracks.
- Shuffle and repeat toggle their respective playback modes — give each an active/inactive visual state (e.g. amber accent = on, muted white = off) if the design should reflect current mode.
- Progress bar fill width and handle position reflect `currentTime / duration`; should be draggable/seekable (touch drag, not just tap).
- Track title/artist truncate with ellipsis on overflow — no marquee/scroll animation specified.
- No hover states apply on mobile touch; add standard pressed/active states per the codebase's conventions. All transport icons should meet at least a 44×44px touch target even though the visible glyph is ~19px — pad the tap area around each icon accordingly.

## State Management
- `isPlaying: boolean`
- `isShuffling: boolean`, `repeatMode: 'off' | 'all' | 'one'`
- `currentTrack: { title, artist, artworkUrl, durationSec }`
- `currentTimeSec: number` (drives progress bar + elapsed/remaining labels)
- `glassAmount: number` (0–1) — if this is a user- or context-driven setting (e.g. dims further in bright daylight), wire it as described above; otherwise hardcode to 0.26.
- `backgroundPhoto: { url, zoom, focusX, focusY }` — if multiple background photos are used across screens, zoom/focal point should be per-image tunables, not hardcoded.

## Design Tokens

**Colors**
- Base background (behind photo): `#2b241f`
- Scrim gradient: `rgba(20,14,10,.55)` → `rgba(20,14,10,.15)` → `rgba(14,9,6,.75)`
- Glass card fill: `rgba(28,20,14, glassAmount)` (reference value 0.26)
- Card border: `rgba(255,255,255,.3)`
- Accent (shuffle icon only): `#e8a34a`
- Album-art placeholder gradient: `#c8452f` → `#e8a34a`
- White text/icons: `#fff`; secondary text `rgba(255,255,255,.6–.85)`

**Typography**
- Display/headline font: **Anek Devanagari** (weights 400/500/600/800) — supports Devanagari + Latin.
- Monospace/label font: **DM Mono** (weights 400/500) — status bar, timestamps.
- Masthead: 46px / 0.92 line-height, weight 800, letter-spacing -0.02em.
- Track title: 19px, weight 600.
- Artist: 13px, regular.
- Subtitle/eyebrow: 11px `DM Mono`, letter-spacing .22em, uppercase.

**Spacing / Radii**
- Screen side margin: 24px (status bar, masthead, card all align to this).
- Card radius: 20px. Album art radius: 12px. Progress bar / fill radius: 2px.
- Card padding: `20px 20px 18px`.

**Shadows**
- Card: `0 20px 50px rgba(0,0,0,.4)` + inset highlight `0 1px 0 rgba(255,255,255,.22)`.
- Album art: `0 4px 14px rgba(0,0,0,.35)`.
- Text: `0 1px 10px rgba(0,0,0,.6)` (keeps copy legible at low glass strength).

## Assets
- Background photo: `dashboard-bg.png` (included in this folder) — bus dashboard/street scene, placeholder; source the final licensed/production asset separately. Reference crop: ~450% zoom, focal point 35% horizontal / 65% vertical.
- Album art: placeholder gradient only — wire up real artwork per track.
- Fonts: Google Fonts — Anek Devanagari, DM Mono.
- Icons: shuffle and repeat are inline SVGs (path data in the HTML file); prev/next/pause use the Unicode glyphs ⏮ ⏸ ⏭ — swap for your icon system's equivalents if preferred, keeping the same scale and spacing.

## Files
- `glass-control-card-mobile.html` — full HTML/CSS reference for this screen, at the reference `glassAmount = 0.26` setting (included in this folder).
- `dashboard-bg.png` — background photo asset used in the reference file.
