-- Add a reusable, group-specific join code and accept it through authenticated membership.

create schema if not exists private;

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
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
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
