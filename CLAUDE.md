# CLAUDE.md — सवारी रेडियो (Sawaari Radio)

Project context for Claude Code. Read this before touching the codebase. Full reasoning/history lives in `bus-radio-spec.md` in this repo — this file is the operational summary, that one's the "why."

Formerly working-titled "Indian Bus Radio" — rebranded to **सवारी रेडियो / Sawaari Radio** per the design handoff in `design_handoff_glass_shelf_player/` (README.md there is the source of truth for exact tokens; `3f-glass-shelf-v2.html` is the static reference this was implemented from).

There are **two** handoffs, and both are authoritative for their own breakpoint — don't treat mobile as a squeezed desktop:
- `design_handoff_glass_shelf_player/` — desktop, 1280×720 frame
- `design_handoff_glass_shelf_mobile/` — mobile, 390×844 frame

## What this is

Single-page ambient audio site. One full-bleed illustrated scene (interior of an Indian public bus, POV from behind the driver) fills the viewport. Music plays from a curated playlist, default off. Floating UI sits over the illustration. Mechanic is inspired by saloon.wtf (illustrated scene + audio player, originally + live listener count + community song submissions) — different setting, not a clone. V1 ships player-only; live count and recommendations are both deferred (see Constraints).

Typography: **Anek Devanagari** (display/masthead, Devanagari + Latin) + **DM Mono** (status bar, timestamps, eyebrow labels), both via Google Fonts CDN.

## Stack — no build step, ship as static files

- **Base:** vanilla HTML/CSS/JS
- **Reactivity escalation path:** if state-syncing across the player gets unwieldy in vanilla, add **Alpine.js via CDN** (`<script src="...alpinejs...">`) — no bundler, no npm. Do NOT introduce React, Vue, Svelte, or any build-step framework. That decision is closed.
- **Motion:** GSAP (CDN), for UI micro-interactions only (button hovers, etc.) — NOT for the background, which is static (see Constraints).
- **Backend:** none currently wired. Supabase (Realtime Presence for live count, Postgres for recommendations) is the planned backend if/when either feature returns — see Constraints. No custom server either way.
- **Audio:** YouTube IFrame Player API, hidden player element, custom controls. No API key needed at runtime — playback doesn't require one, only the offline playlist-curation tool did.
- **Hosting:** Vercel. Import the GitHub repo in the Vercel dashboard, framework preset "Other", no build command/output dir — push static files directly, no CI build step required.

## File structure

```
index.html
/css/style.css
/js/app.js          — player state, controls, progress/seek
/assets/hero.webp    — background illustration (upscaled)
/assets/playlist.json — {title, channel, videoId}[]
/design_handoff_glass_shelf_player/ — desktop design source of truth (README.md + static HTML reference)
/design_handoff_glass_shelf_mobile/  — mobile design source of truth (390×844)
```

## Constraints — do not re-litigate these, they're settled decisions

