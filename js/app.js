/* Player. Audio comes from a hidden YouTube embed — never self-hosted files.
   Video IDs come only from assets/playlist.json; never construct or guess them.
   Album art uses YouTube's own thumbnail for that same approved videoId
   (img.youtube.com/vi/<id>/hqdefault.jpg) — no separate art source needed. */

(function () {
  'use strict';

  var els = {
    art: document.getElementById('track-art'),
    title: document.getElementById('track-title'),
    channel: document.getElementById('track-channel'),
    play: document.getElementById('play'),
    prev: document.getElementById('prev'),
    next: document.getElementById('next'),
    shuffle: document.getElementById('shuffle'),
    repeat: document.getElementById('repeat'),
    elapsed: document.getElementById('time-elapsed'),
    total: document.getElementById('time-total'),
    progressTrack: document.getElementById('progress-track'),
    progressFill: document.getElementById('progress-fill'),
    blockedHelp: document.getElementById('blocked-help')
  };

  // `tracks` always points at whichever of these two is currently active —
  // everything else in this file (step, loadCurrent, onError's length
  // check, etc.) just reads/indexes `tracks` and doesn't need to know which
  // ordering is live. originalTracks is playlist.json's own order;
  // shuffledTracks is computed once at load (see shuffleInPlace below) and
  // reused on every toggle back to shuffle, not re-randomized per toggle.
  var originalTracks = [];
  var shuffledTracks = [];
  var tracks = [];
  var shuffleOn = true; // shuffled by default, per the earlier standing decision
  var repeatMode = 'off'; // 'off' | 'all' | 'one' — see onStateChange for what each does
  var index = 0;
  var player = null;
  var apiReady = false;
  // Nothing reaches the player before a real click — autoplay-off is the intended UX.
  var started = false;
  var progressTimer = null;
  var consecutiveErrors = 0;
  var apiTimeoutId = null;
  var dragging = false;

  // Fisher-Yates. Runs once per page load, right after tracks are fetched —
  // reshuffles are inherent to "reload the page," and since tracks always
  // come from the current assets/playlist.json (never cached), an added or
  // removed song is picked up automatically on the very next load.
  function shuffleInPlace(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function setControlsEnabled(on) {
    els.play.disabled = !on;
    els.prev.disabled = !on;
    els.next.disabled = !on;
    els.shuffle.disabled = !on;
    els.repeat.disabled = !on;
  }

  function renderShuffleState() {
    els.shuffle.setAttribute('aria-pressed', String(shuffleOn));
  }

  // Reuses the same pre-computed shuffledTracks on every toggle (doesn't
  // re-shuffle each time) — only decides which of the two orderings is
  // active. Keeps the currently-playing track playing either way; only
  // future prev/next/ended navigation is affected by the switch.
  function toggleShuffle() {
    var current = tracks[index];
    shuffleOn = !shuffleOn;
    tracks = shuffleOn ? shuffledTracks : originalTracks;
    var newIndex = tracks.indexOf(current);
    index = newIndex === -1 ? 0 : newIndex;
    renderShuffleState();
  }

  function renderRepeatState() {
    els.repeat.dataset.mode = repeatMode;
    els.repeat.setAttribute('aria-label', 'Repeat: ' + repeatMode);
  }

  // 'off' and 'all' both keep the ambient-radio queue going continuously
  // (this player never just stops) — 'all' is the icon's on-state for
  // people who expect a visible toggle, but functionally it's the same as
  // 'off' here. 'one' is the only behaviorally distinct mode: replay the
  // current track instead of advancing.
  function cycleRepeat() {
    repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
    renderRepeatState();
  }

  function renderTrack() {
    var t = tracks[index];
    if (!t) return;
    els.title.textContent = t.title || 'Untitled track';
    els.channel.textContent = t.channel || 'Unknown artist';
    els.art.src = 'https://img.youtube.com/vi/' + t.videoId + '/hqdefault.jpg';
    els.blockedHelp.hidden = true;
    resetProgress();
    updateMediaSession(t);
  }

  // Registers this page as a real media session with the OS — lock-screen
  // and Control Center now-playing controls, and (the actual reason this
  // was added) a signal to iOS that this tab is legitimately playing media
  // it should be more lenient about suspending when backgrounded. UNVERIFIED
  // whether that leniency actually extends to audio playing inside a
  // cross-origin iframe (the YouTube embed) rather than a media element
  // this page owns directly — needs testing on a real device. If it turns
  // out not to help, this is still worth keeping for the lock-screen
  // controls alone.
  function updateMediaSession(t) {
    if (!('mediaSession' in navigator) || !t) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: t.title || 'Untitled track',
      artist: t.channel || 'Unknown artist',
      album: 'सवारी रेडियो — Sawaari Radio',
      artwork: [{ src: 'https://img.youtube.com/vi/' + t.videoId + '/hqdefault.jpg', sizes: '480x360', type: 'image/jpeg' }]
    });
  }

  // YouTube returns a 120x90 grey "no thumbnail" placeholder (HTTP 200, not
  // a 404) for videos with no real thumbnail, so a failed <img> load alone
  // won't catch it — check the actual image dimensions too.
  els.art.addEventListener('error', clearArt);
  els.art.addEventListener('load', function () {
    if (els.art.naturalWidth && els.art.naturalWidth <= 120) clearArt();
  });
  function clearArt() {
    els.art.removeAttribute('src');
  }

  function renderPlayState(playing) {
    els.play.classList.toggle('is-playing', playing);
    els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    els.play.setAttribute('aria-pressed', String(playing));
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    if (playing) startProgressLoop(); else stopProgressLoop();
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function resetProgress() {
    els.elapsed.textContent = '0:00';
    els.total.textContent = '0:00';
    els.progressFill.style.width = '0%';
    els.progressTrack.setAttribute('aria-valuenow', '0');
    els.progressTrack.setAttribute('aria-valuetext', '0:00 of 0:00');
  }

  // Both design handoffs (mobile, and now the Glass Control Card desktop
  // redesign) label the right-hand time as remaining ("-2:56"), not total
  // duration — used to differ by breakpoint, doesn't anymore.
  function rightTimeLabel(current, duration) {
    if (!duration) return '0:00';
    return '-' + formatTime(duration - current);
  }

  // Screen readers get the actual times (aria-valuetext), not just a bare
  // percentage — aria-valuenow stays numeric for non-AT consumers.
  function setProgressDisplay(current, duration) {
    var pct = duration ? (current / duration) * 100 : 0;
    els.elapsed.textContent = formatTime(current);
    els.total.textContent = rightTimeLabel(current, duration);
    els.progressFill.style.width = pct + '%';
    els.progressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
    els.progressTrack.setAttribute('aria-valuetext', formatTime(current) + ' of ' + formatTime(duration));
  }

  function updateProgress() {
    if (dragging) return; // don't fight the drag preview with the polling loop
    if (!player || typeof player.getCurrentTime !== 'function') return;
    setProgressDisplay(player.getCurrentTime() || 0, player.getDuration() || 0);
  }

  function startProgressLoop() {
    stopProgressLoop();
    progressTimer = setInterval(updateProgress, 500);
    updateProgress();
  }

  function stopProgressLoop() {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = null;
  }

  function ratioFromClientX(clientX) {
    var rect = els.progressTrack.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  // While dragging, only update the visual preview locally — calling
  // player.seekTo() on every pointermove would spam the YouTube postMessage
  // bridge and stutter. The real seek happens once, on release.
  function previewScrub(ratio, duration) {
    setProgressDisplay(duration * ratio, duration);
  }

  function loadCurrent() {
    player.loadVideoById(tracks[index].videoId);
    renderTrack();
  }

  function step(delta) {
    if (!tracks.length) return;
    index = (index + delta + tracks.length) % tracks.length;
    renderTrack();
    if (started) loadCurrent();
  }

  function togglePlay() {
    if (!player || !tracks.length) return;

    if (!started) {
      started = true;
      loadCurrent();
      return;
    }

    var state = player.getPlayerState();
    if (state === YT.PlayerState.PLAYING || state === YT.PlayerState.BUFFERING) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  }

  function onStateChange(e) {
    if (e.data === YT.PlayerState.ENDED) {
      if (repeatMode === 'one') {
        player.seekTo(0, true);
        player.playVideo();
      } else {
        step(1);
      }
      return;
    }
    if (e.data === YT.PlayerState.PLAYING) consecutiveErrors = 0;
    renderPlayState(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
  }

  function onError() {
    consecutiveErrors++;

    // Every track in the playlist has now failed back-to-back (or it's a
    // single-track playlist that failed) — stop instead of looping forever.
    if (consecutiveErrors >= tracks.length) {
      stopProgressLoop();
      setControlsEnabled(false);
      els.title.textContent = 'Nothing playable right now';
      els.channel.textContent = 'All tracks failed to load';
      return;
    }

    els.channel.textContent = 'Track unavailable — skipping';
    setTimeout(function () { step(1); }, 1200);
  }

  function buildPlayer() {
    player = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      // Privacy-enhanced domain: doesn't set tracking cookies until the
      // user actually plays, and several ad/privacy blockers that block
      // regular youtube.com embeds specifically allow this one.
      host: 'https://www.youtube-nocookie.com',
      playerVars: { playsinline: 1 },
      events: {
        onReady: function () {
          setControlsEnabled(true);
          renderTrack(); // in case the API-blocked message overwrote the title while this was loading
        },
        onStateChange: onStateChange,
        onError: onError
      }
    });
  }

  function maybeInit() {
    if (apiReady && tracks.length) buildPlayer();
  }

  window.onYouTubeIframeAPIReady = function () {
    apiReady = true;
    if (apiTimeoutId) { clearTimeout(apiTimeoutId); apiTimeoutId = null; }
    maybeInit();
  };

  setControlsEnabled(false);

  fetch('assets/playlist.json')
    .then(function (r) {
      if (!r.ok) throw new Error('playlist ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error('playlist is not an array');

      originalTracks = data.filter(function (t, i) {
        if (!t || !t.videoId) {
          console.warn('[player] playlist entry #' + i + ' has no videoId — skipped', t);
          return false;
        }
        if (!t.title) console.warn('[player] playlist entry #' + i + ' (' + t.videoId + ') has no title');
        if (!t.channel) console.warn('[player] playlist entry #' + i + ' (' + t.videoId + ') has no channel');
        return true;
      });

      if (!originalTracks.length) throw new Error('playlist empty');
      shuffledTracks = shuffleInPlace(originalTracks.slice());
      tracks = shuffleOn ? shuffledTracks : originalTracks;
      renderShuffleState();
      renderRepeatState();
      renderTrack();
      maybeInit();

      // youtube.com/iframe_api is a common ad/privacy-blocker target
      // (confirmed in the wild: Brave's Shields blocks it by default for
      // some users, even in Private windows, since Shields is a core
      // browser feature there, not an extension). If it hasn't called back
      // by now, playback is blocked — say so instead of leaving a
      // permanently-disabled play button with no explanation. The full
      // explanation goes in .blocked-help, not .track-channel, because
      // track-channel truncates with ellipsis and this needs to stay readable.
      apiTimeoutId = setTimeout(function () {
        if (apiReady) return;
        els.title.textContent = 'Playback blocked';
        els.channel.textContent = 'See note below';
        els.blockedHelp.textContent = 'Likely an ad/privacy blocker (e.g. Brave Shields) or your network blocking YouTube. Try turning it off for this site, or use a different browser, then reload.';
        els.blockedHelp.hidden = false;
      }, 6000);
    })
    .catch(function (err) {
      console.error('[player]', err);
      els.title.textContent = 'Playlist unavailable';
      els.channel.textContent = '—';
    });

  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', function () {
      if (!player) return;
      if (!started) { started = true; loadCurrent(); return; }
      player.playVideo();
    });
    navigator.mediaSession.setActionHandler('pause', function () {
      if (player) player.pauseVideo();
    });
    navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); });
    navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); });
  }

  els.play.addEventListener('click', togglePlay);
  els.prev.addEventListener('click', function () { step(-1); });
  els.next.addEventListener('click', function () { step(1); });
  els.shuffle.addEventListener('click', toggleShuffle);
  els.repeat.addEventListener('click', cycleRepeat);

  // Pointer Events unify mouse + touch: pointerdown starts the drag and
  // shows an immediate preview (this also covers a plain click/tap, which
  // is just a pointerdown+pointerup at the same spot), pointermove updates
  // the preview only, pointerup commits the real seek.
  els.progressTrack.addEventListener('pointerdown', function (e) {
    if (!player || typeof player.getDuration !== 'function' || !player.getDuration()) return;
    dragging = true;
    els.progressTrack.setPointerCapture(e.pointerId);
    previewScrub(ratioFromClientX(e.clientX), player.getDuration());
  });
  els.progressTrack.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    previewScrub(ratioFromClientX(e.clientX), player.getDuration());
  });
  function commitScrub(e) {
    if (!dragging) return;
    dragging = false;
    var duration = player.getDuration() || 0;
    player.seekTo(duration * ratioFromClientX(e.clientX), true);
    updateProgress();
  }
  els.progressTrack.addEventListener('pointerup', commitScrub);
  els.progressTrack.addEventListener('pointercancel', function () { dragging = false; });

  els.progressTrack.addEventListener('keydown', function (e) {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    var duration = player.getDuration() || 0;
    var target = null;

    if (e.key === 'ArrowRight') target = player.getCurrentTime() + 5;
    else if (e.key === 'ArrowLeft') target = player.getCurrentTime() - 5;
    else if (e.key === 'Home') target = 0;
    else if (e.key === 'End') target = duration;
    else return;

    e.preventDefault();
    player.seekTo(Math.min(duration, Math.max(0, target)), true);
    updateProgress();
  });

  // Micro-interactions on the controls only. The illustration stays static.
  if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.ctrl').forEach(function (btn) {
      btn.addEventListener('pointerenter', function () {
        gsap.to(btn, { scale: 1.08, duration: 0.18, ease: 'power2.out' });
      });
      btn.addEventListener('pointerleave', function () {
        gsap.to(btn, { scale: 1, duration: 0.22, ease: 'power2.out' });
      });
      btn.addEventListener('pointerdown', function () {
        gsap.to(btn, { scale: 0.92, duration: 0.08 });
      });
      btn.addEventListener('pointerup', function () {
        gsap.to(btn, { scale: 1.08, duration: 0.12 });
      });
    });
  }

  var clock = document.getElementById('clock');
  function tick() {
    var d = new Date();
    var h = d.getHours();
    var period = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    var m = String(d.getMinutes()).padStart(2, '0');
    clock.textContent = h + ':' + m + ' ' + period;
  }
  tick();
  setInterval(tick, 15000);
})();
