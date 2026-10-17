-- Public, revocable share link for a single card (no sign-in). Null = not shared.
alter table cards add column share_token text unique;
alter table cards add column shared_at timestamptz;
