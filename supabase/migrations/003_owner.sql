-- Depois das migrações 001 e 002, no projeto dedicado da capela.
-- A identidade do proprietário é definida pelo e-mail confirmado pelo Auth,
-- nunca por metadados de cadastro ou pelo apelido digitado na interface.
begin;
create function public.bootstrap_owner() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if lower(new.email) = 'douglas_sistemas2010@hotmail.com'
     and new.email_confirmed_at is not null then
    insert into public.profiles(id,name,email,role,approved)
    values(new.id,'Douglas Araujo Gomes',new.email,'admin',true)
    on conflict(id) do update set
      name='Douglas Araujo Gomes',email=excluded.email,role='admin',approved=true;
  end if;
  return new;
end $$;
revoke all on function public.bootstrap_owner() from public;
-- O nome zz_ garante execução depois do gatilho new_user já existente.
create trigger zz_capela_owner_insert after insert on auth.users
for each row execute function public.bootstrap_owner();
create trigger zz_capela_owner_confirm after update of email_confirmed_at on auth.users
for each row when (old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function public.bootstrap_owner();
-- Contempla também o proprietário, se já tiver confirmado seu cadastro.
insert into public.profiles(id,name,email,role,approved)
select id,'Douglas Araujo Gomes',email,'admin',true from auth.users
where lower(email)='douglas_sistemas2010@hotmail.com' and email_confirmed_at is not null
on conflict(id) do update set
name='Douglas Araujo Gomes',email=excluded.email,role='admin',approved=true;
commit;