- **Background is 100% static.** No idle animation, no GSAP loop on the illustration, no layer isolation. This was explicitly discussed and cut from scope in favor of shipping speed. Do not add motion back in without being asked.
- **Audio is hidden-YouTube-embed only, never self-hosted MP3s.** Licensing reasoning: self-hosting copyrighted audio is direct infringement risk; embedding official-channel YouTube uploads is the defensible middle ground. Playlist video IDs must come from the pre-approved `playlist.json`, sourced via manual human-confirmed search — don't auto-generate or guess video IDs.
- **Autoplay is off by default.** First play requires an actual user click/tap. This isn't just a browser-policy workaround, it's the intended UX — don't try to force autoplay on load.
- **Top status bar legibility is now solved via a full-bleed gradient scrim, not per-element pills.** SUPERSEDES the earlier "give every top-row element its own pill background" rule — the Glass Shelf v2 design handoff (`design_handoff_glass_shelf_player/README.md`) specifies `linear-gradient(180deg, rgba(20,14,10,.52) 0%, rgba(20,14,10,.06) 38%, rgba(20,14,10,.5) 100%)` over the full hero instead, and that's what's implemented (`.scrim` in `css/style.css`). If legibility problems resurface, revisit at the scrim/gradient layer first, not by reintroducing pills.
- **Mobile has its own design, not a scaled desktop** (`design_handoff_glass_shelf_mobile/`). Implemented in the `max-width: 767px` block of `css/style.css`: hero crop aims at the driver/steering wheel (`object-position: 100% 37%`, vs desktop's centred shrine), its own darker 5-stop scrim, a vertically stacked card (art + text row, then progress, times, controls), a 14px scrubber handle, and 56/74px transport buttons. Geometry was verified to match the reference frame exactly (card at 24,533 342×277 on a 390×844 viewport) — re-verify against the handoff if you touch this block.
- **The `by @kanishk` credit tag (`.credit`) tracks the player card's bottom edge via a shared `--shelf-bottom` CSS variable** — matches Spotify/YT Music styling (gold, 13px, DM Mono). This only works where the card is narrow (`width: fit-content`, desktop-style) so there's empty space beside it. On every breakpoint where the card goes full-width (base mobile, and narrow-and-short) `.credit` is deliberately *not* tied to `--shelf-bottom` and instead gets its own smaller, explicit `bottom` value sitting just below the card — tying it to the shared line there would put it directly on top of the play button. If you add a new breakpoint, check which case it is before touching `.credit`.
- **Three viewport regimes, not two.** `css/style.css` ends with: `(max-height: 480px) and (min-width: 768px)` = wide-and-short (landscape phone, short desktop window) which collapses the card to one fixed-height row; and `(max-height: 620px) and (max-width: 767px)` = narrow-and-short (split-screen, foldable) which keeps the stacked mobile layout but tightens it. The `min-width` on the first is load-bearing — without it, that rule forces its fixed card height onto the stacked mobile layout and pushes the transport controls off-screen entirely, making playback unreachable.
- **The right-hand time label is total duration on desktop but time *remaining* on mobile** (`-2:56`), per the two handoffs. `rightTimeLabel()` in `js/app.js` switches on a `matchMedia('(max-width: 767px)')` that must stay in sync with the CSS breakpoint. `aria-valuetext` deliberately stays absolute ("1:02 of 3:58") in both cases so screen readers aren't given a moving target.
- **Native OS chrome in the mobile mock is deliberately NOT implemented.** The handoff draws a battery/signal glyph and a home-indicator bar, but its own README says to prefer the real OS status bar — this is a web page, so faking either would be wrong. The existing clock stays; the glyph and home indicator are skipped.
- **Losing the far-left/far-right scenery on narrow viewports is an accepted tradeoff, not a bug.**
- **Live listener count is REMOVED from the V1 UI** (removed 2026-08-09 by request — too early-stage; showing "1 sawaari on board" or "0" undersells it more than showing nothing does. Revisit once there's real, non-trivial traffic). `js/presence.js`, `js/supabase.js`, the `.live`/`.dot` markup and CSS, and the `@keyframes pulse` all still exist in git history — recover from there rather than rewriting if it comes back. The original rule still stands if it does: Presence is ephemeral (resets to 0 with no active connections), NOT a persistent "all-time listeners" counter — don't conflate the two.
- **Song recommendations are REMOVED from the V1 UI** (removed 2026-08-09 by request; the Glass Shelf v2 design is player-only). `js/recommend.js`, the form markup, its CSS, and the `recommendations` table SQL all still exist in git history — recover from there rather than rewriting if it comes back. The original rule still stands if it does: never auto-publish, `insert` with `status: 'pending'`, honeypot for spam, manual approval via Supabase's table editor, no admin UI.
- **If/when Supabase comes back (live count or recommendations):** the anon key is meant to be public/client-exposed — that's how Supabase's security model works (RLS handles real protection). Don't over-engineer hiding it. If any other secret is ever introduced, that's a different conversation.

## Explicitly out of scope for V1

- Multi-playlist / station switching
- User accounts or login
- Live listener count (see Constraints — removed until there's real traffic to show)
- Song recommendations + editing/removing already-approved ones from the public UI
- Any server beyond Supabase's client SDK, if/when Supabase returns — stays fully static-hostable

## Current status (update as work progresses)

- [x] Hero illustration — finalized, chosen over 3 generation attempts, art direction documented in spec §5
- [x] Hero illustration — upscaled externally, master was `Frame 1.png` (4368×2160). Removed from the working tree 2026-08-09 — it had no runtime use once `assets/hero.webp` existed, only referenced as the design-reference HTML's own separate (gitignored) copy in `design_handoff_glass_shelf_player/`. Recoverable from git history at commit `230281d` if a different crop/quality is ever needed
- [x] Static shell, CSS, player, presence, recommendation form — built and verified in browser (presence + recommendations both later removed, see Constraints)
- [x] Rebrand to Sawaari Radio per Glass Shelf v2 design handoff — masthead, status bar, player card, progress/seek restyled to match; verify in browser after any further design changes
- [x] Live listener count removed from V1 — status bar is now just clock + Spotify/YT Music links; `js/presence.js` + `js/supabase.js` deleted, recoverable from git history
- [x] Hero as WebP — `webp`/`libtiff` installed via Homebrew, converted with `cwebp -q 80 -resize 2600 0 "Frame 1.png" -o assets/hero.webp` (2600×1286, 551 KB, down from the 1.1 MB JPG). `index.html` now points at `assets/hero.webp`; `assets/hero.jpg` deleted, verified in browser at desktop + mobile
- [x] Player edge-case hardening — progress bar is now drag-to-scrub (Pointer Events, not just click), `aria-valuetext` gives screen readers real times instead of a bare percentage, Home/End seek to start/end, malformed `playlist.json` entries (missing `videoId`/`title`/`channel`) warn to console with the entry index instead of failing silently — all verified in browser
- [x] Mobile design handoff implemented (`design_handoff_glass_shelf_mobile/`) — hero crop, scrim, stacked player card, scrubber handle, 56/74px transport, remaining-time label. Geometry verified against the reference at 390×844 (exact match); desktop confirmed unregressed
- [x] Playlist — `assets/playlist.json` now has all 61 real songs, imported from the public YouTube playlist `PLDdNNsCxZ2Js` ("Bus Radio") that backs the YT Music link — video IDs read straight off that playlist, not guessed, satisfying the licensing rule. Note the count is 61, not the "50-song" figure earlier notes referenced; that number was always approximate. Every single track was embed-tested (see below) and confirmed playable in the live player (spot-checked tracks 1–2 advancing correctly with real audio/art/duration). Some overlong marketing-style titles (e.g. "... Full Video Song | Movie | Cast Names") were trimmed for display; if you want the raw YouTube titles verbatim instead, say so
- [x] Playlist embeddability — tested all 61 videos programmatically (hidden muted `YT.Player` per video, watched for real `PLAYING` state vs `onError` 101/150). Result: **61/61 embeddable**, zero blocked. (First test pass falsely showed mass failures — that was unmuted autoplay being silently blocked by browser policy, not real embed restrictions; muting the test players fixed it. If this is ever re-tested, mute the player or it'll produce false negatives.)
- [x] Spotify / YT Music links — wired 2026-08-09 to the curated "Bus Radio" playlist in each app (Spotify `7woOLSZijkm50yU3QelG8X`, YT Music `PLDdNNsCxZ2Js`). Both verified live. `si=` share tokens stripped deliberately — they're per-share attribution and don't belong in a public page. Note the YT playlist ID is only 13 chars, which looks truncated but is genuinely valid — don't "fix" it
- [ ] Deploy — repo is live at github.com/kanishksingh3012/bus-radio; deploying via Vercel (import repo in dashboard), not GitHub Pages

## Build order

1. Static HTML shell — structure only, no styling
2. CSS pass — full-bleed hero (placeholder image OK to start), floating chrome positioned per constraints above
3. YouTube IFrame API wiring — hidden player + custom controls, placeholder track array
4. ~~Supabase Presence — live count~~ removed for V1, see Constraints
5. ~~Recommendation form + table + honeypot~~ removed for V1, see Constraints
6. Swap in real (upscaled) hero image
7. Swap in real playlist.json once resolved
8. Mobile responsive pass
9. Deploy to Vercel (import GitHub repo in dashboard)
