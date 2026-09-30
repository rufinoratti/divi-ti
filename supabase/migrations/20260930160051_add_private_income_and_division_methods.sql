alter table public.perfiles
  add column ingreso_mensual numeric(14, 2)
  check (ingreso_mensual is null or ingreso_mensual > 0);

comment on column public.perfiles.ingreso_mensual is
  'Ingreso mensual privado. Las políticas de perfiles permiten acceso sólo a su titular.';

alter table public.movimientos
  add column division_method text;

update public.movimientos
set division_method = case when tipo = 'gasto' then 'equal' else null end;

alter table public.movimientos
  add constraint movimientos_division_method_check
  check (
    (tipo = 'gasto' and division_method is not null and division_method in ('equal', 'consumption', 'income'))
    or (tipo = 'prestamo' and division_method is null)
  );

comment on column public.movimientos.division_method is
  'Método usado para repartir un gasto. Los préstamos no tienen método de división.';

create or replace function public.previsualizar_division_por_ingresos(
  p_grupo_id uuid,
  p_monto numeric,
  p_miembros uuid[]
)
returns table (miembro_id uuid, monto_parte numeric(14, 2))
language plpgsql
security definer
set search_path = ''
as $func$
declare
  v_user_id uuid := (select auth.uid());
  v_total_cents bigint;
  v_member_count integer;
  v_total_income numeric;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED' using errcode = '42501';
  end if;

  if p_grupo_id is null or not private.usuario_es_miembro(p_grupo_id) then
    raise exception 'GROUP_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  if p_monto is null or p_monto <= 0 or p_miembros is null or cardinality(p_miembros) = 0 then
    raise exception 'INVALID_INCOME_SPLIT_INPUT' using errcode = '22023';
  end if;

  if (select count(distinct requested.miembro_id) from unnest(p_miembros) as requested(miembro_id))
    <> cardinality(p_miembros) then
    raise exception 'DUPLICATE_INCOME_SPLIT_MEMBER' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_miembros) as requested(miembro_id)
    where not exists (
      select 1
      from public.miembros group_member
      where group_member.id = requested.miembro_id
        and group_member.grupo_id = p_grupo_id
    )
  ) then
    raise exception 'INCOME_SPLIT_MEMBER_OUTSIDE_GROUP' using errcode = '23514';
  end if;

  select
    count(*)::integer,
    coalesce(sum(profile.ingreso_mensual), 0)
  into v_member_count, v_total_income
  from unnest(p_miembros) as requested(miembro_id)
  join public.miembros group_member
    on group_member.id = requested.miembro_id
    and group_member.grupo_id = p_grupo_id
  left join public.perfiles profile
    on profile.id = group_member.usuario_id;

  if v_member_count <> cardinality(p_miembros) or exists (
    select 1
    from unnest(p_miembros) as requested(miembro_id)
    join public.miembros group_member
      on group_member.id = requested.miembro_id
      and group_member.grupo_id = p_grupo_id
    left join public.perfiles profile
      on profile.id = group_member.usuario_id
    where profile.ingreso_mensual is null or profile.ingreso_mensual <= 0
  ) then
    raise exception 'INCOME_REQUIRED_FOR_EACH_PARTICIPANT' using errcode = '23514';
  end if;

  v_total_cents := round(p_monto * 100)::bigint;
  if v_total_cents < v_member_count then
    raise exception 'AMOUNT_TOO_SMALL_FOR_PARTICIPANT_COUNT' using errcode = '23514';
  end if;

  return query
  with income_values as (
    select requested.miembro_id, requested.orden, profile.ingreso_mensual
    from unnest(p_miembros) with ordinality as requested(miembro_id, orden)
    join public.miembros group_member
      on group_member.id = requested.miembro_id
      and group_member.grupo_id = p_grupo_id
    join public.perfiles profile
      on profile.id = group_member.usuario_id
  ), weighted_cents as (
    select
      income_values.miembro_id,
      income_values.orden,
      ((v_total_cents - v_member_count)::numeric * income_values.ingreso_mensual / v_total_income) as exact_cents
    from income_values
  ), rounded_cents as (
    select
      weighted_cents.miembro_id,
      weighted_cents.orden,
      floor(weighted_cents.exact_cents)::bigint as base_cents,
      weighted_cents.exact_cents - floor(weighted_cents.exact_cents) as fraction
    from weighted_cents
  ), ranked_cents as (
    select
      rounded_cents.*,
      row_number() over (order by rounded_cents.fraction desc, rounded_cents.miembro_id) as remainder_rank,
      (v_total_cents - v_member_count - sum(rounded_cents.base_cents) over ()) as extra_cents
    from rounded_cents
  )
  select
    ranked_cents.miembro_id,
    ((1 + ranked_cents.base_cents + case when ranked_cents.remainder_rank <= ranked_cents.extra_cents then 1 else 0 end)::numeric / 100)::numeric(14, 2)
  from ranked_cents
  order by ranked_cents.orden;
