-- Roles become owner (the person the circle is for), caretaker (sets it up, posts, adds people) and
-- viewer (reads, comments, takes quests). Today's owner is the person who set the circle up, so they
-- become a caretaker; family and care team become viewers.
alter table memberships drop constraint memberships_role_check;
update memberships set role = case role when 'owner' then 'caretaker' else 'viewer' end;
alter table memberships add constraint memberships_role_check check (role in ('owner', 'caretaker', 'viewer'));

alter table invites drop constraint invites_role_check;
update invites set role = 'viewer';
alter table invites add constraint invites_role_check check (role in ('caretaker', 'viewer'));

-- One link (and QR code) per circle. It only lets in people a caretaker has added.
alter table circles add column join_token text not null unique default replace(gen_random_uuid()::text, '-', '');

-- People sign in with a one-time code sent to their email or mobile number.
-- A number can belong to one account only; where it was saved on several, the newest account keeps it.
update users u set phone = null
where u.phone is not null and exists (
  select 1 from users v where v.phone = u.phone and (v.created_at, v.id) > (u.created_at, u.id)
);
create unique index users_phone_key on users(phone) where phone is not null;

create table login_codes (
  id         uuid primary key default gen_random_uuid(),
  contact    text not null,           -- lower-case email, or E.164 phone
  code_hash  text not null,
  next_path  text,
  attempts   int not null default 0,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index login_codes_contact_idx on login_codes(contact, created_at desc);
