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
  codigo_union text not null check (codigo_union ~ '^[A-F0-9]{12}$'),
  creado_por uuid references auth.users(id) on delete set null,
  creado_en timestamptz not null default now()
);

alter table public.grupos
  add column if not exists codigo_union text;

do $$
declare
  v_group record;
  v_code text;
begin
  for v_group in select id from public.grupos where codigo_union is null loop
    loop
      v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
      exit when not exists (
        select 1 from public.grupos where codigo_union = v_code
      );
    end loop;

    update public.grupos set codigo_union = v_code where id = v_group.id;
  end loop;
end;
$$;

alter table public.grupos
  alter column codigo_union set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'grupos_codigo_union_check'
      and conrelid = 'public.grupos'::regclass
  ) then
    alter table public.grupos
      add constraint grupos_codigo_union_check
      check (codigo_union ~ '^[A-F0-9]{12}$');
  end if;
end;
$$;

create unique index if not exists grupos_codigo_union_idx
  on public.grupos (codigo_union);

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

-- ============================================================
-- 6. Invitaciones y acceso por pertenencia
-- ============================================================

create table if not exists public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  email text not null check (btrim(email) <> '' and email = lower(email)),
  nombre text,
  token text not null unique check (char_length(token) >= 20),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'cancelada')),
  creada_por uuid not null references auth.users(id) on delete cascade,
  aceptada_por uuid references auth.users(id) on delete set null,
  creada_en timestamptz not null default now(),
  aceptada_en timestamptz
);

comment on table public.invitaciones is 'Invitaciones compartibles para sumar usuarios autenticados a un grupo.';

create index if not exists invitaciones_token_idx
  on public.invitaciones (token);

create unique index if not exists invitaciones_pendientes_grupo_email_idx
  on public.invitaciones (grupo_id, email)
  where estado = 'pendiente';

alter table public.miembros
  add column if not exists invitacion_id uuid references public.invitaciones(id) on delete set null;

create unique index if not exists miembros_grupo_usuario_idx
  on public.miembros (grupo_id, usuario_id)
  where usuario_id is not null;

create index if not exists miembros_usuario_id_idx
  on public.miembros (usuario_id);

