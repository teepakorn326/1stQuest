-- Feed rows about a wish (or its quests/plans) point at it, so the feed can apply wish visibility.
alter table activity add column wish_id uuid references wishes(id) on delete cascade;
create index activity_wish_id_idx on activity(wish_id);

-- "Check with the care team first <note>"
alter table plans add column care_team_note text;

-- Live updates: every activity insert sends a data-free ping on the circle's Realtime topic.
-- Clients refetch through the authenticated API, so nothing private crosses the public channel.
-- realtime.send writes to realtime.messages inside this transaction, so the ping goes out on commit.
-- Only installed where Supabase Realtime exists (not in local PGlite).
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'realtime' and p.proname = 'send'
  ) then
    execute $f$
      create or replace function public.broadcast_activity() returns trigger
      language plpgsql security definer set search_path = '' as $body$
      begin
        perform realtime.send('{}'::jsonb, 'activity', 'circle:' || new.circle_id::text, false);
        return null;
      end
      $body$
    $f$;
    execute 'create trigger activity_broadcast after insert on public.activity
             for each row execute function public.broadcast_activity()';
  end if;
end $$;
