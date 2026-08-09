# Handoff: Sawaari Radio — Now Playing (Mobile, Glass Shelf v2)

## Overview
Mobile now-playing screen for "Sawaari Radio," an in-bus radio streaming platform inspired by Indian long-distance bus travel. Full-bleed windshield background photo, masthead, and a floating glass player card sized for a phone viewport. This is the mobile counterpart of the "3f Glass Shelf v2" desktop screen (see the sibling `design_handoff_glass_shelf_player` folder for that version, if present) — same visual language, laid out for a 390×844 phone frame with a home-indicator bar instead of a browser-style status bar row of links.

## About the Design Files
The bundled HTML file is a **design reference** — a static prototype showing intended look, layout, and copy. It is not production code. Recreate this design in the target codebase's existing framework (React Native, SwiftUI, Jetpack Compose, or a mobile web framework), using its established component patterns and styling approach — not by shipping the HTML/inline-styles directly. If no mobile framework exists yet in the target repo, choose the most appropriate one for the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and radii below are final values taken directly from the design file. Recreate pixel-accurately, translating inline styles into the codebase's native styling system.

## Screens / Views

### Now Playing — Mobile
**Purpose:** Default/home screen on a phone. Passenger sees what's currently playing and controls playback.

**Canvas:** 390×844 (iPhone-class portrait frame). In production, treat the background photo as covering the full device viewport; the player card and masthead stay anchored to fixed inset margins rather than scaling with screen size (design with safe-area insets in mind for notch/home-indicator devices).

