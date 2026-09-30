# Divi — producto y alcance del MVP

## Propósito

Divi ayuda a amigos, parejas, familias y compañeros de vivienda a ordenar gastos compartidos. Cada persona puede registrar lo que pagó y consultar el saldo del grupo sin llevar cuentas en un chat o una planilla.

La idea de innovación del equipo es permitir que alguien suba una foto del ticket, Divi lea sus datos y calcule automáticamente el reparto entre integrantes. Primero se consolida el registro manual de gastos, grupos y balances; el escaneo del ticket corresponde a una iteración posterior.

## Usuarios y contexto

Se usa principalmente desde el teléfono después de una cena, una compra grupal, un viaje o un gasto de la casa.

Flujo principal: crear o aceptar una invitación a un grupo → registrar un gasto → revisar el balance → saber quién paga a quién.

La interfaz es web adaptable a móviles y cuenta con un manifiesto PWA. El uso sin conexión todavía no está implementado.

## Reglas del producto

- La moneda de esta versión es el peso argentino (ARS).
- Un gasto grupal acredita lo que pagó una persona y reparte el costo entre quienes participan.
- Un gasto se divide en partes iguales entre las personas seleccionadas; al empezar vienen seleccionados todos los integrantes.
- El reparto asigna los centavos sobrantes de forma determinística para que las partes sumen el total.
- Un préstamo es entre dos integrantes: quien presta queda a favor y quien recibe queda debiendo.
- Cada gasto o préstamo deja una deuda vinculada a ese movimiento y a las personas involucradas; las deudas de distintos movimientos no se compensan.
- Divi no mueve dinero: quien debe puede elegir a quién pagar y cuánto, y la otra persona confirma o rechaza el aviso desde sus notificaciones.
- Cada pago informado queda vinculado a un gasto o préstamo, y no reduce esa deuda hasta que quien lo recibe confirma.

## Funcionalidad ya implementada

- Registro, inicio y cierre de sesión, recuperación y cambio de contraseña mediante Supabase Auth.
- Creación de grupos y asociación de la cuenta creadora con su integrante.
- Invitaciones por email mediante un enlace que la persona invitada acepta al iniciar sesión.
- Varias vistas de grupo: Inicio, Actividad, Balance y Perfil.
- Alta manual de gastos grupales con selección de participantes y préstamos 1 a 1.
- Deudas detalladas por gasto y persona, con montos pendientes de confirmación.
- Persistencia en Supabase, con acceso protegido por sesión y políticas RLS.
- Selector de grupo para cuentas que participan en más de un grupo; conserva la selección en el dispositivo.
- Vista general de todos los grupos, con actividad conjunta, balances separados por grupo y perfil de cuenta.
- Creación de grupos adicionales desde el perfil.
- Avisos de pago entre integrantes, con confirmación o rechazo, notificaciones en la app e historial trazable.

Todavía no se pueden cargar ítems del ticket ni editar movimientos.

## Iteraciones propuestas por el equipo

### Base compartida

- Mantener claros los errores de carga y la actualización de balances.

### Ticket y reparto

- Permitir subir o tomar una foto del ticket.
- Extraer los datos del ticket, empezando por el total y avanzando a sus ítems.
- Calcular automáticamente el reparto entre integrantes y mostrar cuánto corresponde a cada uno.
- Permitir corregir los datos leídos y conservar el flujo manual como alternativa.

### Cierre del MVP

- Completar las acciones necesarias para corregir movimientos.
- Preparar datos de demostración, documentación de instalación y una presentación del flujo del producto.
- Definir y ejecutar la validación funcional antes de entregar.

Estas iteraciones son una propuesta de trabajo del equipo y se pueden ajustar al aprender de las pruebas con usuarios.

## Arquitectura actual

- Next.js con React 19, TypeScript y Vinext sobre Vite.
- Tailwind CSS v4, shadcn/ui y componentes propios.
- Supabase Auth y PostgreSQL.
- Esquema de datos en español: `perfiles`, `grupos`, `miembros`, `movimientos`, `movimiento_participantes`, `invitaciones`, `liquidaciones` y `notificaciones`.
- Rutas de servidor para grupos, integrantes, movimientos, invitaciones y pagos; validación de requests con Zod.
- Cálculo de deudas y pagos pendientes por movimiento en `lib/ledger.ts`.

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
