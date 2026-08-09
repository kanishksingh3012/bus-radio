# CLAUDE.md — सवारी रेडियो (Sawaari Radio)

Project context for Claude Code. Read this before touching the codebase. Full reasoning/history lives in `bus-radio-spec.md` in this repo — this file is the operational summary, that one's the "why."

Formerly working-titled "Indian Bus Radio" — rebranded to **सवारी रेडियो / Sawaari Radio** per the design handoff in `design_handoff_glass_shelf_player/` (README.md there is the source of truth for exact tokens; `3f-glass-shelf-v2.html` is the static reference this was implemented from).

## What this is

Single-page ambient audio site. One full-bleed illustrated scene (interior of an Indian public bus, POV from behind the driver) fills the viewport. Music plays from a curated playlist, default off. Floating UI sits over the illustration. Mechanic is the same as saloon.wtf (illustrated scene + audio player + live listener count + community song submissions) — different setting, not a clone.

Typography: **Anek Devanagari** (display/masthead, Devanagari + Latin) + **DM Mono** (status bar, timestamps, eyebrow labels), both via Google Fonts CDN.

## Stack — no build step, ship as static files

- **Base:** vanilla HTML/CSS/JS
- **Reactivity escalation path:** if state-syncing across the player/live-count/form gets unwieldy in vanilla, add **Alpine.js via CDN** (`<script src="...alpinejs...">`) — no bundler, no npm. Do NOT introduce React, Vue, Svelte, or any build-step framework. That decision is closed.
- **Motion:** GSAP (CDN), for UI micro-interactions only (button hovers, etc.) — NOT for the background, which is static (see Constraints).
- **Backend:** Supabase — Realtime Presence (live count) + Postgres (recommendations table). No custom server. Everything runs client-side against Supabase's JS SDK.
- **Audio:** YouTube IFrame Player API, hidden player element, custom controls. No API key needed at runtime — playback doesn't require one, only the offline playlist-curation tool did.
- **Hosting:** GitHub Pages. Push static files directly, no CI build step required.

## File structure

```
index.html
/css/style.css
/js/app.js          — player state, controls, progress/seek
/js/supabase.js      — shared Supabase client (placeholder creds)
/js/presence.js      — Supabase live count
/assets/hero.webp    — background illustration (upscaled)
/assets/playlist.json — {title, channel, videoId}[]
/design_handoff_glass_shelf_player/ — design source of truth (README.md + static HTML reference)
```

## Constraints — do not re-litigate these, they're settled decisions

- **Background is 100% static.** No idle animation, no GSAP loop on the illustration, no layer isolation. This was explicitly discussed and cut from scope in favor of shipping speed. Do not add motion back in without being asked.
- **Audio is hidden-YouTube-embed only, never self-hosted MP3s.** Licensing reasoning: self-hosting copyrighted audio is direct infringement risk; embedding official-channel YouTube uploads is the defensible middle ground. Playlist video IDs must come from the pre-approved `playlist.json`, sourced via manual human-confirmed search — don't auto-generate or guess video IDs.
- **Autoplay is off by default.** First play requires an actual user click/tap. This isn't just a browser-policy workaround, it's the intended UX — don't try to force autoplay on load.
- **Top status bar legibility is now solved via a full-bleed gradient scrim, not per-element pills.** SUPERSEDES the earlier "give every top-row element its own pill background" rule — the Glass Shelf v2 design handoff (`design_handoff_glass_shelf_player/README.md`) specifies `linear-gradient(180deg, rgba(20,14,10,.52) 0%, rgba(20,14,10,.06) 38%, rgba(20,14,10,.5) 100%)` over the full hero instead, and that's what's implemented (`.scrim` in `css/style.css`). If legibility problems resurface, revisit at the scrim/gradient layer first, not by reintroducing pills.
- **Mobile:** `object-fit: cover` on the hero image, `object-position` weighted toward the dashboard/idols (visual center), not the frame edges. Losing the far-left/far-right scenery on narrow viewports is an accepted tradeoff, not a bug.
- **Live count uses Supabase Presence — this is ephemeral**, resets to 0 with no active connections. It is NOT a persistent "all-time listeners" counter. Don't conflate the two or build one when the other was asked for.
- **Song recommendations are REMOVED from the V1 UI** (removed 2026-08-09 by request; the Glass Shelf v2 design is player-only). `js/recommend.js`, the form markup, its CSS, and the `recommendations` table SQL all still exist in git history — recover from there rather than rewriting if it comes back. The original rule still stands if it does: never auto-publish, `insert` with `status: 'pending'`, honeypot for spam, manual approval via Supabase's table editor, no admin UI.
- **Supabase anon key is meant to be public/client-exposed** — that's how Supabase's security model works (RLS handles real protection). Don't over-engineer hiding it. If any other secret is ever introduced, that's a different conversation.

## Explicitly out of scope for V1

- Multi-playlist / station switching
- User accounts or login
- Editing or removing already-approved recommendations from the public UI
- Any server beyond Supabase's client SDK — stays fully static-hostable

## Current status (update as work progresses)

- [x] Hero illustration — finalized, chosen over 3 generation attempts, art direction documented in spec §5
- [x] Hero illustration — upscaled externally, master is `Frame 1.png` (4368×2160)
- [x] Static shell, CSS, player, presence, recommendation form — built and verified in browser
- [x] Rebrand to Sawaari Radio per Glass Shelf v2 design handoff — masthead, status bar, player card, progress/seek, recommendation card restyled to match; verify in browser after any further design changes
- [ ] Hero as WebP — currently shipping `assets/hero.jpg` (2600×1285, 1.1 MB). No `cwebp`/ImageMagick on this machine and neither `sips` nor ImageIO can write WebP. Run `brew install webp`, then `cwebp -q 80 -resize 2600 0 "Frame 1.png" -o assets/hero.webp` and update the `src` in `index.html`
- [ ] Playlist — `assets/playlist.json` holds 3 clearly-marked TEST placeholders. Replace wholesale with the resolved 50-song list; shape `{title, channel, videoId}` already matches, no code change needed
- [ ] Supabase project — not yet created. Fill `SUPABASE_URL` / `SUPABASE_ANON_KEY` in `js/supabase.js`; the table + RLS SQL to run is in that file's header comment. Both features degrade gracefully until then
- [ ] Spotify / YT Music links in `index.html` — still `href="#"`
- [ ] Repo / GitHub Pages URL — local git repo initialised, no remote yet

## Build order

1. Static HTML shell — structure only, no styling
2. CSS pass — full-bleed hero (placeholder image OK to start), floating chrome positioned per constraints above
3. YouTube IFrame API wiring — hidden player + custom controls, placeholder track array
4. Supabase Presence — live count, wire to real project once it exists
5. Recommendation form + table + honeypot
6. Swap in real (upscaled) hero image
7. Swap in real playlist.json once resolved
8. Mobile responsive pass
9. Deploy to GitHub Pages
