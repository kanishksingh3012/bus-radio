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
    progressFill: document.getElementById('progress-fill')
  };

  var tracks = [];
  var index = 0;
  var player = null;
  var apiReady = false;
  // Nothing reaches the player before a real click — autoplay-off is the intended UX.
  var started = false;
  var progressTimer = null;

  function setControlsEnabled(on) {
    els.play.disabled = !on;
    els.prev.disabled = !on;
    els.next.disabled = !on;
  }

  function renderTrack() {
    var t = tracks[index];
    if (!t) return;
    els.title.textContent = t.title;
    els.channel.textContent = t.channel;
    els.art.src = 'https://img.youtube.com/vi/' + t.videoId + '/hqdefault.jpg';
    resetProgress();
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
  }

  function updateProgress() {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    var current = player.getCurrentTime() || 0;
    var duration = player.getDuration() || 0;
    var pct = duration ? (current / duration) * 100 : 0;
    els.elapsed.textContent = formatTime(current);
    els.total.textContent = formatTime(duration);
    els.progressFill.style.width = pct + '%';
    els.progressTrack.setAttribute('aria-valuenow', String(Math.round(pct)));
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

  function seek(clientX) {
    if (!player || typeof player.getDuration !== 'function') return;
    var duration = player.getDuration() || 0;
    if (!duration) return;
    var rect = els.progressTrack.getBoundingClientRect();
    var ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    player.seekTo(duration * ratio, true);
    updateProgress();
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
    renderPlayState(e.data === YT.PlayerState.PLAYING || e.data === YT.PlayerState.BUFFERING);
  }

  function onError() {
    els.channel.textContent = 'Track unavailable — skipping';
    if (tracks.length > 1) setTimeout(function () { step(1); }, 1200);
  }

  function buildPlayer() {
    player = new YT.Player('yt-player', {
      height: '1',
      width: '1',
      playerVars: { playsinline: 1 },
      events: {
        onReady: function () { setControlsEnabled(true); },
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
    maybeInit();
  };

  setControlsEnabled(false);

  fetch('assets/playlist.json')
    .then(function (r) {
      if (!r.ok) throw new Error('playlist ' + r.status);
      return r.json();
    })
    .then(function (data) {
      tracks = data.filter(function (t) { return t && t.videoId; });
      if (!tracks.length) throw new Error('playlist empty');
      renderTrack();
      maybeInit();
    })
    .catch(function (err) {
      console.error('[player]', err);
      els.title.textContent = 'Playlist unavailable';
      els.channel.textContent = '—';
    });

  els.play.addEventListener('click', togglePlay);
  els.prev.addEventListener('click', function () { step(-1); });
  els.next.addEventListener('click', function () { step(1); });

  els.progressTrack.addEventListener('click', function (e) { seek(e.clientX); });
  els.progressTrack.addEventListener('keydown', function (e) {
    if (!player || typeof player.getCurrentTime !== 'function') return;
    var delta = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0;
    if (!delta) return;
    e.preventDefault();
    player.seekTo(Math.max(0, player.getCurrentTime() + delta), true);
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
