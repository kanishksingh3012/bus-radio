# Handoff: Sawaari Radio — Windshield Screen (Glass Shelf v2)

## Overview
Single-screen music player UI for "Sawaari Radio," an in-bus radio streaming platform inspired by Indian long-distance bus travel. This screen ("3f Glass Shelf v2") shows the main now-playing view: full-bleed bus-windshield background photo, masthead, status bar, and a floating glass player card.

## About the Design Files
The bundled HTML file is a **design reference** — a static prototype showing intended look, layout, and copy. It is not production code. Recreate this design in the target codebase's existing framework (React, Vue, native, etc.), using its established component patterns, state management, and styling approach. If no frontend framework exists yet in the target repo, choose the most appropriate one for the project.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and radii below are final values taken directly from the design file. Recreate pixel-accurately using the codebase's existing styling system (convert inline styles to the codebase's CSS/styling convention — do not ship inline styles).

## Screens / Views

### Windshield — Now Playing
**Purpose:** Default/home screen. Passenger sees what's currently playing and controls playback.

**Canvas:** 1280×720 (design frame). Treat as a fluid, full-viewport screen in production — the background photo should cover the full available viewport (`background-size: cover`), not a fixed 1280×720 box.

**Layers (back to front):**
1. Background photo (bus windshield / driver's view), `background-position: center`, `background-size: cover`.
2. Full-bleed gradient overlay for text legibility: `linear-gradient(180deg, rgba(20,14,10,0.52) 0%, rgba(20,14,10,0.06) 38%, rgba(20,14,10,0.5) 100%)`.
3. Top status bar.
4. Masthead (title + subtitle), left-aligned.
5. Floating glass player card, bottom-left.

**Top status bar** — absolutely positioned, `top: 22px`, `left/right: 48px`, flex row, `justify-content: space-between`, font `DM Mono` 13px, color `rgba(255,255,255,0.9)`:
- Left: current time, e.g. "1:26 am".
- Center (absolutely centered independent of the two side items via `left:50%; transform:translateX(-50%)`): live listener count with a pulsing green dot (`6px` circle, `#5fd07a`, `pulse` animation: opacity 1→0.35→1, 2.4s ease-in-out infinite) + text "42 sawaari on board".
- Right: two external service links, gap 22px — "Spotify ↗", "YT Music ↗".

**Masthead** — absolute, `top: 76px`, `left: 48px`:
- Title "सवारी रेडियो" (Sawaari Radio) on two lines ("सवारी" / "रेडियो"), font-weight 800, font-size 96px, line-height 0.9, color `#fff`, letter-spacing -0.03em.
- Subtitle 18px margin-top: "NON-STOP HIGHWAY RADIO", `DM Mono` 13px, letter-spacing 0.28em, uppercase, color `rgba(255,255,255,0.78)`.

**Player card** — absolute, `left: 48px`, `bottom: 48px`, height 109px, width: hug/shrink-to-fit content (do not stretch full width), horizontal padding 28px, flex row, `align-items: center`, gap 36px between the track-info group and the transport group. Card style: `border-radius: 18px`, `background: rgba(20,15,11,0.62)`, `backdrop-filter: blur(26px)`, `border: 1px solid rgba(255,255,255,0.24)`, `box-shadow: 0 18px 50px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.22)`, overall card `opacity: 0.66`.

Card contents, left to right:
1. **Album art** — 78×78px, `border-radius: 12px`, placeholder gradient `linear-gradient(140deg,#c8452f,#e8a34a)`, `box-shadow: 0 6px 18px rgba(0,0,0,0.35)`. Replace with real album art image.
2. **Track info** (gap 22px from art) — stacked, ~153–230px wide:
   - Eyebrow label "NOW PLAYING", `DM Mono` 10px, letter-spacing 0.24em, color `rgba(255,255,255,0.62)`.
   - Track title "गाड़ी बुला रही है", 20px, weight 600, color `#fff`, single line with ellipsis overflow.
   - Artist/album "किशोर कुमार · 1974", 13px, color `rgba(255,255,255,0.6)`.
3. **Transport group** (300px wide, stacked column, centered, gap 12px):
   - Controls row: prev (⏮), play/pause (52×52px circle, `background: rgba(255,255,255,0.92)`, icon color `#1a1613`, `box-shadow: 0 6px 18px rgba(0,0,0,0.3)`), next (⏭) — gap 20px, icon color `rgba(255,255,255,0.88)`.
   - Progress row: elapsed time "1:02" (`DM Mono` 10px, `rgba(255,255,255,0.6)`) — progress track (flex:1, height 3px, `border-radius:2px`, `background: rgba(255,255,255,0.26)`, filled portion `background:#fff` at 26% width) — total time "3:58".

## Interactions & Behavior
- Play/pause button toggles playback state; icon should swap ▶ / ⏸.
- Prev/next buttons skip queue tracks.
- Progress bar fill width reflects `currentTime / duration`; ideally draggable/seekable.
- Listener count and green dot indicate a live/connected state — should update from a live data source (e.g. websocket) rather than being static.
- "Spotify ↗" / "YT Music ↗" are external links — open in a new tab.
- No hover/focus states were specified in the mock; add standard hover/focus affordances (subtle opacity or scale change on buttons) per the codebase's interaction conventions.

## State Management
- `isPlaying: boolean`
- `currentTrack: { title, artist, album, artworkUrl, durationSec }`
- `currentTimeSec: number` (drives progress bar + elapsed label)
- `listenerCount: number`
- `currentTimeOfDay` (clock display, e.g. from device clock)

## Design Tokens

**Colors**
- Background scrim dark: `#12100e`, `rgba(20,14,10,*)`
- Player card background: `rgba(20,15,11,0.62)` at card opacity `0.66`
- Card border: `rgba(255,255,255,0.24)`
- Accent gradient (art placeholder): `#c8452f` → `#e8a34a`
- Live indicator green: `#5fd07a`
- White text: `#fff`; secondary text `rgba(255,255,255,0.6–0.78)`
- Play button fill: `rgba(255,255,255,0.92)`; icon `#1a1613`

**Typography**
- Display/headline font: **Anek Devanagari** (weights 400/500/600/800) — supports Devanagari + Latin.
- Monospace/label font: **DM Mono** (weights 400/500) — used for status bar, timestamps, eyebrow labels, all-caps micro-copy.
- Masthead: 96px/0.9 line-height, weight 800, letter-spacing -0.03em.
- Track title: 20px, weight 600.
- Eyebrow/label text: 10–13px `DM Mono`, letter-spacing 0.24–0.28em, uppercase.

**Spacing / Radii**
- Screen margin: 48px (status bar, masthead, player card all align to this).
- Card radius: 18px. Art radius: 12px. Play button: fully round (50%).
- Card internal padding: 28px horizontal.

**Shadows**
- Card: `0 18px 50px rgba(0,0,0,0.4)` + inset highlight `0 1px 0 rgba(255,255,255,0.22)`.
- Art/play button: `0 6px 18px rgba(0,0,0,0.3–0.35)`.

**Motion**
- `pulse`: opacity 1 → 0.35 → 1, 2.4s ease-in-out infinite (live dot).

## Assets
- Background photo: bus windshield/driver's-view illustration (`Frame 1.png` in the design project — placeholder; source the final licensed/production asset separately).
- Album art: placeholder gradient only — wire up real artwork per track.
- Fonts: Google Fonts — Anek Devanagari, DM Mono.

## Files
- `3f-glass-shelf-v2.html` — full HTML/CSS reference for this screen (included in this folder).
