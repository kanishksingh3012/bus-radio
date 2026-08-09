import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* TODO: fill these in once the Supabase project exists.
   The anon key is meant to be public — RLS is what protects the data.
   Don't try to hide it or route it through a server.

   Only Realtime Presence (the live count) uses this — no tables required.
   The song-recommendation table + RLS policy is in git history if that
   feature comes back. */
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

export const isConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
