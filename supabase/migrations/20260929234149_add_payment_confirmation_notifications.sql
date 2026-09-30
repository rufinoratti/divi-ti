-- Persistir los pagos informados, esperar confirmación del destinatario y
-- crear notificaciones dentro de la misma transacción.

create table if not exists public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null,
  pagador_id uuid not null,
  receptor_id uuid not null,
  monto numeric(14, 2) not null check (monto > 0),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'confirmada', 'rechazada')),
  reportado_por uuid not null references auth.users(id) on delete restrict,
  creado_en timestamptz not null default now(),
  resuelto_por uuid references auth.users(id) on delete restrict,
  resuelto_en timestamptz,
  constraint liquidaciones_grupo_id_fkey
    foreign key (grupo_id) references public.grupos(id) on delete cascade,
  constraint liquidaciones_pagador_grupo_fkey
    foreign key (pagador_id, grupo_id) references public.miembros(id, grupo_id) on delete restrict,
  constraint liquidaciones_receptor_grupo_fkey
    foreign key (receptor_id, grupo_id) references public.miembros(id, grupo_id) on delete restrict,
  constraint liquidaciones_integrantes_distintos_check check (pagador_id <> receptor_id),
  constraint liquidaciones_resolucion_check check (
    (estado = 'pendiente' and resuelto_por is null and resuelto_en is null)
    or (estado in ('confirmada', 'rechazada') and resuelto_por is not null and resuelto_en is not null)
  )
);

create index if not exists liquidaciones_grupo_creado_en_idx
  on public.liquidaciones (grupo_id, creado_en desc);

create unique index if not exists liquidaciones_pendientes_por_par_idx
  on public.liquidaciones (grupo_id, pagador_id, receptor_id)
  where estado = 'pendiente';

comment on table public.liquidaciones is
  'Pagos informados entre integrantes; el balance cambia sólo cuando el receptor confirma.';

create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  liquidacion_id uuid not null,
  tipo text not null check (tipo in ('pago_informado', 'pago_confirmado', 'pago_rechazado')),
  creada_en timestamptz not null default now(),
  leida_en timestamptz,
  constraint notificaciones_liquidacion_id_fkey
    foreign key (liquidacion_id) references public.liquidaciones(id) on delete cascade,
  unique (liquidacion_id, usuario_id, tipo)
);

create index if not exists notificaciones_usuario_sin_leer_idx
  on public.notificaciones (usuario_id, creada_en desc)
  where leida_en is null;

alter table public.liquidaciones enable row level security;
alter table public.notificaciones enable row level security;

revoke all on table public.liquidaciones, public.notificaciones from public, anon, authenticated;
grant select on table public.liquidaciones to authenticated;
grant insert (grupo_id, pagador_id, receptor_id, monto, reportado_por)
  on public.liquidaciones to authenticated;
grant update (estado)
  on public.liquidaciones to authenticated;
grant select on table public.notificaciones to authenticated;
grant update (leida_en) on public.notificaciones to authenticated;

drop policy if exists "Los integrantes pueden ver las liquidaciones del grupo" on public.liquidaciones;
create policy "Los integrantes pueden ver las liquidaciones del grupo"
  on public.liquidaciones for select
  to authenticated
  using (private.usuario_es_miembro(grupo_id));

drop policy if exists "Un integrante puede informar su pago" on public.liquidaciones;
create policy "Un integrante puede informar su pago"
  on public.liquidaciones for insert
  to authenticated
  with check (
    reportado_por = (select auth.uid())
    and exists (
      select 1 from public.miembros pagador
      where pagador.id = liquidaciones.pagador_id
        and pagador.grupo_id = liquidaciones.grupo_id
        and pagador.usuario_id = (select auth.uid())
    )
    and exists (
      select 1 from public.miembros receptor
      where receptor.id = liquidaciones.receptor_id
        and receptor.grupo_id = liquidaciones.grupo_id
        and receptor.usuario_id is not null
    )
  );

drop policy if exists "Sólo quien recibe puede resolver el pago pendiente" on public.liquidaciones;
create policy "Sólo quien recibe puede resolver el pago pendiente"
  on public.liquidaciones for update
  to authenticated
  using (
    estado = 'pendiente'
    and exists (
      select 1 from public.miembros receptor
      where receptor.id = liquidaciones.receptor_id
        and receptor.grupo_id = liquidaciones.grupo_id
        and receptor.usuario_id = (select auth.uid())
    )
  )
  with check (
    estado in ('confirmada', 'rechazada')
    and resuelto_por = (select auth.uid())
    and exists (
      select 1 from public.miembros receptor
      where receptor.id = liquidaciones.receptor_id
        and receptor.grupo_id = liquidaciones.grupo_id
        and receptor.usuario_id = (select auth.uid())
    )
  );

drop policy if exists "Cada usuario puede ver sus notificaciones" on public.notificaciones;
create policy "Cada usuario puede ver sus notificaciones"
  on public.notificaciones for select
  to authenticated
  using (usuario_id = (select auth.uid()));

drop policy if exists "Cada usuario puede marcar sus notificaciones como leídas" on public.notificaciones;
create policy "Cada usuario puede marcar sus notificaciones como leídas"
  on public.notificaciones for update
  to authenticated
  using (usuario_id = (select auth.uid()))
  with check (usuario_id = (select auth.uid()));

create or replace function private.notificar_evento_liquidacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_usuario_id uuid;
  v_tipo text;
begin
  if tg_op = 'INSERT' then
    select m.usuario_id into v_usuario_id
    from public.miembros m
    where m.id = new.receptor_id and m.grupo_id = new.grupo_id;

    if v_usuario_id is null then
      raise exception 'PAYMENT_RECIPIENT_ACCOUNT_REQUIRED' using errcode = '23514';
    end if;

    insert into public.notificaciones (usuario_id, liquidacion_id, tipo)
    values (v_usuario_id, new.id, 'pago_informado')
    on conflict (liquidacion_id, usuario_id, tipo) do nothing;

    return new;
  end if;

  if old.estado = 'pendiente' and new.estado = 'confirmada' then
    v_tipo := 'pago_confirmado';
  elsif old.estado = 'pendiente' and new.estado = 'rechazada' then
    v_tipo := 'pago_rechazado';
  else
    return new;
  end if;

  insert into public.notificaciones (usuario_id, liquidacion_id, tipo)
  values (new.reportado_por, new.id, v_tipo)
  on conflict (liquidacion_id, usuario_id, tipo) do nothing;

  return new;
end;
$func$;

revoke all on function private.notificar_evento_liquidacion() from public, anon, authenticated;

drop trigger if exists liquidaciones_notificar_evento on public.liquidaciones;
create trigger liquidaciones_notificar_evento
  after insert or update of estado on public.liquidaciones
  for each row execute function private.notificar_evento_liquidacion();

create or replace function private.registrar_resolucion_liquidacion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $func$
begin
  if old.estado <> 'pendiente' or new.estado not in ('confirmada', 'rechazada') then
    raise exception 'SETTLEMENT_ALREADY_RESOLVED' using errcode = '23514';
  end if;

  new.resuelto_por := (select auth.uid());
  new.resuelto_en := now();
  return new;
end;
$func$;

revoke all on function private.registrar_resolucion_liquidacion() from public, anon, authenticated;

drop trigger if exists liquidaciones_registrar_resolucion on public.liquidaciones;
create trigger liquidaciones_registrar_resolucion
  before update of estado on public.liquidaciones
  for each row execute function private.registrar_resolucion_liquidacion();

notify pgrst, 'reload schema';
