-- Comments from a card's public share link: no account, just a name. They show on the shared page
-- and in the circle (marked "via shared link"), count toward the card turning gold, and caretakers
-- can remove them. guest_key is a keyed hash of the commenter's IP, used only for rate limiting.
alter table card_messages alter column author_id drop not null;
alter table card_messages add column guest_name text check (guest_name is null or length(guest_name) between 1 and 60);
alter table card_messages add column guest_key text;
alter table card_messages add constraint card_messages_author_or_guest check (author_id is not null or guest_name is not null);
create index card_messages_guest_key_idx on card_messages(guest_key, created_at) where guest_key is not null;
