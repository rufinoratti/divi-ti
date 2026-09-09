-- Divi · Esquema inicial para Supabase
-- Alcance: grupos, integrantes, gastos y préstamos en ARS.
-- La liquidación se calcula a partir de los movimientos; no se persiste
-- porque todavía no existe un flujo de confirmación de pagos.

create extension if not exists pgcrypto;

-- ============================================================
-- 0. Perfiles de aplicación
-- ============================================================
--
-- auth.users es administrada por Supabase Auth y no se expone por la API
-- automática. Esta tabla contiene sólo los datos de perfil que Divi necesita.

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

-- Completa perfiles para cuentas creadas antes de instalar este trigger.
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

-- ============================================================
-- 1. Grupos
-- ============================================================

create table if not exists public.grupos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (btrim(nombre) <> ''),
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

comment on table public.grupos is 'Espacios donde se comparten gastos.';

-- ============================================================
-- 2. Integrantes
-- ============================================================

create table if not exists public.miembros (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  nombre text not null check (btrim(nombre) <> ''),
  iniciales varchar(4) not null check (btrim(iniciales) <> ''),
  usuario_id uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now(),

  -- Permite validar que los miembros relacionados pertenezcan al mismo grupo.
  unique (id, grupo_id)
);

create index if not exists miembros_grupo_id_idx
  on public.miembros (grupo_id);

comment on table public.miembros is 'Personas que participan en un grupo.';

-- ============================================================
-- 3. Movimientos
-- ============================================================

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  tipo text not null check (tipo in ('gasto', 'prestamo')),
  descripcion text not null check (btrim(descripcion) <> ''),
  monto numeric(14, 2) not null check (monto > 0),
  moneda char(3) not null default 'ARS' check (moneda = 'ARS'),
  categoria text not null,
  pagado_por uuid not null,
  receptor uuid,
  creado_en timestamptz not null default now(),

  -- La persona que paga/presta y quien recibe deben pertenecer al grupo.
  foreign key (pagado_por, grupo_id)
    references public.miembros (id, grupo_id),
  foreign key (receptor, grupo_id)
    references public.miembros (id, grupo_id),

  -- En un gasto se reparte entre participantes; en un préstamo hay receptor.
  check (
    (tipo = 'gasto' and receptor is null and categoria in (
      'Alquiler', 'Comida', 'Transporte', 'Compras', 'Otros'
    ))
    or
    (tipo = 'prestamo' and receptor is not null and receptor <> pagado_por
      and categoria = 'Préstamo')
  ),

  unique (id, grupo_id)
);

create index if not exists movimientos_grupo_creado_en_idx
  on public.movimientos (grupo_id, creado_en desc);

comment on table public.movimientos is 'Gastos grupales y préstamos individuales.';
comment on column public.movimientos.monto is 'Importe positivo expresado en pesos argentinos.';

-- ============================================================
-- 4. Participantes de cada gasto
-- ============================================================

create table if not exists public.movimiento_participantes (
  movimiento_id uuid not null,
  grupo_id uuid not null,
  miembro_id uuid not null,
  monto_parte numeric(14, 2) not null check (monto_parte > 0),
  creado_en timestamptz not null default now(),

  primary key (movimiento_id, miembro_id),

  foreign key (movimiento_id, grupo_id)
    references public.movimientos (id, grupo_id) on delete cascade,
  foreign key (miembro_id, grupo_id)
    references public.miembros (id, grupo_id)
);

create index if not exists movimiento_participantes_grupo_id_idx
  on public.movimiento_participantes (grupo_id);

comment on table public.movimiento_participantes is
  'Personas que participan de un gasto y la parte que les corresponde.';
comment on column public.movimiento_participantes.monto_parte is
  'Parte individual del gasto. En esta iteración se calcula en partes iguales.';

-- ============================================================
-- 5. Seguridad para la API de Supabase
-- ============================================================
--
-- Esta primera estructura queda preparada para Supabase Auth. La aplicación
-- actual todavía usa datos locales, por lo que no necesita estas tablas para
-- funcionar. Cuando agreguemos login, cada grupo será propiedad de su creador
-- y podrá ser consultado por el rol authenticated.

