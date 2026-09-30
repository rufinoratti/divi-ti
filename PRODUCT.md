# Divi — producto y alcance del MVP

## Propósito

Divi ayuda a amigos, parejas, familias y compañeros de vivienda a ordenar gastos compartidos. Cada persona puede registrar lo que pagó y consultar el saldo del grupo sin llevar cuentas en un chat o una planilla.

La captura del ticket y la división configurable reducen el trabajo manual. Divi propone datos desde la frase o la foto y deja que la persona los revise antes de guardar.

## Usuarios y contexto

Se usa principalmente desde el teléfono después de una cena, una compra grupal, un viaje o un gasto de la casa.

Flujo principal: crear o aceptar una invitación a un grupo → registrar un gasto → revisar el balance → saber quién paga a quién.

La interfaz es web adaptable a móviles y cuenta con un manifiesto PWA. El uso sin conexión todavía no está implementado.

## Reglas del producto

- La moneda de esta versión es el peso argentino (ARS).
- Un gasto grupal acredita lo que pagó una persona y reparte el costo entre quienes participan.
- Un gasto se puede dividir en partes iguales, por consumo real o en proporción a los ingresos mensuales de las personas seleccionadas.
- El reparto asigna los centavos sobrantes de forma determinística para que las partes sumen el total.
- Los ingresos mensuales son privados para su titular. El cálculo devuelve importes de reparto, no los ingresos de otras personas.
- Un préstamo es entre dos integrantes: quien presta queda a favor y quien recibe queda debiendo.
- Cada gasto o préstamo deja una deuda vinculada a ese movimiento y a las personas involucradas; las deudas de distintos movimientos no se compensan.
- El balance también presenta un saldo neto informativo y una propuesta de pagos con el menor número de transferencias para grupos de hasta ocho integrantes. Esta propuesta no registra ni modifica pagos.
- Divi no mueve dinero: quien debe puede elegir a quién pagar y cuánto, y la otra persona confirma o rechaza el aviso desde sus notificaciones.
- Cada pago informado queda vinculado a un gasto o préstamo, y no reduce esa deuda hasta que quien lo recibe confirma.

## Funcionalidad ya implementada

- Registro, inicio y cierre de sesión, recuperación y cambio de contraseña mediante Supabase Auth.
- Creación de grupos y asociación de la cuenta creadora con su integrante.
- Invitaciones por email mediante un enlace que la persona invitada acepta al iniciar sesión.
- Varias vistas de grupo: Inicio, Actividad, Balance y Perfil.
- Alta manual de gastos grupales con selección de participantes y préstamos 1 a 1.
- Atajo para iniciar un préstamo; interpretación local de frases para completar un borrador editable.
- Lectura OCR local de fotos de ticket para proponer importe y descripción. Las fotos no se suben ni se conservan.
- División igualitaria, por consumo real y proporcional a ingresos privados.
- Ingreso mensual opcional con RLS por cuenta; una función de base de datos devuelve únicamente las partes calculadas.
- Balance neto informativo y sugerencia exacta del menor número de pagos para grupos de hasta ocho integrantes.
- Actualización automática de movimientos y pagos cuando otro integrante hace un cambio.
- Deudas detalladas por gasto y persona, con importes exactos hasta centavos.
- Persistencia en Supabase, con acceso protegido por sesión y políticas RLS.
- Selector de grupo para cuentas que participan en más de un grupo; conserva la selección en el dispositivo.
- Vista general de todos los grupos, con actividad conjunta, balances separados por grupo y perfil de cuenta.
- Creación de grupos adicionales desde el perfil.
- Avisos de pago total o parcial, atajos para informar la deuda completa, confirmación o rechazo desde Inicio y Balance, notificaciones e historial trazable.

Todavía no se pueden cargar ítems del ticket. Los movimientos se pueden editar desde Actividad mientras no tengan pagos pendientes o confirmados. La sugerencia neta es informativa; los pagos siguen ligados a un movimiento.

## Iteraciones propuestas por el equipo

### Base compartida

- Mantener claros los errores de carga y la actualización de balances.

### Antes del piloto

- Aplicar las migraciones pendientes en un entorno de prueba y ejecutar las pruebas de base de datos.
- Completar recorridos en Safari iOS y Chrome Android; medir la carga de principio a fin.
- Hacer pruebas de usabilidad con 5 a 8 personas y un piloto de cuatro semanas. Los criterios y métricas están en [PILOT_ROADMAP.md](PILOT_ROADMAP.md).

Estas iteraciones son una propuesta de trabajo del equipo y se pueden ajustar al aprender de las pruebas con usuarios.

## Arquitectura actual

- Next.js con React 19, TypeScript y Vinext sobre Vite.
- Tailwind CSS v4, shadcn/ui y componentes propios.
- Supabase Auth y PostgreSQL.
- Esquema de datos en español: `perfiles`, `grupos`, `miembros`, `movimientos`, `movimiento_participantes`, `invitaciones`, `liquidaciones` y `notificaciones`.
- Rutas de servidor para grupos, integrantes, movimientos, invitaciones y pagos; validación de requests con Zod.
- Cálculo de deudas por movimiento, saldos netos y sugerencias en `lib/ledger.ts`.

## Desarrollo local

1. Crear un proyecto de Supabase.
2. Ejecutar `database/schema.sql` en el editor SQL de Supabase.
3. Ejecutar las migraciones de `supabase/migrations/`.
4. Configurar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env.local`.
5. Ejecutar `npm install` y `npm run dev`; la configuración local usa `http://localhost:5173`.

La clave configurada debe ser la clave pública de Supabase. No colocar una clave `service_role` en el cliente.

## Sistema visual

- Tema claro, fondo blanco y violeta `#594ff4` como color de acción.
- Tipografía Geist.
- Tarjetas con radios amplios y botones principales tipo píldora.
- Iconografía Lucide; movimiento visual mínimo y foco en uso móvil.
