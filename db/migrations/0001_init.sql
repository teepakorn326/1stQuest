-- Wish Circle initial schema. Forward-only; add new numbered files to change it.

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- ---------------------------------------------------------------- identity
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique check (email = lower(email)),
  name          text,
  password_hash text,
  created_at    timestamptz not null default now()
);

create table sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_id_idx on sessions(user_id);

create table magic_links (
  token_hash text primary key,
  email      text not null,
  next_path  text,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index magic_links_email_idx on magic_links(email);

-- ---------------------------------------------------------------- circles
create table circles (
  id                 uuid primary key default gen_random_uuid(),
  patient_name       text not null check (length(patient_name) between 1 and 80),
  patient_photo_path text,
  mobility           text not null default 'short_walks_with_help'
                     check (mobility in ('walks_alone','short_walks_with_help','wheelchair','mostly_resting')),
  mobility_notes     text,
  set_up_by_patient  boolean not null default false,
  hemisphere         text not null default 'south' check (hemisphere in ('north','south')),
  mode               text not null default 'active' check (mode in ('active','memorial')),
  mode_changed_at    timestamptz,
  created_at         timestamptz not null default now()
);

create table memberships (
  circle_id uuid not null references circles(id) on delete cascade,
  user_id   uuid not null references users(id) on delete cascade,
  role      text not null check (role in ('owner','family','doctor')),
  joined_at timestamptz not null default now(),
  primary key (circle_id, user_id)
);
create index memberships_user_id_idx on memberships(user_id);
create unique index one_owner_per_circle on memberships(circle_id) where role = 'owner';

create table invites (
  id              uuid primary key default gen_random_uuid(),
  circle_id       uuid not null references circles(id) on delete cascade,
  role            text not null check (role in ('family','doctor')),
  token           text not null unique,
  created_by      uuid not null references users(id) on delete cascade,
  expires_at      timestamptz not null,
  used_by_user_id uuid references users(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index invites_circle_id_idx on invites(circle_id);

-- ---------------------------------------------------------------- wishes, plans, quests
create table wishes (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  author_id  uuid not null references users(id) on delete cascade,
  text       text not null check (length(text) between 1 and 500),
  category   text not null check (category in ('places','tastes','people','music','nature','legacy')),
  visibility text not null default 'circle' check (visibility in ('circle','chosen','private')),
  created_at timestamptz not null default now()
);
create index wishes_circle_id_idx on wishes(circle_id, created_at desc);

create table wish_viewers (
  wish_id uuid not null references wishes(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  primary key (wish_id, user_id)
);
create index wish_viewers_user_id_idx on wish_viewers(user_id);

create table plans (
  id                uuid primary key default gen_random_uuid(),
  wish_id           uuid not null references wishes(id) on delete cascade,
  text              text not null,
  based_on_mobility text not null,
  needs_care_team   boolean not null default false,
  generated_at      timestamptz not null default now()
);
create index plans_wish_id_idx on plans(wish_id, generated_at desc);

create table quests (
  id                 uuid primary key default gen_random_uuid(),
  wish_id            uuid not null references wishes(id) on delete cascade,
  plan_id            uuid references plans(id) on delete set null,
  title              text not null,
  status             text not null default 'open' check (status in ('open','in_progress','done','locked')),
  needs_care_team    boolean not null default false,
  claimed_by_user_id uuid references users(id) on delete set null,
  position           int not null default 0,
  updated_at         timestamptz not null default now()
);
create index quests_wish_id_idx on quests(wish_id);
create index quests_plan_id_idx on quests(plan_id);

-- ---------------------------------------------------------------- cards, media
create table cards (
  id             uuid primary key default gen_random_uuid(),
  wish_id        uuid references wishes(id) on delete set null,  -- null for memorial "share a memory"
  circle_id      uuid not null references circles(id) on delete cascade,
  author_id      uuid references users(id) on delete set null,
  category       text not null check (category in ('places','tastes','people','music','nature','legacy')),
  title          text not null,
  body           text not null,
  story          text,
  place          text,
  happened_on    date not null default current_date,
  cover_media_id uuid,
  level          int not null default 0,
  created_at     timestamptz not null default now()
);
create index cards_circle_id_idx on cards(circle_id, happened_on desc);
create index cards_wish_id_idx on cards(wish_id);

create table media (
  id           uuid primary key default gen_random_uuid(),
  circle_id    uuid not null references circles(id) on delete cascade,
  card_id      uuid references cards(id) on delete cascade,
  uploader_id  uuid references users(id) on delete set null,
  kind         text not null check (kind in ('photo','voice','video')),
  path         text not null,
  mime_type    text not null,
  bytes        int not null check (bytes >= 0),
  duration_sec int,
  created_at   timestamptz not null default now()
);
create index media_circle_id_idx on media(circle_id);
create index media_card_id_idx on media(card_id);

alter table cards
  add constraint cards_cover_media_fk foreign key (cover_media_id) references media(id) on delete set null;
create index cards_cover_media_id_idx on cards(cover_media_id);

create table card_messages (
  id         uuid primary key default gen_random_uuid(),
  card_id    uuid not null references cards(id) on delete cascade,
  author_id  uuid not null references users(id) on delete cascade,
  text       text not null check (length(text) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index card_messages_card_id_idx on card_messages(card_id, created_at);

create table card_likes (
  card_id    uuid not null references cards(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, user_id)
);

-- ---------------------------------------------------------------- activity feed (append-only)
create table activity (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  actor_id   uuid references users(id) on delete set null,
  type       text not null,
  ref_id     uuid,
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_circle_created_idx on activity(circle_id, created_at desc);

-- ---------------------------------------------------------------- "Talk it through"
create table conversations (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

create table conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index conversation_messages_conversation_id_idx on conversation_messages(conversation_id, created_at);

-- ---------------------------------------------------------------- Supabase hardening + Realtime
-- The app talks to Postgres as the `postgres` role (bypasses RLS). Enabling RLS with no policies
-- means the public anon key cannot read any table through PostgREST.
do $$
declare t text;
begin
  foreach t in array array['users','sessions','magic_links','circles','memberships','invites','wishes',
    'wish_viewers','plans','quests','cards','media','card_messages','card_likes','activity',
    'conversations','conversation_messages']
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table activity;
  end if;
end $$;
