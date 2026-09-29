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
- Los balances combinan gastos y préstamos; las propuestas de pago reducen la cantidad de transferencias.
- Divi calcula deudas, pero no mueve dinero ni confirma que una deuda fue saldada.

## Funcionalidad ya implementada

- Registro, inicio y cierre de sesión, recuperación y cambio de contraseña mediante Supabase Auth.
- Creación de grupos y asociación de la cuenta creadora con su integrante.
- Invitaciones por email mediante un enlace que la persona invitada acepta al iniciar sesión.
- Varias vistas de grupo: Inicio, Actividad, Balance y Perfil.
- Alta manual de gastos grupales con selección de participantes y préstamos 1 a 1.
- Balance neto por persona, sugerencias para saldar y filtro de actividad.
- Persistencia en Supabase, con acceso protegido por sesión y políticas RLS.
- Selector de grupo para cuentas que participan en más de un grupo; conserva la selección en el dispositivo.
- Creación de grupos adicionales desde el perfil.

Todavía no se pueden cargar ítems del ticket, editar movimientos ni registrar una liquidación como pagada.

## Iteraciones propuestas por el equipo

### Base compartida

- Mantener claros los errores de carga y la actualización de balances.

### Ticket y reparto

- Permitir subir o tomar una foto del ticket.
- Extraer los datos del ticket, empezando por el total y avanzando a sus ítems.
- Calcular automáticamente el reparto entre integrantes y mostrar cuánto corresponde a cada uno.
- Permitir corregir los datos leídos y conservar el flujo manual como alternativa.

### Cierre del MVP

- Completar las acciones necesarias para corregir movimientos y registrar pagos de saldos.
- Preparar datos de demostración, documentación de instalación y una presentación del flujo del producto.
- Definir y ejecutar la validación funcional antes de entregar.

Estas iteraciones son una propuesta de trabajo del equipo y se pueden ajustar al aprender de las pruebas con usuarios.

## Arquitectura actual

- Next.js con React 19, TypeScript y Vinext sobre Vite.
- Tailwind CSS v4, shadcn/ui y componentes propios.
- Supabase Auth y PostgreSQL.
- Esquema de datos en español: `perfiles`, `grupos`, `miembros`, `movimientos`, `movimiento_participantes` e `invitaciones`.
- Rutas de servidor para grupos, integrantes, movimientos e invitaciones; validación de requests con Zod.
- Cálculo de balances y propuestas de pago en `lib/ledger.ts`.

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
