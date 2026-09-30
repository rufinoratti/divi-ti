# Roadmap de Divi hacia el piloto MVP

Este roadmap toma el PDF de requisitos como alcance del piloto. El código de esta rama incorpora los cambios funcionales y las pruebas unitarias y de privacidad descritas abajo. La migración de ingresos privados y divisiones ya se aplicó desde el SQL Editor de Supabase. El piloto queda condicionado a completar la validación de flujos con navegador, móvil y participantes reales.

## Estado por etapa

| Etapa | Estado | Resultado |
|---|---|---|
| 1. Carga rápida | Implementada; falta validar en móviles | OCR de foto en el navegador, interpretación heurística de frases, corrección manual y atajo de préstamo. No se guarda la foto ni se registra un borrador automáticamente. Falta comprobar el recorrido real en iOS/Android y medir el tiempo. |
| 2. División y privacidad | Implementada; migración aplicada | División igual, por consumo o por ingresos; ingreso privado por RLS y RPC que devuelve partes calculadas. La migración se aplicó desde el SQL Editor y las columnas y funciones principales están en el esquema. La consulta pgTAP reportó `ok 7` para la lectura cruzada. La aplicación manual no aparece en el historial de migraciones de CLI; no volver a ejecutar ese SQL y reconciliar el historial antes de desplegar futuras migraciones con CLI. |
| 3. Balance y pagos | Implementada; falta validar con usuarios | Balance neto y sugerencia exacta con hasta ocho integrantes. La propuesta no escribe pagos; la edición de un movimiento con pagos pendientes o confirmados queda bloqueada. Falta verificar sincronización entre dos sesiones y el flujo completo en un entorno de prueba aislado. |
| 4. Verificación técnica | En curso | Verificación local repetida: 26 pruebas, lint, TypeScript y build pasan. El build muestra una advertencia no bloqueante por la convención `middleware`. La suite pgTAP tiene siete aserciones y la última reportada pasó; falta conservar/verificar la salida completa, probar el navegador en staging y medir tiempos. |
| 5. Piloto con personas | Pendiente | Usabilidad con 5–8 personas y piloto de cuatro semanas con métricas de carga, uso de foto/texto, retención semanal y percepción de justicia. |

## Pasos para habilitar el piloto

1. La migración `20260930160051_add_private_income_and_division_methods.sql` ya se aplicó desde el SQL Editor del proyecto Divi. No volver a ejecutarla allí. Antes de desplegar migraciones posteriores con Supabase CLI, reconciliar que esa aplicación manual no está registrada en el historial; no ejecutar `database/schema.sql` sobre una base con datos existentes.
2. Verificación local completada el 2026-09-30: `npm test` (26 pruebas), `npm run lint`, `npx tsc --noEmit --incremental false` y `npm run build` pasan. El build conserva una advertencia sobre la convención `middleware` que no bloquea la compilación.
3. La última aserción pgTAP reportada fue `ok 7`. Conservar la salida completa de las siete aserciones y ejecutar la suite en una base de prueba aislada con el esquema aplicado; no apuntarla a producción.
4. Recorrer en un entorno de staging o con datos desechables en Safari iOS y Chrome Android: foto legible e ilegible, carga manual, texto ambiguo, gasto por consumo, ingresos faltantes, gasto por ingresos, centavos sobrantes, edición con y sin pagos, y sincronización entre dos sesiones. La sesión de navegador disponible usa datos persistidos; no hacer escrituras desde ella.
5. Medir desde que se abre la carga hasta que se guarda un movimiento completo. Criterios de salida: máximo dos pasos y menos de diez segundos en tareas representativas; importes corregibles; fallback manual funcional; ningún ingreso ajeno visible.
6. Hacer pruebas moderadas con 5–8 personas. Corregir bloqueos antes de abrir el piloto.
7. Ejecutar un piloto de cuatro semanas con un grupo real y registrar semanalmente: duración de carga, porcentaje de foto frente a texto/manual, actividad y retención, errores de división, uso de sugerencias y percepción de justicia.

## Definición de terminado

- Los tres métodos de división producen partes positivas que suman exactamente el total en centavos.
- Los saldos netos suman cero y el optimizador minimiza el número de transferencias para grupos de hasta ocho personas.
- Solo se puede leer y editar el ingreso propio; la respuesta de la división contiene importes por integrante y no ingresos.
- Confirmar la sugerencia no crea liquidaciones; informar y confirmar pagos continúa requiriendo el movimiento de origen y la aceptación del destinatario.
- El flujo móvil admite corregir OCR y continuar manualmente cuando falla la lectura.
- Las pruebas de navegador, privacidad y duración pasan en el entorno de staging antes de invitar al grupo piloto.
