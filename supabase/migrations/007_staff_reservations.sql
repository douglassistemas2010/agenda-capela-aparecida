-- Reservas são exclusivas da equipe, inclusive leitura pela API.
begin;
drop policy events_read on public.events;
create policy events_read on public.events for select to authenticated
 using(public.has_role(array['admin','agente_pastoral']));
commit;
