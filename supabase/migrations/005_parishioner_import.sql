-- Lotes atômicos: somente cadastros, sem contas ou contribuições automáticas.
begin;
create table public.parishioner_imports (
 id uuid primary key default gen_random_uuid(),
 source_name text not null check(length(source_name) between 1 and 200),
 created_by uuid not null references public.profiles(id) default auth.uid(),
 created_at timestamptz not null default now(),
 inserted_count integer not null default 0,
 skipped_count integer not null default 0
);
alter table public.parishioner_imports enable row level security;
create policy imports_read on public.parishioner_imports for select to authenticated
 using(public.has_role(array['admin','conselho_economico','pastoral_dizimo']));
revoke all on public.parishioner_imports from anon,authenticated;
grant select on public.parishioner_imports to authenticated;
alter table public.parishioners add column external_code text,
 add column import_batch_id uuid references public.parishioner_imports(id),
 add column source_row integer,
 add column address text,
 add column city text,
 add column secondary_phone text,
 add column legacy_last_contribution date;
create unique index parishioners_external_code on public.parishioners(external_code) where external_code is not null;
create function public.import_parishioners(source_name text, records jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare batch uuid; r jsonb; n text; code text; mail text; tel text; birth date;
 added integer:=0; skipped integer:=0; line integer:=0;
begin
 if not public.has_role(array['admin','conselho_economico','pastoral_dizimo']) then raise exception 'Acesso negado'; end if;
 if records is null or jsonb_typeof(records)<>'array' then raise exception 'Lista inválida'; end if;
 if jsonb_array_length(records) not between 1 and 1000 then raise exception 'Envie entre 1 e 1000 cadastros'; end if;
 -- Serializa importações concorrentes para conferir duplicidade no banco.
 lock table public.parishioners in share row exclusive mode;
 insert into parishioner_imports(source_name) values(source_name) returning id into batch;
 for r in select value from jsonb_array_elements(records) loop
  line:=line+1;
  n:=btrim(coalesce(r->>'name','')); code:=nullif(btrim(r->>'external_code'),'');
  mail:=nullif(lower(btrim(r->>'email')),''); tel:=nullif(regexp_replace(r->>'phone','[^0-9]','','g'),'');
  birth:=nullif(r->>'birthday','')::date;
  if length(n) not between 2 and 150 or length(coalesce(code,''))>80
   or length(coalesce(mail,''))>254 or (mail is not null and mail !~ '^[^ @]+@[^ @]+\.[^ @]+$')
   or (tel is not null and length(tel) not between 10 and 15)
   or birth>current_date or length(coalesce(r->>'notes',''))>2000
   or length(coalesce(r->>'address',''))>500 or length(coalesce(r->>'city',''))>150
   or length(coalesce(r->>'secondary_phone',''))>80
  then raise exception 'Dados inválidos na linha %',line; end if;
  if exists(select 1 from parishioners p where
   (code is not null and p.external_code=code) or
   (mail is not null and lower(btrim(p.email))=mail) or
   (lower(btrim(p.name))=lower(n) and ((tel is not null and regexp_replace(p.phone,'[^0-9]','','g')=tel) or (birth is not null and p.birthday=birth) or (tel is null and birth is null))))
  then skipped:=skipped+1; continue; end if;
  insert into parishioners(name,email,phone,birthday,notes,external_code,import_batch_id,source_row,address,city,secondary_phone,legacy_last_contribution)
   values(n,mail,tel,birth,nullif(r->>'notes',''),code,batch,line,nullif(r->>'address',''),nullif(r->>'city',''),nullif(r->>'secondary_phone',''),nullif(r->>'legacy_last_contribution','')::date);
  added:=added+1;
 end loop;
 update parishioner_imports set inserted_count=added,skipped_count=skipped where id=batch;
 return jsonb_build_object('batch_id',batch,'inserted',added,'skipped',skipped);
end $$;
revoke all on function public.import_parishioners(text,jsonb) from public,anon;
grant execute on function public.import_parishioners(text,jsonb) to authenticated;
commit;
