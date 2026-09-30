begin;

-- Habilita pgTAP durante esta prueba y permite resolver funciones en ambos
-- esquemas habituales de Supabase. El rollback final revierte la extensión si
-- todavía no estaba instalada.
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public;

select plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'income-owner@example.com', 'test', now()),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'income-member@example.com', 'test', now());

update public.perfiles
set ingreso_mensual = 3000
where id = '11111111-1111-4111-8111-111111111111';

update public.perfiles
set ingreso_mensual = 1000
where id = '22222222-2222-4222-8222-222222222222';

insert into public.grupos (id, nombre, codigo_union, creado_por)
values ('33333333-3333-4333-8333-333333333333', 'Grupo de prueba', 'ABCDEF123456', '11111111-1111-4111-8111-111111111111');

insert into public.miembros (id, grupo_id, nombre, iniciales, usuario_id)
values
  ('44444444-4444-4444-8444-444444444444', '33333333-3333-4333-8333-333333333333', 'Ana', 'AN', '11111111-1111-4111-8111-111111111111'),
  ('55555555-5555-4555-8555-555555555555', '33333333-3333-4333-8333-333333333333', 'Beto', 'BE', '22222222-2222-4222-8222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select is(
  (select count(*)::integer from public.perfiles where id = '11111111-1111-4111-8111-111111111111'),
  1,
  'account can read its own income profile'
);

select is(
  (select count(*)::integer from public.perfiles where id = '22222222-2222-4222-8222-222222222222'),
  0,
  'account cannot read another member income profile'
);

with changed as (
  update public.perfiles set ingreso_mensual = 9999
  where id = '22222222-2222-4222-8222-222222222222'
  returning id
)
select is(
  (select count(*)::integer from changed),
  0,
  'account cannot update another member income'
);

select is(
  (select sum(monto_parte)::numeric(14, 2)
   from public.previsualizar_division_por_ingresos(
     '33333333-3333-4333-8333-333333333333',
     100,
     array['44444444-4444-4444-8444-444444444444'::uuid, '55555555-5555-4555-8555-555555555555'::uuid]
   )),
  100.00::numeric(14, 2),
  'income split returns calculated shares that sum to the total'
);

select is(
  (select monto_parte
   from public.previsualizar_division_por_ingresos(
     '33333333-3333-4333-8333-333333333333',
     100,
     array['55555555-5555-4555-8555-555555555555'::uuid, '44444444-4444-4444-8444-444444444444'::uuid]
   )
   where miembro_id = '44444444-4444-4444-8444-444444444444'),
  75.00::numeric(14, 2),
  'income ratio is preserved regardless of participant selection order'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is(
  (select count(*)::integer from public.perfiles where id = '22222222-2222-4222-8222-222222222222'),
  1,
  'second account can read its own income profile'
);

select is(
  (select count(*)::integer from public.perfiles where id = '11111111-1111-4111-8111-111111111111'),
  0,
  'second account cannot read the first member income profile'
);

select * from finish();
rollback;
