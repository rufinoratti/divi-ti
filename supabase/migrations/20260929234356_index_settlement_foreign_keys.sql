-- Indexes for the foreign keys introduced by payment history and notifications.
-- They keep membership checks and cascading deletes efficient.

create index if not exists liquidaciones_pagador_grupo_idx
  on public.liquidaciones (pagador_id, grupo_id);

create index if not exists liquidaciones_receptor_grupo_idx
  on public.liquidaciones (receptor_id, grupo_id);

create index if not exists liquidaciones_reportado_por_idx
  on public.liquidaciones (reportado_por);

create index if not exists liquidaciones_resuelto_por_idx
  on public.liquidaciones (resuelto_por);

create index if not exists notificaciones_usuario_id_idx
  on public.notificaciones (usuario_id);
