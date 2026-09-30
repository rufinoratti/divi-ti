-- Keep the resolver identity required by each resolved payment's audit trail.
alter table public.liquidaciones
  drop constraint if exists liquidaciones_resuelto_por_fkey;

alter table public.liquidaciones
  add constraint liquidaciones_resuelto_por_fkey
  foreign key (resuelto_por) references auth.users(id) on delete restrict;
