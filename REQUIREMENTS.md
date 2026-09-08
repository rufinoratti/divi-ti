# Requerimientos - Iteración 1

## Objetivo

Construir una demostración móvil de Divi que permita a un grupo registrar gastos compartidos y préstamos individuales, y entender el saldo neto de cada integrante sin cálculos manuales.

## Alcance funcional

- Mostrar un grupo de demostración y sus cuatro integrantes.
- Registrar un gasto grupal por texto, importe, categoría y persona que pagó.
- Dividir cada gasto grupal en partes iguales entre los integrantes del grupo.
- Registrar un préstamo puntual de una persona a otra.
- Recalcular el balance neto de cada integrante luego de cada movimiento.
- Mostrar quién debe pagar a quién para saldar el grupo.
- Listar los movimientos recientes y permitir filtrarlos por tipo.
- Persistir los datos en **Supabase** (PostgreSQL, tablas en español: `grupos`, `miembros`, `movimientos`).
- Navegar entre Inicio, Actividad, Balance y Perfil sin recargar la aplicación.

## Reglas de negocio

- Un gasto grupal acredita el importe completo a quien pagó y debita una parte igual a cada integrante incluido.
- Un préstamo acredita el importe a quien presta y debita el mismo importe a quien lo recibe.
- La suma de todos los balances debe ser cero.
- Los importes se muestran en ARS y las etiquetas se muestran en español.
- Una carga necesita descripción e importe mayor a cero. Un préstamo también necesita una persona receptora distinta a quien presta.

## Estados relevantes

- Carga inicial mientras se restaura el estado desde Supabase.
- Historial vacío cuando no existen movimientos.
- Error de validación inline al intentar guardar una carga incompleta.
- Estado de éxito al volver inmediatamente al balance actualizado tras guardar.

## Fuera de alcance en esta iteración

- Inicio de sesión, invitaciones y datos compartidos en tiempo real.
- Pagos reales y conciliación bancaria.
- Foto de ticket, OCR, gastos recurrentes, recordatorios y reglas de división avanzadas.
- Edición y eliminación de movimientos.

## Próxima iteración técnica

1. Crear flujo de "Nuevo Grupo" → nombre → agregar miembros
2. Editar/Eliminar movimientos (PUT/DELETE)
3. Toast notifications
4. Reglas de división configurables
5. Autenticación con Supabase Auth
6. Tests
7. Deploy
