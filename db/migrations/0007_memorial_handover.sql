-- If the owner can no longer switch the book to a memorial album, someone else can:
--  1. a trusted person the owner named in advance switches straight away, or
--  2. one family member asks, a second confirms, and it happens 7 days later unless the owner cancels.
-- Whoever completes the switch becomes the circle's owner.
alter table circles add column trusted_user_id uuid references users(id) on delete set null;

create table memorial_requests (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references circles(id) on delete cascade,
  requested_by    uuid not null references users(id) on delete cascade,
  confirmed_by    uuid references users(id) on delete set null,
  confirmed_at    timestamptz,
  takes_effect_at timestamptz,
  closed_at       timestamptz,
  outcome         text check (outcome in ('switched', 'cancelled')),
  closed_by       uuid references users(id) on delete set null,
  created_at      timestamptz not null default now(),
  check (confirmed_by is null or confirmed_by <> requested_by),
  check ((closed_at is null) = (outcome is null))
);
create index memorial_requests_circle_id_idx on memorial_requests(circle_id);
create unique index one_open_memorial_request on memorial_requests(circle_id) where closed_at is null;
