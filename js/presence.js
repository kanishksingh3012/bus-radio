import { supabase, isConfigured } from './supabase.js';

/* Live count via Supabase Realtime Presence. This is ephemeral: it counts
   who is connected right now and returns to 0 when the last tab closes.
   It is NOT an all-time listener total and must not be presented as one. */

const value = document.getElementById('live-count-value');
const dot = document.getElementById('live-dot');

function render(count) {
  value.textContent = count;
  dot.dataset.state = count > 0 ? 'live' : 'offline';
}

if (!isConfigured) {
  value.textContent = '–';
  console.info('[presence] Supabase not configured yet — live count disabled.');
} else {
  const channel = supabase.channel('bus-radio-presence', {
    config: { presence: { key: crypto.randomUUID() } }
  });

  channel
    .on('presence', { event: 'sync' }, () => {
      render(Object.keys(channel.presenceState()).length);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({ joined_at: new Date().toISOString() });
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        value.textContent = '–';
        dot.dataset.state = 'offline';
      }
    });
}