**Layers (back to front):**
1. Background photo (bus windshield / driver's-view), cropped/zoomed and positioned via `background-size` / `background-position` (in the reference file: size `1794×887px`, position `100% 37%` — i.e., zoomed to ~460% of frame width, focused to the far right/upper area of the source photo, showing road, steering wheel and driver). In production, expose zoom level and focal point as tunable values so the crop can be re-aimed per background image.
2. Full-bleed vertical gradient scrim for legibility: `linear-gradient(180deg, rgba(20,14,10,.7) 0%, rgba(20,14,10,.6) 30%, rgba(20,14,10,.22) 48%, rgba(16,10,7,.72) 78%, rgba(14,9,6,.88) 100%)`.
3. Status bar row (time + signal glyph).
4. Masthead (title + subtitle), left-aligned.
5. Floating glass player card, bottom, full-width minus side margins.
6. Home-indicator bar, bottom center.

**Status bar** — absolute, `top: 14px`, `left/right: 24px`, flex row, `justify-content: space-between`, `DM Mono` 13px, color `#fff`:
- Left: device time, e.g. "1:26".
- Right: simple signal/battery glyph (16×9px rounded rect outline, 70%-filled white bar) — a stand-in for the OS status bar; in production this is typically the native status bar, not custom-drawn.

**Masthead** — absolute, `top: 196px`, `left: 24px`:
- Title "सवारी रेडियो" (Sawaari Radio) on two lines ("सवारी" / "रेडियो"), font-weight 800, font-size 46px, line-height 0.92, color `#fff`, letter-spacing -0.02em, `text-shadow: 0 4px 26px rgba(0,0,0,.5)`.
- Subtitle, margin-top 12px: "NON-STOP HIGHWAY RADIO", `DM Mono` 11px, letter-spacing 0.22em, uppercase, color `rgba(255,255,255,.75)`.

**Player card** — absolute, `left/right: 24px` (full width minus margins), `bottom: 34px`, padding `22px 20px 24px`, `border-radius: 26px`, `backdrop-filter: blur(28px)`, `border: 1px solid rgba(255,255,255,.2)`, `box-shadow: 0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.2)`, `background: rgba(20,15,11,.55)`.

Card contents, top to bottom:
1. **Track info row** — flex row, `align-items: center`, gap 16px:
   - Album art — 64×64px, flex:none, `border-radius: 14px`, placeholder gradient `linear-gradient(140deg,#c8452f,#e8a34a)`, `box-shadow: 0 6px 18px rgba(0,0,0,.35)`. Replace with real album art image.
   - Track text (flex:1, min-width:0, so it truncates instead of overflowing):
     - Eyebrow "NOW PLAYING", `DM Mono` 10px, letter-spacing 0.22em, color `rgba(255,255,255,.6)`.
     - Track title "गाड़ी बुला रही है", 21px, weight 600, color `#fff`, single line, ellipsis overflow.
     - Artist/album "किशोर कुमार · Dost 1974", 14px, color `rgba(255,255,255,.6)`, single line, ellipsis overflow.
2. **Progress bar** — margin-top 20px, height 20px row containing: track (flex:1, height 4px, `border-radius:2px`, `background: rgba(255,255,255,.24)`) with filled portion (`background:#fff`, 26% width) and a 14×14px round white scrubber handle (`box-shadow: 0 2px 8px rgba(0,0,0,.45)`) positioned at the fill's leading edge.
3. **Time labels** — margin-top 6px, flex row `justify-content: space-between`, `DM Mono` 11px, color `rgba(255,255,255,.55)`: elapsed "1:02" / remaining "-2:56".
4. **Transport controls** — margin-top 18px, flex row, centered, gap 26px:
   - Prev (⏮) — 56×56px circle, `background: rgba(255,255,255,.08)`, icon color `rgba(255,255,255,.9)`, font-size 19px.
   - Play/pause (▶) — 74×74px circle, `background:#f3ece1`, icon color `#1a1613`, font-size 24px, `box-shadow: 0 8px 24px rgba(0,0,0,.4)`.
   - Next (⏭) — 56×56px circle, same style as prev.

**Home indicator** — absolute, centered horizontally, `bottom: 9px`, 134×5px, `border-radius: 3px`, `background: rgba(255,255,255,.55)`. This is a design stand-in for the OS home-indicator bar shown on notch-less gesture devices — on iOS this is drawn by the system, not the app; on Android, omit or replace with the platform's own gesture-nav treatment.

## Interactions & Behavior
- Play/pause button toggles playback state; icon should swap ▶ / ⏸.
- Prev/next buttons skip queue tracks.
- Progress bar fill width and handle position reflect `currentTime / duration`; should be draggable/seekable (touch drag, not just tap).
- Track title/artist truncate with ellipsis on overflow — no marquee/scroll animation specified.
- No hover states apply on mobile touch targets; add standard pressed/active state (e.g. opacity or scale-down on tap) per the codebase's interaction conventions. All three transport buttons and the progress handle should meet a minimum 44×44px touch target (prev/next at 56px and play at 74px already clear this; the album art image is not tappable in this mock).
- Status bar time/signal glyph is a design stand-in — in production, prefer the native OS status bar over a custom-drawn one.

## State Management
- `isPlaying: boolean`
- `currentTrack: { title, artist, album, artworkUrl, durationSec }`
- `currentTimeSec: number` (drives progress bar + elapsed/remaining labels)
- `backgroundPhoto: { url, zoom, focusX, focusY }` — if multiple background photos are used across screens, zoom/focal point should be per-image tunables, not hardcoded.

## Design Tokens

**Colors**
- Base background (behind photo): `#2b241f`
- Scrim gradient: `rgba(20,14,10,*)` / `rgba(16,10,7,.72)` / `rgba(14,9,6,.88)`
- Player card background: `rgba(20,15,11,.55)`
- Card border: `rgba(255,255,255,.2)`
- Accent gradient (art placeholder): `#c8452f` → `#e8a34a`
- White text: `#fff`; secondary text `rgba(255,255,255,.55–.75)`
- Play button fill: `#f3ece1`; icon `#1a1613`
- Transport button background (prev/next): `rgba(255,255,255,.08)`

**Typography**
- Display/headline font: **Anek Devanagari** (weights 400/500/600/800) — supports Devanagari + Latin.
- Monospace/label font: **DM Mono** (weights 400/500) — used for status bar, timestamps, eyebrow labels, all-caps micro-copy.
- Masthead: 46px / 0.92 line-height, weight 800, letter-spacing -0.02em.
- Track title: 21px, weight 600.
- Artist/album: 14px, regular.
- Eyebrow/label text: 10–11px `DM Mono`, letter-spacing 0.22em, uppercase.

**Spacing / Radii**
- Screen side margin: 24px (status bar, masthead, player card all align to this).
- Card radius: 26px. Album art radius: 14px. Transport buttons: fully round (50%).
- Card padding: `22px 20px 24px`.

**Shadows**
- Card: `0 20px 60px rgba(0,0,0,.5)` + inset highlight `0 1px 0 rgba(255,255,255,.2)`.
- Art: `0 6px 18px rgba(0,0,0,.35)`. Play button: `0 8px 24px rgba(0,0,0,.4)`. Progress handle: `0 2px 8px rgba(0,0,0,.45)`.

## Assets
- Background photo: `Frame 1.png` (included in this folder) — bus windshield/driver's-view photo, placeholder; source the final licensed/production asset separately. Reference crop: 460% zoom, focal point 97% horizontal / 37% vertical.
- Album art: placeholder gradient only — wire up real artwork per track.
- Fonts: Google Fonts — Anek Devanagari, DM Mono.

## Files
- `3f-glass-shelf-v2-mobile.html` — full HTML/CSS reference for this screen (included in this folder).
- `Frame 1.png` — background photo asset used in the reference file.
