-- Only let the recipient choose the outcome. The database records who and when.
revoke update (estado, resuelto_por, resuelto_en)
  on public.liquidaciones from authenticated;
grant update (estado) on public.liquidaciones to authenticated;

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
