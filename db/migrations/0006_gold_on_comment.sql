-- Cards are gold exactly when they have at least one comment (was: 3+ distinct contributors).
update cards c set level = case when exists (select 1 from card_messages cm where cm.card_id = c.id) then 1 else 0 end;
