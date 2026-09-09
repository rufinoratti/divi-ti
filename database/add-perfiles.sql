-- Divi · Migración para agregar perfiles vinculados a Supabase Auth
-- Ejecutar una vez en Supabase SQL Editor sobre un proyecto que ya tiene
-- ejecutado database/schema.sql.

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  email text unique,
  avatar_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

comment on table public.perfiles is 'Datos de perfil visibles para la aplicación.';

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre, email)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Usuario'
      ),
      80
    ),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        actualizado_en = now();

  return new;
end;
$$;

revoke all on function private.sync_auth_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.sync_auth_user();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function private.sync_auth_user();

-- Backfill para usuarios que ya existían antes de crear el trigger.
insert into public.perfiles (id, nombre, email)
select
  u.id,
  left(
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
      'Usuario'
    ),
    80
  ),
  u.email
from auth.users u
on conflict (id) do nothing;

alter table public.perfiles enable row level security;

revoke all on table public.perfiles from anon;
grant usage on schema public to authenticated;
grant select, update on table public.perfiles to authenticated;

drop policy if exists "Cada usuario puede ver su perfil" on public.perfiles;
create policy "Cada usuario puede ver su perfil"
  on public.perfiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Cada usuario puede editar su perfil" on public.perfiles;
create policy "Cada usuario puede editar su perfil"
  on public.perfiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
