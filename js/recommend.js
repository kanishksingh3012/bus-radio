import { supabase, isConfigured } from './supabase.js';

/* Submissions always land as 'pending' and are never shown publicly.
   Approval happens by hand in the Supabase table editor — there is no admin UI. */

const form = document.getElementById('recommend-form');
const song = document.getElementById('rec-song');
const artist = document.getElementById('rec-artist');
const honeypot = document.getElementById('rec-website');
const submit = document.getElementById('rec-submit');
const status = document.getElementById('rec-status');

function say(message, tone) {
  status.textContent = message;
  status.dataset.tone = tone || '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // Bot filled the off-screen field: report success, save nothing.
  if (honeypot.value.trim()) {
    form.reset();
    say('Thanks — queued for review.', 'ok');
    return;
  }

  const title = song.value.trim();
  if (!title) {
    say('Add a song name first.', 'error');
    song.focus();
    return;
  }

  if (!isConfigured) {
    say('Suggestions are not open yet.', 'error');
    console.info('[recommend] Supabase not configured yet — submission skipped.');
    return;
  }

  submit.disabled = true;
  say('Sending…');

  const { error } = await supabase.from('recommendations').insert({
    song_title: title,
    artist_or_link: artist.value.trim() || null,
    status: 'pending'
  });

  submit.disabled = false;

  if (error) {
    console.error('[recommend]', error);
    say('Could not send that. Try again later.', 'error');
    return;
  }

  form.reset();
  say('Thanks — queued for review.', 'ok');
});
