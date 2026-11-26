begin;
alter table public.profiles drop constraint profiles_role_check;
-- A consolidação amplia atribuições: os antigos funcionários aguardam nova definição pelo ADM.
update public.profiles set role='dizimista',approved=false where role<>'admin';
alter table public.profiles alter column role set default 'dizimista';
alter table public.profiles add constraint profiles_role_check check(role in ('admin','agente_pastoral','dizimista'));
-- Compatibilidade com políticas/RPCs 001–005. Somente a equipe recebe permissões legadas.
create or replace function public.has_role(roles text[]) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and approved and
 (role=any(roles) or (role='agente_pastoral' and roles && array['pastoral_dizimo','conselho_administrativo'])))
$$;
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path=public as $$
 select public.has_role(array['admin','agente_pastoral','dizimista'])
$$;
alter table public.notification_campaigns drop constraint notification_campaigns_audience_check;
update public.notification_campaigns set audience='agente_pastoral'
 where audience in ('pastoral_dizimo','conselho_administrativo','conselho_economico');
alter table public.notification_campaigns add constraint notification_campaigns_audience_check
 check(audience in ('todos','pessoa','admin','agente_pastoral','dizimista'));
commit;
