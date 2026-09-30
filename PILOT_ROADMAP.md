# Roadmap de Divi hacia el piloto MVP

Este roadmap toma el PDF de requisitos como alcance del piloto. El código de esta rama incorpora los cambios funcionales y las pruebas unitarias y de privacidad descritas abajo. El piloto queda condicionado a completar la validación con navegador y participantes reales, y a reconciliar el historial de migraciones de Supabase.

## Estado por etapa

| Etapa | Estado | Resultado |
|---|---|---|
| 1. Carga rápida | Implementada; falta validar en móviles | OCR de foto en el navegador, interpretación heurística de frases, corrección manual y atajo de préstamo. No se guarda la foto ni se registra un borrador automáticamente. Falta comprobar el recorrido real en iOS/Android y medir el tiempo. |
| 2. División y privacidad | Implementada; esquema remoto presente | División igual, por consumo o por ingresos; ingreso privado por RLS y RPC que devuelve partes calculadas. La consulta pgTAP reportó `ok 7` para la lectura cruzada. La migración no aparece en el historial remoto aunque sus columnas y funciones principales sí están en el esquema; reconciliarlo antes de volver a aplicar migraciones. |
| 3. Balance y pagos | Implementada; falta validar con usuarios | Balance neto y sugerencia exacta con hasta ocho integrantes. La propuesta no escribe pagos; la edición de un movimiento con pagos pendientes o confirmados queda bloqueada. Falta verificar sincronización entre dos sesiones y el flujo completo en navegador. |
| 4. Verificación técnica | En curso | Las pruebas locales, lint, TypeScript y build pasaron en una ejecución previa. La suite pgTAP contiene siete aserciones y la última reportada pasó; falta conservar/verificar la salida completa, completar el recorrido móvil y medir tiempos. |
| 5. Piloto con personas | Pendiente | Usabilidad con 5–8 personas y piloto de cuatro semanas con métricas de carga, uso de foto/texto, retención semanal y percepción de justicia. |

## Pasos para habilitar el piloto

1. Reconciliar el historial de Supabase: la base Divi ya contiene las columnas y funciones principales de `20260930160051_add_private_income_and_division_methods.sql`, pero esa versión no figura en el historial remoto. Verificar todos los objetos de la migración y registrar el estado aplicado; no volver a ejecutar el SQL a ciegas ni ejecutar `database/schema.sql` sobre una base con datos existentes.
2. Ejecutar `npm test`, `npm run lint`, `npx tsc --noEmit --incremental false` y `npm run build` en CI o en un equipo con las variables de entorno de la aplicación.
3. Ejecutar `supabase test db --db-url "$DIVI_TEST_DATABASE_URL"` contra una base de prueba aislada que ya tenga el esquema y las migraciones aplicados. La prueba usa una transacción y hace rollback; no apuntarla a producción.
4. Recorrer en Safari iOS y Chrome Android: foto legible e ilegible, carga manual, texto ambiguo, gasto por consumo, ingresos faltantes, gasto por ingresos, centavos sobrantes, edición con y sin pagos, y sincronización entre dos sesiones.
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
