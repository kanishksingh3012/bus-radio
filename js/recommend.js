/* Song suggestions go to a Google Sheet via a small Apps Script Web App —
   no database, no Supabase. This is intentionally not real-time or
   validated server-side: it's a lightweight inbox for manual review, not
   a live playlist-editing feature. Never auto-published anywhere. */

(function () {
  'use strict';

  // TODO: fill in once the Apps Script Web App is deployed — see CLAUDE.md
  // for setup steps. Ends in /exec. Submissions are disabled with a clear
  // message until this is a real URL.
  var SHEET_ENDPOINT = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
  var isConfigured = SHEET_ENDPOINT.indexOf('YOUR_DEPLOYMENT_ID') === -1;

  var toggle = document.getElementById('suggest-toggle');
  var panel = document.getElementById('suggest-panel');
  var form = document.getElementById('recommend-form');
  var song = document.getElementById('rec-song');
  var artist = document.getElementById('rec-artist');
  var honeypot = document.getElementById('rec-website');
  var submit = document.getElementById('rec-submit');
  var status = document.getElementById('rec-status');

  function say(message, tone) {
    status.textContent = message;
    status.dataset.tone = tone || '';
  }

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    song.focus();
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    if (panel.hidden) openPanel(); else closePanel();
  });

  document.addEventListener('click', function (e) {
    if (panel.hidden) return;
    if (panel.contains(e.target) || toggle.contains(e.target)) return;
    closePanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !panel.hidden) {
      closePanel();
      toggle.focus();
    }
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    // Bot filled the off-screen field: report success, save nothing.
    if (honeypot.value.trim()) {
      form.reset();
      say('Thanks — queued for review.', 'ok');
      return;
    }

    var title = song.value.trim();
    if (!title) {
      say('Add a song name first.', 'error');
      song.focus();
      return;
    }

    if (!isConfigured) {
      say('Suggestions are not open yet.', 'error');
      console.info('[recommend] Sheet endpoint not configured yet — submission skipped.');
      return;
    }

    submit.disabled = true;
    say('Sending…');

    // mode: 'no-cors' + text/plain — Apps Script doesn't send CORS headers
    // and doesn't handle the OPTIONS preflight a JSON content-type would
    // trigger, so this avoids that entirely. Trade-off: the response is
    // opaque, so a successful fetch() only means the request was sent, not
    // that it was necessarily processed — acceptable for a low-stakes inbox.
    fetch(SHEET_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ song: title, artist: artist.value.trim() || null })
    })
      .then(function () {
        form.reset();
        say('Thanks — queued for review.', 'ok');
      })
      .catch(function (err) {
        console.error('[recommend]', err);
        say('Could not send that. Try again later.', 'error');
      })
      .finally(function () {
        submit.disabled = false;
      });
  });
})();
