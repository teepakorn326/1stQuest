-- "In loving memory" home: the headstone's years and words, and candles / flowers people leave.
alter table circles add column birth_year int check (birth_year between 1850 and 2200);
alter table circles add column death_year int check (death_year between 1850 and 2200);
alter table circles add column epitaph text check (length(epitaph) <= 120);

create table memorial_tributes (
  id         uuid primary key default gen_random_uuid(),
  circle_id  uuid not null references circles(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null check (kind in ('candle', 'flower')),
  message    text check (length(message) between 1 and 300),
  created_at timestamptz not null default now()
);
create index memorial_tributes_circle_idx on memorial_tributes(circle_id, created_at desc);
