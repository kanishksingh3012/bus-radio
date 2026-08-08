import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/* TODO: fill these in once the Supabase project exists.
   The anon key is meant to be public — RLS is what protects the data.
   Don't try to hide it or route it through a server.

   Run once in the SQL editor:

     create table recommendations (
       id             uuid primary key default gen_random_uuid(),
       song_title     text not null,
       artist_or_link text,
       submitted_at   timestamptz not null default now(),
       status         text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected'))
     );

     alter table recommendations enable row level security;

     -- Anonymous visitors may only insert, and only as 'pending'.
     -- Nothing is readable from the client; approval happens by hand in the
     -- Supabase table editor.
     create policy "anon insert pending only"
       on recommendations for insert to anon
       with check (status = 'pending');
*/
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

export const isConfigured =
  !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR-ANON-KEY');

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