create or replace function private.usuario_es_miembro(p_grupo_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $func$
  select exists (
    select 1
    from public.miembros m
    where m.grupo_id = p_grupo_id
      and m.usuario_id = (select auth.uid())
  );
$func$;

revoke all on function private.usuario_es_miembro(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.usuario_es_miembro(uuid) to authenticated;

create or replace function private.unirse_a_grupo_por_codigo(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := (select auth.uid());
  v_code text := upper(regexp_replace(coalesce(p_codigo, ''), '[-[:space:]]', '', 'g'));
  v_group_id uuid;
  v_group_name text;
  v_member_name text;
  v_initials text;
  v_member public.miembros%rowtype;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if char_length(v_code) <> 12 then
    raise exception 'GROUP_CODE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select g.id, g.nombre
    into v_group_id, v_group_name
    from public.grupos g
    where g.codigo_union = v_code;

  if v_group_id is null then
    raise exception 'GROUP_CODE_NOT_FOUND' using errcode = 'P0002';
  end if;

  select m.* into v_member
    from public.miembros m
    where m.grupo_id = v_group_id
      and m.usuario_id = v_user_id;

  if found then
    return jsonb_build_object(
      'alreadyMember', true,
      'group', jsonb_build_object('id', v_group_id, 'nombre', v_group_name),
      'member', jsonb_build_object(
        'id', v_member.id,
        'grupo_id', v_member.grupo_id,
        'nombre', v_member.nombre,
        'iniciales', v_member.iniciales,
        'usuario_id', v_member.usuario_id
      )
    );
  end if;

  v_member_name := coalesce(
    (select nullif(btrim(p.nombre), '') from public.perfiles p where p.id = v_user_id),
    nullif(split_part(coalesce((select auth.jwt() ->> 'email'), ''), '@', 1), ''),
    'Integrante'
  );
  v_initials := upper(substr(regexp_replace(v_member_name, '[^[:alnum:]]', '', 'g'), 1, 2));
  if v_initials = '' then
    v_initials := 'IN';
  end if;

  insert into public.miembros (grupo_id, nombre, iniciales, usuario_id)
    values (v_group_id, v_member_name, v_initials, v_user_id)
    on conflict do nothing
    returning * into v_member;

  if v_member.id is null then
    select m.* into v_member
      from public.miembros m
      where m.grupo_id = v_group_id
        and m.usuario_id = v_user_id;
  end if;

  return jsonb_build_object(
    'alreadyMember', v_member.id is not null and v_member.grupo_id = v_group_id,
    'group', jsonb_build_object('id', v_group_id, 'nombre', v_group_name),
    'member', jsonb_build_object(
      'id', v_member.id,
      'grupo_id', v_member.grupo_id,
      'nombre', v_member.nombre,
      'iniciales', v_member.iniciales,
      'usuario_id', v_member.usuario_id
    )
  );
end;
$func$;

revoke all on function private.unirse_a_grupo_por_codigo(text) from public, anon, authenticated;
grant execute on function private.unirse_a_grupo_por_codigo(text) to authenticated;

create or replace function public.unirse_a_grupo_por_codigo(p_codigo text)
returns jsonb
language sql
security invoker
set search_path = ''
as $func$
  select private.unirse_a_grupo_por_codigo(p_codigo);
$func$;

revoke all on function public.unirse_a_grupo_por_codigo(text) from public, anon;
grant execute on function public.unirse_a_grupo_por_codigo(text) to authenticated;

alter table public.invitaciones enable row level security;

revoke all on table public.invitaciones from anon;
grant select, insert, update on table public.invitaciones to authenticated;

drop policy if exists "El creador puede ver sus grupos" on public.grupos;
create policy "El creador puede ver sus grupos"
  on public.grupos for select
  to authenticated
  using (
    creado_por = (select auth.uid())
    or private.usuario_es_miembro(id)
  );

drop policy if exists "El dueño puede ver los integrantes de su grupo" on public.miembros;
create policy "El dueño puede ver los integrantes de su grupo"
  on public.miembros for select
  to authenticated
  using (
    usuario_id = (select auth.uid())
    or private.usuario_es_miembro(grupo_id)
    or exists (
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
    or (
      usuario_id = (select auth.uid())
      and invitacion_id is not null
      and exists (
        select 1
        from public.invitaciones i
        where i.id = miembros.invitacion_id
          and i.grupo_id = miembros.grupo_id
          and i.estado = 'pendiente'
          and lower(i.email) = lower((select auth.jwt() ->> 'email'))
      )
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
    or (
      usuario_id = (select auth.uid())
      and invitacion_id is not null
    )
  );

drop policy if exists "El creador puede ver las invitaciones de sus grupos" on public.invitaciones;
create policy "El creador puede ver las invitaciones de sus grupos"
  on public.invitaciones for select
  to authenticated
  using (
    lower(email) = lower((select auth.jwt() ->> 'email'))
    or exists (
      select 1
      from public.grupos g
      where g.id = invitaciones.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El creador puede crear invitaciones" on public.invitaciones;
create policy "El creador puede crear invitaciones"
  on public.invitaciones for insert
  to authenticated
  with check (
    creada_por = (select auth.uid())
    and exists (
      select 1
      from public.grupos g
      where g.id = invitaciones.grupo_id
        and g.creado_por = (select auth.uid())
    )
  );

drop policy if exists "El invitado puede aceptar su invitación" on public.invitaciones;
create policy "El invitado puede aceptar su invitación"
  on public.invitaciones for update
  to authenticated
  using (
    lower(email) = lower((select auth.jwt() ->> 'email'))
    and estado = 'pendiente'
  )
  with check (
    lower(email) = lower((select auth.jwt() ->> 'email'))
    and estado = 'aceptada'
    and aceptada_por = (select auth.uid())
  );

drop policy if exists "El dueño puede ver los movimientos" on public.movimientos;
create policy "El dueño puede ver los movimientos"
  on public.movimientos for select
  to authenticated
  using (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede crear movimientos" on public.movimientos;
create policy "El dueño puede crear movimientos"
  on public.movimientos for insert
  to authenticated
  with check (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede editar movimientos" on public.movimientos;
create policy "El dueño puede editar movimientos"
  on public.movimientos for update
  to authenticated
  using (private.usuario_es_miembro(grupo_id))
  with check (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede eliminar movimientos" on public.movimientos;
create policy "El dueño puede eliminar movimientos"
  on public.movimientos for delete
  to authenticated
  using (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede ver participantes" on public.movimiento_participantes;
create policy "El dueño puede ver participantes"
  on public.movimiento_participantes for select
  to authenticated
  using (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede crear participantes" on public.movimiento_participantes;
create policy "El dueño puede crear participantes"
  on public.movimiento_participantes for insert
  to authenticated
  with check (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede editar participantes" on public.movimiento_participantes;
create policy "El dueño puede editar participantes"
  on public.movimiento_participantes for update
  to authenticated
  using (private.usuario_es_miembro(grupo_id))
  with check (private.usuario_es_miembro(grupo_id));

drop policy if exists "El dueño puede eliminar participantes" on public.movimiento_participantes;
create policy "El dueño puede eliminar participantes"
  on public.movimiento_participantes for delete
  to authenticated
  using (private.usuario_es_miembro(grupo_id));
