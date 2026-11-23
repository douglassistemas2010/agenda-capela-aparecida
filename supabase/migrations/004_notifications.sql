-- Depois de 001, 002 e 003. Apenas no projeto dedicado da capela.
begin;
alter table public.push_subscriptions add constraint push_endpoint_matches check(subscription ? 'endpoint' and endpoint=subscription->>'endpoint');
create function public.notification_allowed(p_category text) returns boolean
language sql stable security definer set search_path=public as $$
 select case
 when p_category in ('aniversario','lembrete_dizimo','lembrete_oferta') then public.has_role(array['admin','pastoral_dizimo'])
 when p_category in ('recebimento_dizimo','recebimento_oferta') then public.has_role(array['admin','conselho_economico'])
 when p_category in ('promocao','comunicado','celebracao') then public.has_role(array['admin','conselho_administrativo'])
 else false end
$$;
create table public.notification_controls(category text primary key check(category in ('aniversario','recebimento_dizimo','recebimento_oferta','lembrete_dizimo','lembrete_oferta','promocao','comunicado','celebracao')),enabled boolean not null default true);
insert into public.notification_controls(category) values('aniversario'),('recebimento_dizimo'),('recebimento_oferta'),('lembrete_dizimo'),('lembrete_oferta'),('promocao'),('comunicado'),('celebracao');
alter table public.notification_controls enable row level security;
create policy notification_controls_read on public.notification_controls for select to authenticated using(public.is_member());
create policy notification_controls_update on public.notification_controls for update to authenticated using(public.has_role(array['admin'])) with check(public.has_role(array['admin']));
create table public.notification_preferences(user_id uuid not null references public.profiles(id) on delete cascade,category text not null references public.notification_controls(category),enabled boolean not null default true,primary key(user_id,category));
alter table public.notification_preferences enable row level security;
create policy notification_preferences_own on public.notification_preferences for all to authenticated using(user_id=auth.uid() and public.is_member()) with check(user_id=auth.uid() and public.is_member());

alter table public.parishioners add column linked_user_id uuid references public.profiles(id);
create function public.protect_parishioner_link() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.has_role(array['admin']) and
 ((tg_op='INSERT' and new.linked_user_id is not null) or (tg_op='UPDATE' and new.linked_user_id is distinct from old.linked_user_id))
 then raise exception 'Somente o Administrador pode vincular um dizimista a uma conta';end if;
 return new;
end $$;
create trigger protect_parishioner_link before insert or update on public.parishioners for each row execute function public.protect_parishioner_link();
create function public.link_parishioner_account(p_person_id uuid,p_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_role(array['admin']) then raise exception 'Acesso negado';end if;
 if p_user_id is not null and not exists(select 1 from profiles where id=p_user_id and approved) then raise exception 'A conta precisa estar aprovada';end if;
 update parishioners set linked_user_id=p_user_id where id=p_person_id;
 if not found then raise exception 'Dizimista não encontrado';end if;
end $$;
create function public.notification_recipients() returns table(id uuid,name text,role text,email text) language sql stable security definer set search_path=public as $$ select p.id,p.name,p.role,case when public.has_role(array['admin']) then p.email else null end from public.profiles p where p.approved and public.is_member() order by p.name $$;

create table public.notification_campaigns(
 id uuid primary key default gen_random_uuid(),request_id uuid unique not null,
 category text not null references public.notification_controls(category),title text not null check(length(title) between 1 and 80),body text not null check(length(body) between 1 and 240),
 audience text not null check(audience in ('todos','pessoa','admin','conselho_administrativo','conselho_economico','pastoral_dizimo')),recipient_id uuid references public.profiles(id),contribution_id uuid references public.contributions(id),
 scheduled_at timestamptz not null default now(),created_at timestamptz not null default now(),created_by uuid not null references public.profiles(id),creator_name text not null,
 status text not null default 'queued' check(status in ('queued','processing','completed','partial','failed','cancelled')),
 accepted_count int not null default 0,failed_count int not null default 0,skipped_count int not null default 0,unknown_count int not null default 0,error_message text,
 processing_started_at timestamptz,finished_at timestamptz
);
create index notification_campaigns_due on public.notification_campaigns(scheduled_at) where status='queued';
alter table public.notification_campaigns enable row level security;
create policy notification_campaigns_read on public.notification_campaigns for select to authenticated using(public.notification_allowed(category));
create table public.notification_deliveries(
 id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.notification_campaigns(id),subscription_id uuid references public.push_subscriptions(id) on delete set null,user_id uuid not null references public.profiles(id),
 status text not null default 'pending' check(status in ('pending','sending','accepted','failed','skipped','unknown')),http_status int,processed_at timestamptz,unique(campaign_id,subscription_id)
);
alter table public.notification_deliveries enable row level security;
create policy notification_deliveries_read on public.notification_deliveries for select to authenticated using(exists(select 1 from public.notification_campaigns c where c.id=campaign_id and public.notification_allowed(c.category)));

create function public.queue_notification(p_category text,p_title text,p_body text,p_audience text,p_recipient uuid,p_contribution uuid,p_scheduled_at timestamptz,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid; target uuid; item contributions%rowtype; person_name text;
begin
 if not public.notification_allowed(p_category) then raise exception 'Seu perfil não pode enviar este assunto';end if;
 select id into result from notification_campaigns where request_id=p_request_id and created_by=auth.uid();
 if result is not null then return result;end if;
 if not exists(select 1 from notification_controls where category=p_category and enabled) then raise exception 'Assunto pausado pelo Administrador';end if;
 if p_scheduled_at is not null and (p_scheduled_at<=now() or p_scheduled_at>now()+interval '366 days') then raise exception 'Agende para um horário futuro, em até um ano';end if;
 if p_category in ('recebimento_dizimo','recebimento_oferta') then
   select * into item from contributions where id=p_contribution and status='Confirmado';
   if not found then raise exception 'Selecione um pagamento confirmado';end if;
   if (p_category='recebimento_dizimo' and item.kind<>'Dízimo') or (p_category='recebimento_oferta' and item.kind<>'Oferta') then raise exception 'O assunto não corresponde ao pagamento';end if;
   if item.parishioner_id is null then target:=item.user_id;else select linked_user_id into target from parishioners where id=item.parishioner_id;end if;
   if target is null then raise exception 'Vincule o dizimista à conta correta em Notificações > Controle geral';end if;
   p_title:=case when p_category='recebimento_dizimo' then 'Sua contribuição foi conferida' else 'Sua oferta foi conferida' end;
   p_body:=case when p_category='recebimento_dizimo' then 'Agradecemos seu dízimo. Acesse o app para consultar a confirmação e os detalhes.' else 'Agradecemos sua oferta. Acesse o app para consultar a confirmação e os detalhes.' end;
   p_audience:='pessoa';
 else
   p_contribution:=null;
   if p_category='aniversario' then p_audience:='pessoa';end if;
   if p_audience='pessoa' then target:=p_recipient;else target:=null;end if;
 end if;
 if p_audience='pessoa' and not exists(select 1 from profiles where id=target and approved) then raise exception 'Escolha uma conta aprovada como destinatário';end if;
 select name into person_name from profiles where id=auth.uid();
 insert into notification_campaigns(request_id,category,title,body,audience,recipient_id,contribution_id,scheduled_at,created_by,creator_name)
 values(p_request_id,p_category,trim(p_title),trim(p_body),p_audience,target,p_contribution,coalesce(p_scheduled_at,now()),auth.uid(),person_name) returning id into result;
 return result;
end $$;
create function public.cancel_notification(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update notification_campaigns set status='cancelled',finished_at=now() where id=p_id and status='queued' and public.notification_allowed(category);
 if not found then raise exception 'O aviso não está na fila ou você não tem acesso. Envios já iniciados não podem ser desfeitos';end if;
end $$;

-- As funções de processamento só podem ser executadas pela Edge Function com service_role.
create function public.claim_notification(p_id uuid) returns setof public.notification_campaigns language plpgsql security definer set search_path=public as $$
declare item notification_campaigns%rowtype;
begin
 select * into item from notification_campaigns where id=p_id for update skip locked;
 if not found or item.scheduled_at>now() then return;end if;
 if item.status='processing' and item.processing_started_at<now()-interval '10 minutes' then
  update notification_deliveries set status='unknown',processed_at=now() where campaign_id=p_id and status='sending';
 elsif item.status<>'queued' then return;end if;
 if not exists(select 1 from notification_controls where category=item.category and enabled) then
  update notification_campaigns set status='cancelled',error_message='Assunto pausado pelo Administrador',finished_at=now() where id=p_id;return;
 end if;
 return query update notification_campaigns set status='processing',processing_started_at=now() where id=p_id returning *;
end $$;
create function public.claim_notification_delivery(p_id uuid) returns text language plpgsql security definer set search_path=public as $$
declare item notification_deliveries%rowtype; campaign notification_campaigns%rowtype; deliver boolean;
begin
 select * into item from notification_deliveries where id=p_id and status='pending' for update skip locked;
 if not found then return 'skipped';end if;
 select * into campaign from notification_campaigns where id=item.campaign_id;
 deliver:=exists(select 1 from profiles where id=item.user_id and approved)
 and exists(select 1 from notification_controls where category=campaign.category and enabled)
 and not exists(select 1 from notification_preferences where user_id=item.user_id and category=campaign.category and not enabled)
 and exists(select 1 from push_subscriptions where id=item.subscription_id and user_id=item.user_id)
 and campaign.status='processing';
 update notification_deliveries set status=case when deliver then 'sending' else 'skipped' end,processed_at=now() where id=p_id;
 return case when deliver then 'sending' else 'skipped' end;
end $$;
revoke all on function public.queue_notification(text,text,text,text,uuid,uuid,timestamptz,uuid),public.cancel_notification(uuid),public.notification_recipients(),public.link_parishioner_account(uuid,uuid) from public;
grant execute on function public.queue_notification(text,text,text,text,uuid,uuid,timestamptz,uuid),public.cancel_notification(uuid),public.notification_recipients(),public.link_parishioner_account(uuid,uuid) to authenticated;
revoke all on function public.claim_notification(uuid),public.claim_notification_delivery(uuid) from public,authenticated,anon;
grant execute on function public.claim_notification(uuid),public.claim_notification_delivery(uuid) to service_role;
grant select,update on public.notification_controls to authenticated;
grant select,insert,update on public.notification_preferences to authenticated;
grant select on public.notification_campaigns,public.notification_deliveries to authenticated;
grant select on public.profiles,public.parishioners,public.contributions,public.notification_controls,public.notification_preferences to service_role;
grant select,insert,update on public.notification_campaigns,public.notification_deliveries to service_role;
grant select,delete on public.push_subscriptions to service_role;
revoke all on public.notification_controls,public.notification_preferences,public.notification_campaigns,public.notification_deliveries from anon;
commit;
