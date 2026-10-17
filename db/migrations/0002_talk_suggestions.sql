-- "Talk it through": an assistant turn can carry a suggested wish ({ text, category }).
alter table conversation_messages add column suggestion jsonb;
