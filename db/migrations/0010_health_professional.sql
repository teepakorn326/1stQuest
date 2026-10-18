-- A fourth role: health professional. Same as a viewer (reads, comments, takes quests), labelled so
-- the family knows who's from the care side. People pick it themselves when they register from the
-- circle's link.
alter table memberships drop constraint memberships_role_check;
alter table memberships add constraint memberships_role_check check (role in ('owner', 'caretaker', 'viewer', 'health'));
