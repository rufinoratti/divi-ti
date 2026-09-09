# Requerimientos funcionales de Divi

## Contexto

Divi es una PWA académica para que grupos de amigos, parejas, familiares o compañeros de departamento registren gastos compartidos y préstamos puntuales en pesos argentinos. La aplicación calcula el balance de cada integrante para evitar cuentas manuales.

El proyecto se construye por iteraciones. En esta etapa priorizamos un flujo pequeño pero completo y fácil de demostrar.

## Estado de la base funcional

- Registro, inicio de sesión, cierre de sesión y persistencia de sesión con Supabase Auth.
- Creación de un grupo para el usuario autenticado.
- Invitación por enlace y aceptación de integrantes.
- Acceso a grupos, miembros y movimientos protegido por pertenencia y RLS.
- Navegación entre Inicio, Actividad, Balance y Perfil sin recargar la aplicación.

## Iteración actual: gastos compartidos

### Objetivo

Permitir que un integrante registre un gasto en ARS, seleccione quiénes participaron y vea el balance recalculado inmediatamente.

### Requerimientos funcionales

- RF-GAS-01: El usuario autenticado debe poder abrir el formulario “Nuevo movimiento” desde Inicio.
- RF-GAS-02: El formulario debe permitir cargar descripción, importe, categoría y persona que pagó.
- RF-GAS-03: El importe debe aceptar pesos argentinos y ser mayor a cero.
- RF-GAS-04: El usuario debe poder seleccionar y quitar participantes del gasto.
- RF-GAS-05: El sistema debe dividir el gasto en partes iguales entre las personas seleccionadas.
- RF-GAS-06: El sistema debe persistir el movimiento y sus participantes en Supabase.
- RF-GAS-07: El movimiento guardado debe aparecer en Inicio y Actividad sin recargar la aplicación.
- RF-GAS-08: El balance personal y el balance por integrante deben recalcularse al guardar.
- RF-GAS-09: Actividad debe permitir filtrar entre todos, gastos y préstamos.
- RF-GAS-10: El usuario debe poder visualizar los integrantes actuales del grupo.
- RF-GAS-11: El usuario debe poder editar un movimiento existente y modificar sus participantes.

### Reglas de negocio

- Un gasto acredita el importe completo a quien pagó.
- Un gasto debita una parte igual a cada participante seleccionado.
- La persona que pagó puede participar o no del reparto.
- Un préstamo acredita el importe a quien presta y debita el mismo importe a quien recibe.
- Un préstamo requiere una persona receptora distinta de quien presta.
- La suma de los balances del grupo debe ser cero.
- Los importes se muestran únicamente en ARS y las etiquetas se muestran en español.
- No se permiten participantes repetidos ni personas que no pertenezcan al grupo.

### Estados de interfaz

- Carga inicial mientras se recuperan grupo, integrantes y movimientos.
- Estado vacío cuando todavía no existen movimientos.
- Validación inline con mensajes específicos junto al formulario.
- CTA “Guardando movimiento…” mientras se persiste la carga.
- CTA “Actualizando movimiento…” al editar un gasto existente.
- Error de permisos, conexión o validación sin cerrar el formulario.
- Balance e historial actualizados al completar correctamente.

## Criterios de aceptación de la iteración

1. Un usuario autenticado con un grupo puede abrir “Agregar movimiento”.
2. Puede seleccionar sólo parte de los integrantes, por ejemplo dos de tres.
3. Al guardar un gasto de $1.000 entre dos personas, cada participante recibe una parte de $500.
4. Si paga una de esas personas, su balance neto queda acreditado por $500 y la otra persona queda debitada por $500.
5. El gasto queda disponible luego de refrescar la página.
6. Un importe vacío, cero o negativo no se envía al servidor.
7. Si falla la persistencia, el usuario recibe un mensaje propio y puede reintentar.
8. Al editar un gasto existente, sus participantes se cargan previamente y el balance se recalcula al guardar.

## Fuera de alcance por ahora

- Pagos reales y conciliación bancaria.
- Foto de ticket, OCR, gastos recurrentes y recordatorios.
- Reglas de división por porcentajes o importes personalizados.
- Eliminación de movimientos.
- Tiempo real entre varios navegadores.
- Multimoneda y traducciones.

## Próximas iteraciones

1. Eliminar movimientos.
2. Mejorar la administración del grupo e integrantes.
3. Registrar y confirmar pagos para cerrar deudas.
4. Reglas de división configurables.
5. Dashboard y métricas del grupo.
6. Pruebas automatizadas y preparación del deploy académico.
