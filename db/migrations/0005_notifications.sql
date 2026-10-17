-- Notifications to circle members when the owner posts, in the app and (opt-in) by text message.
alter table users add column phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
alter table users add column sms_opt_in boolean not null default false;

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  circle_id   uuid not null references circles(id) on delete cascade,
  actor_id    uuid references users(id) on delete set null,
  kind        text not null,
  title       text not null,
  url         text not null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_created_idx on notifications(user_id, created_at desc);
create index notifications_circle_id_idx on notifications(circle_id);
alter table notifications enable row level security;

-- Live: a data-free ping on the recipient's own topic; the app refetches through the signed-in API.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'realtime' and p.proname = 'send'
  ) then
    execute $f$
      create or replace function public.broadcast_notification() returns trigger
      language plpgsql security definer set search_path = '' as $body$
      begin
        perform realtime.send('{}'::jsonb, 'notification', 'user:' || new.user_id::text, false);
        return null;
      end
      $body$
    $f$;
    execute 'create trigger notification_broadcast after insert on public.notifications
             for each row execute function public.broadcast_notification()';
  end if;
end $$;
