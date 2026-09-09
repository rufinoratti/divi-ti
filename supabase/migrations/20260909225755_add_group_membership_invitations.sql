-- Divi: membership-based access and shareable invitations.

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
