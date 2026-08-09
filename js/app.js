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
    elapsed: document.getElementById('time-elapsed'),
    total: document.getElementById('time-total'),
    progressTrack: document.getElementById('progress-track'),
    progressFill: document.getElementById('progress-fill'),
    blockedHelp: document.getElementById('blocked-help')
  };

  var tracks = [];
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
  }

  function renderTrack() {
    var t = tracks[index];
    if (!t) return;
    els.title.textContent = t.title || 'Untitled track';
    els.channel.textContent = t.channel || 'Unknown artist';
    els.art.src = 'https://img.youtube.com/vi/' + t.videoId + '/hqdefault.jpg';
    els.blockedHelp.hidden = true;
    resetProgress();
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

  // The mobile handoff labels the right-hand time as remaining ("-2:56");
  // desktop labels it as total duration. Keep the media query in sync with
  // the 767px breakpoint in css/style.css.
  var mqMobile = window.matchMedia('(max-width: 767px)');

  function rightTimeLabel(current, duration) {
    if (!duration) return '0:00';
    return mqMobile.matches ? '-' + formatTime(duration - current) : formatTime(duration);
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

  mqMobile.addEventListener('change', updateProgress);

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
      step(1);
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

      tracks = data.filter(function (t, i) {
        if (!t || !t.videoId) {
          console.warn('[player] playlist entry #' + i + ' has no videoId — skipped', t);
          return false;
        }
        if (!t.title) console.warn('[player] playlist entry #' + i + ' (' + t.videoId + ') has no title');
        if (!t.channel) console.warn('[player] playlist entry #' + i + ' (' + t.videoId + ') has no channel');
        return true;
      });

      if (!tracks.length) throw new Error('playlist empty');
      shuffleInPlace(tracks);
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

  els.play.addEventListener('click', togglePlay);
  els.prev.addEventListener('click', function () { step(-1); });
  els.next.addEventListener('click', function () { step(1); });

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