alter table public.grupos enable row level security;
alter table public.miembros enable row level security;
alter table public.movimientos enable row level security;
alter table public.movimiento_participantes enable row level security;

revoke all on table
  public.grupos,
  public.miembros,
  public.movimientos,
  public.movimiento_participantes
from anon;

grant usage on schema public to authenticated;

grant select, insert, update, delete on table
  public.grupos,
  public.miembros,
  public.movimientos,
  public.movimiento_participantes
to authenticated;

-- Grupos: por ahora el creador es el dueño del espacio.

drop policy if exists "El creador puede ver sus grupos" on public.grupos;
create policy "El creador puede ver sus grupos"
  on public.grupos for select
  to authenticated
  using ((select auth.uid()) = creado_por);

drop policy if exists "Un usuario autenticado puede crear su grupo" on public.grupos;
create policy "Un usuario autenticado puede crear su grupo"
  on public.grupos for insert
  to authenticated
  with check ((select auth.uid()) = creado_por);

drop policy if exists "El creador puede editar sus grupos" on public.grupos;
create policy "El creador puede editar sus grupos"
  on public.grupos for update
  to authenticated
  using ((select auth.uid()) = creado_por)
  with check ((select auth.uid()) = creado_por);

drop policy if exists "El creador puede eliminar sus grupos" on public.grupos;
create policy "El creador puede eliminar sus grupos"
  on public.grupos for delete
  to authenticated
  using ((select auth.uid()) = creado_por);

-- Integrantes: el dueño del grupo administra sus integrantes.

drop policy if exists "El dueño puede ver los integrantes de su grupo" on public.miembros;
create policy "El dueño puede ver los integrantes de su grupo"
  on public.miembros for select
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = miembros.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede agregar integrantes" on public.miembros;
create policy "El dueño puede agregar integrantes"
  on public.miembros for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = miembros.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede editar integrantes" on public.miembros;
create policy "El dueño puede editar integrantes"
  on public.miembros for update
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = miembros.grupo_id
        and g.creado_por = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = miembros.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede eliminar integrantes" on public.miembros;
create policy "El dueño puede eliminar integrantes"
  on public.miembros for delete
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = miembros.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

-- Movimientos: el dueño del grupo puede consultar y administrar el historial.

drop policy if exists "El dueño puede ver los movimientos" on public.movimientos;
create policy "El dueño puede ver los movimientos"
  on public.movimientos for select
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimientos.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede crear movimientos" on public.movimientos;
create policy "El dueño puede crear movimientos"
  on public.movimientos for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = movimientos.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede editar movimientos" on public.movimientos;
create policy "El dueño puede editar movimientos"
  on public.movimientos for update
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimientos.grupo_id
        and g.creado_por = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = movimientos.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede eliminar movimientos" on public.movimientos;
create policy "El dueño puede eliminar movimientos"
  on public.movimientos for delete
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimientos.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

-- Participantes: siguen el mismo permiso del movimiento/grupo.

drop policy if exists "El dueño puede ver participantes" on public.movimiento_participantes;
create policy "El dueño puede ver participantes"
  on public.movimiento_participantes for select
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimiento_participantes.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede crear participantes" on public.movimiento_participantes;
create policy "El dueño puede crear participantes"
  on public.movimiento_participantes for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = movimiento_participantes.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede editar participantes" on public.movimiento_participantes;
create policy "El dueño puede editar participantes"
  on public.movimiento_participantes for update
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimiento_participantes.grupo_id
        and g.creado_por = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.grupos g
      where g.id = movimiento_participantes.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El dueño puede eliminar participantes" on public.movimiento_participantes;
create policy "El dueño puede eliminar participantes"
  on public.movimiento_participantes for delete
  to authenticated
  using (
    exists (
      select 1
      from public.grupos g
      where g.id = movimiento_participantes.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );
