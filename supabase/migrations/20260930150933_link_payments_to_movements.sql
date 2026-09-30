-- Vincular cada pago confirmado con el gasto o préstamo que cancela.

alter table public.liquidaciones
  add column if not exists movimiento_id uuid;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'liquidaciones_movimiento_grupo_fkey'
      and conrelid = 'public.liquidaciones'::regclass
  ) then
    alter table public.liquidaciones
      add constraint liquidaciones_movimiento_grupo_fkey
      foreign key (movimiento_id, grupo_id)
      references public.movimientos (id, grupo_id)
      on delete cascade;
  end if;
end;
$migration$;

comment on column public.liquidaciones.movimiento_id is
  'Movimiento individual al que corresponde el pago informado.';

create index if not exists liquidaciones_movimiento_integrantes_idx
  on public.liquidaciones (movimiento_id, pagador_id, receptor_id, estado);

drop index if exists public.liquidaciones_pendientes_por_par_idx;
create unique index if not exists liquidaciones_pendientes_por_movimiento_idx
  on public.liquidaciones (movimiento_id, pagador_id, receptor_id)
  where estado = 'pendiente' and movimiento_id is not null;

grant insert (movimiento_id) on public.liquidaciones to authenticated;

drop policy if exists "Un integrante puede informar su pago" on public.liquidaciones;
create policy "Un integrante puede informar su pago"
  on public.liquidaciones for insert
  to authenticated
  with check (
    movimiento_id is not null
    and reportado_por = (select auth.uid())
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
    and exists (
      select 1
      from public.movimientos movimiento
      where movimiento.id = liquidaciones.movimiento_id
        and movimiento.grupo_id = liquidaciones.grupo_id
        and (
          (
            movimiento.tipo = 'gasto'
            and movimiento.pagado_por = liquidaciones.receptor_id
            and liquidaciones.pagador_id <> movimiento.pagado_por
            and exists (
              select 1 from public.movimiento_participantes participante
              where participante.movimiento_id = movimiento.id
                and participante.grupo_id = movimiento.grupo_id
                and participante.miembro_id = liquidaciones.pagador_id
            )
          )
          or (
            movimiento.tipo = 'prestamo'
            and movimiento.pagado_por = liquidaciones.receptor_id
            and movimiento.receptor = liquidaciones.pagador_id
          )
        )
      )
  );

notify pgrst, 'reload schema';