end;
$func$;

revoke all on function public.previsualizar_division_por_ingresos(uuid, numeric, uuid[]) from public, anon, authenticated;
grant execute on function public.previsualizar_division_por_ingresos(uuid, numeric, uuid[]) to authenticated;

create or replace function public.actualizar_movimiento(
  p_movimiento_id uuid,
  p_grupo_id uuid,
  p_tipo text,
  p_descripcion text,
  p_monto numeric,
  p_categoria text,
  p_division_method text,
  p_pagado_por uuid,
  p_receptor uuid,
  p_participantes uuid[],
  p_partes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $func$
declare
  v_total_cents bigint;
  v_count integer;
  v_shares jsonb := coalesce(p_partes, '{}'::jsonb);
  v_share_total bigint;
begin
  if (select auth.uid()) is null or not private.usuario_es_miembro(p_grupo_id) then
    raise exception 'GROUP_MEMBERSHIP_REQUIRED' using errcode = '42501';
  end if;

  perform 1 from public.movimientos
  where id = p_movimiento_id and grupo_id = p_grupo_id
  for update;
  if not found then
    raise exception 'MOVEMENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.liquidaciones
    where movimiento_id = p_movimiento_id and estado in ('pendiente', 'confirmada')
  ) then
    raise exception 'MOVEMENT_HAS_PAYMENT' using errcode = '23514';
  end if;

  if p_descripcion is null or btrim(p_descripcion) = '' or p_monto is null or p_monto <= 0 then
    raise exception 'INVALID_MOVEMENT_INPUT' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.miembros
    where id = p_pagado_por and grupo_id = p_grupo_id
  ) then
    raise exception 'MOVEMENT_PAYER_OUTSIDE_GROUP' using errcode = '23514';
  end if;

  if p_tipo = 'gasto' then
    if p_division_method not in ('equal', 'consumption', 'income')
      or p_participantes is null or cardinality(p_participantes) = 0 then
      raise exception 'INVALID_EXPENSE_SPLIT' using errcode = '22023';
    end if;
    if (select count(distinct requested.member_id) from unnest(p_participantes) as requested(member_id))
      <> cardinality(p_participantes) then
      raise exception 'DUPLICATE_EXPENSE_PARTICIPANT' using errcode = '22023';
    end if;
    if exists (
      select 1
      from unnest(p_participantes) as requested(member_id)
      where not exists (
        select 1 from public.miembros
        where id = requested.member_id and grupo_id = p_grupo_id
      )
    ) then
      raise exception 'EXPENSE_PARTICIPANT_OUTSIDE_GROUP' using errcode = '23514';
    end if;

    v_total_cents := round(p_monto * 100)::bigint;
    v_count := cardinality(p_participantes);
    if v_total_cents < v_count then
      raise exception 'AMOUNT_TOO_SMALL_FOR_PARTICIPANT_COUNT' using errcode = '23514';
    end if;

    if p_division_method = 'income' then
      select coalesce(jsonb_object_agg(shares.miembro_id::text, shares.monto_parte), '{}'::jsonb)
      into v_shares
      from public.previsualizar_division_por_ingresos(p_grupo_id, p_monto, p_participantes) as shares;
    elsif p_division_method = 'consumption' then
      if jsonb_typeof(v_shares) <> 'object' then
        raise exception 'INVALID_CONSUMPTION_SHARES' using errcode = '22023';
      end if;
      if (select count(*) from jsonb_object_keys(v_shares)) <> v_count then
        raise exception 'INVALID_CONSUMPTION_SHARES' using errcode = '22023';
      end if;
      if exists (
        select 1 from unnest(p_participantes) as requested(member_id)
        where not (v_shares ? requested.member_id::text)
          or coalesce((v_shares ->> requested.member_id::text)::numeric, 0) <= 0
      ) then
        raise exception 'INVALID_CONSUMPTION_SHARES' using errcode = '22023';
      end if;
    else
      v_shares := '{}'::jsonb;
    end if;

    if p_division_method = 'equal' then
      v_share_total := v_total_cents;
    else
      select coalesce(sum(round((v_shares ->> requested.member_id::text)::numeric * 100)::bigint), 0)
      into v_share_total
      from unnest(p_participantes) as requested(member_id);
      if v_share_total <> v_total_cents then
        raise exception 'CONSUMPTION_SHARES_MUST_MATCH_TOTAL' using errcode = '23514';
      end if;
    end if;
  elsif p_tipo = 'prestamo' then
    if p_receptor is null or p_receptor = p_pagado_por
      or not exists (select 1 from public.miembros where id = p_receptor and grupo_id = p_grupo_id)
      or coalesce(cardinality(p_participantes), 0) <> 0 then
      raise exception 'INVALID_LOAN_PARTICIPANTS' using errcode = '23514';
    end if;
    v_shares := '{}'::jsonb;
  else
    raise exception 'INVALID_MOVEMENT_KIND' using errcode = '22023';
  end if;

  update public.movimientos
  set tipo = p_tipo,
      descripcion = btrim(p_descripcion),
      monto = round(p_monto, 2),
      categoria = p_categoria,
      division_method = case when p_tipo = 'gasto' then p_division_method else null end,
      pagado_por = p_pagado_por,
      receptor = case when p_tipo = 'prestamo' then p_receptor else null end
  where id = p_movimiento_id and grupo_id = p_grupo_id;

  delete from public.movimiento_participantes
  where movimiento_id = p_movimiento_id and grupo_id = p_grupo_id;

  if p_tipo = 'gasto' then
    insert into public.movimiento_participantes (movimiento_id, grupo_id, miembro_id, monto_parte)
    select
      p_movimiento_id,
      p_grupo_id,
      requested.member_id,
      case
        when p_division_method = 'equal' then
          ((v_total_cents / v_count) + case when requested.position <= mod(v_total_cents, v_count) then 1 else 0 end)::numeric / 100
        else (v_shares ->> requested.member_id::text)::numeric
      end
    from (
      select
        participant.member_id,
        row_number() over (order by participant.member_id) as position
      from unnest(p_participantes) as participant(member_id)
    ) as requested;
  end if;

  return jsonb_build_object('id', p_movimiento_id);
end;
$func$;

revoke all on function public.actualizar_movimiento(uuid, uuid, text, text, numeric, text, text, uuid, uuid, uuid[], jsonb) from public, anon, authenticated;
grant execute on function public.actualizar_movimiento(uuid, uuid, text, text, numeric, text, text, uuid, uuid, uuid[], jsonb) to authenticated;

do $publication$
declare
  v_table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table_name in array array['movimientos', 'movimiento_participantes', 'liquidaciones'] loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = v_table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table_name);
      end if;
    end loop;
  end if;
end;
$publication$;

notify pgrst, 'reload schema';
