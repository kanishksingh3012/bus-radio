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

- **Mobile background/lock-screen audio does not survive — confirmed broken on real device (iPhone 16, Safari), and confirmed to STAY broken even after adding Media Session support** (metadata + playbackState + play/pause/prev/next handlers, still in `js/app.js` for the lock-screen-controls benefit alone). Root cause is presumed to be that the audio plays inside a cross-origin YouTube iframe rather than a media element this page owns directly, which Media Session doesn't reliably cover — never independently confirmed further than that, and don't assume there's another lever to pull without new information.
- **This is explicitly accepted, not an open bug — desktop is the primary intended use case, decided 2026-08-09.** Desktop browsers don't suspend background tabs' audio the way mobile OSes suspend backgrounded apps/tabs, so this limitation doesn't apply there. Do not resume chasing the mobile background-audio problem (e.g. PWA/"Add to Home Screen" mode, alternative embed strategies, etc.) unless explicitly asked again — it was consciously deprioritized, not forgotten.

- **Playback order is shuffled by default**, per request 2026-08-09. `shuffleInPlace()` in `js/app.js` (Fisher-Yates) runs once per page load, right after `tracks` is populated from `assets/playlist.json` and before the first track renders — so the very first track shown/played is already part of the shuffled order, not always track #0 of the source file. This is intentionally *not* persisted (no localStorage) — every reload reshuffles. Since `tracks` always comes fresh from the current `playlist.json` (never cached), adding or removing songs there is automatically reflected in the shuffle pool on the very next load — no extra sync step needed.
- **`assets/playlist.json` is kept in sync with the YouTube source playlist manually, by request** — confirmed 2026-08-09, explicitly chose manual over building a sync script/tool. When the YouTube playlist (`PLDdNNsCxZ2Js`) changes, tell Claude and it re-runs the same import process used to build the original 61-song list (pull current playlist contents, map to `{title, channel, videoId}`, embed-test any new additions). Don't build automated sync tooling unless asked again.
- **Background is 100% static.** No idle animation, no GSAP loop on the illustration, no layer isolation. This was explicitly discussed and cut from scope in favor of shipping speed. Do not add motion back in without being asked.
- **Audio is hidden-YouTube-embed only, never self-hosted MP3s.** Licensing reasoning: self-hosting copyrighted audio is direct infringement risk; embedding official-channel YouTube uploads is the defensible middle ground. Playlist video IDs must come from the pre-approved `playlist.json`, sourced via manual human-confirmed search — don't auto-generate or guess video IDs.
- **Brave's Shields (and similarly aggressive ad/tracker blockers) block the YouTube IFrame API bootstrap script by default for some users** — confirmed 2026-08-09 by direct user report: reproduced on the live Vercel deploy, fixed immediately by disabling Shields for the site. This reproduces in Brave's Private windows too, since Shields is a core browser feature, not an extension that gets disabled there like normal Chrome incognito. There is no client-side workaround — `youtube.com/iframe_api` has no alternate/mirror domain, so if a user's browser or network blocks that specific request, playback cannot work, full stop. The existing "Playback blocked — check your ad blocker or connection" fallback in `js/app.js` (fires after a 6s timeout with no API callback) is the correct and complete handling for this — don't chase it further as a bug. Switching the actual embedded player to `host: 'https://www.youtube-nocookie.com'` (done the same day) is a good practice improvement but does NOT address this specific failure, since it only affects the later embed stage, not the bootstrap script.
- **The blocked-state help text lives in its own `#blocked-help` paragraph, not `.track-channel`.** `.track-channel` truncates with ellipsis (correct for real channel names, which are always short) — the ad-blocker explanation is a full sentence and was getting cut off mid-word in production ("Check your ad blocker or c..."). `.blocked-help` drops onto its own wrapped row inside `.player-card` (needs `flex-wrap: wrap` + `min-height` instead of a fixed `height` on the card — both added for this), hidden by default, only shown by the same apiReady timeout that used to write the truncated text into `.track-channel`. `renderTrack()` re-hides it on every normal render, so it can't linger into a later track. Names Brave Shields specifically in the copy since that's the confirmed real-world cause, not a generic "check your ad blocker."
- **`.player-card`'s desktop width is capped at `max-width: min(100%, 665px)`, not left as bare `fit-content`.** Found the hard way: once `.blocked-help` (a wrapping paragraph) became a possible child, `width: fit-content` on the card ballooned to ~1184px in the blocked state — a flex container's shrink-to-fit width calc can size itself off a wrapped item's *unwrapped* max-content width even though the text visibly wraps once rendered. Neither `min-width: 0` nor fixing `flex-shrink` on `.blocked-help` alone fixed it (both are correct to have, but insufficient on their own) — the fix that actually worked was capping the container itself at the width it already computes to in the normal 3-item state (~661px), so the browser has a concrete box to wrap the paragraph within instead of deriving width from content circularly. If you touch this again: verify by comparing `.player-card`'s actual measured width in both states, not just checking the help text doesn't overflow the card — that check passes even when the whole card has wrongly ballooned.
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
- [x] Hero illustration corrected 2026-08-09 — signboard typo fix only (नमरते जी → नमस्ते जी / "namarte ji" → "namaste ji"), rest of the composition identical. Re-converted from the corrected source (2908×1440) at the same settings (`cwebp -q 80 -resize 2600 0`, 272 KB, actually smaller than the previous 551 KB). Existing crop/`object-position` values on both desktop and mobile still apply unchanged since nothing moved — verified in browser at both breakpoints. Source master isn't tracked in git (was a transient file dropped at repo root, deleted after conversion) — if a different crop/quality is needed later, source the image externally again rather than trying to recover it from history
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
