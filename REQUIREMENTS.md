# Requerimientos del MVP de Divi

Este documento consolida el alcance del PDF de requerimientos para preparar un piloto con grupos de amigos o compañeros de vivienda. La aplicación usa español y ARS.

## Flujo del movimiento

- Crear gastos desde una frase libre o una foto del ticket. El OCR propone importe y descripción editables; si no puede leerlos, la carga manual sigue disponible.
- Detectar gasto o préstamo desde la frase. Si falta información o hay más de una interpretación, pedir confirmación y no guardar automáticamente.
- Registrar préstamos 1 a 1 desde un atajo.
- Completar la carga en un máximo de dos pasos y medir el tiempo de punta a punta, con objetivo menor a 10 segundos.

## División y balance

- Dividir gastos en partes iguales, por consumo real o proporcionalmente a los ingresos mensuales de las personas participantes.
- En división por consumo, los importes individuales deben sumar el total. La división por ingresos requiere que cada participante tenga un ingreso guardado en su cuenta.
- Mantener los ingresos privados para su titular; el cálculo puede devolver importes de reparto, pero nunca ingresos ajenos.
- Mostrar balances netos por integrante y sugerir el menor número de pagos para grupos de hasta ocho integrantes.
- Las sugerencias son informativas. Los pagos reales siguen asociados a un movimiento y requieren confirmación del destinatario; Divi no transfiere dinero.
- Si el destinatario rechaza un aviso, el aviso conserva estado rechazado para el historial, la deuda sigue pendiente y la persona deudora puede informar un nuevo pago cuando lo realice.

## Grupos, datos y experiencia

- Crear grupos, invitar integrantes y consultar los grupos a los que pertenece una cuenta.
- Actualizar balances al crear o editar movimientos sin recargar la aplicación y sincronizar cambios entre integrantes.
- Funcionar como aplicación web adaptable a teléfonos.
- No guardar fotos de tickets; procesarlas en el dispositivo y descartar el archivo después de la lectura.

## Criterios de aceptación del piloto

- El flujo de foto y el flujo manual permiten corregir importe y descripción y completar la carga si OCR falla.
- Los tres métodos de división producen importes exactos que suman el total, incluidos centavos sobrantes.
- El balance neto de todos los integrantes suma cero y el optimizador produce el menor número de transferencias para grupos de hasta ocho integrantes.
- Las sugerencias no escriben ni alteran liquidaciones, deudas pendientes o confirmadas.
- Rechazar un aviso de pago no reduce el saldo por pagar y permite volver a informar un pago mientras quede deuda disponible.
- Las políticas de base de datos impiden que una cuenta lea o cambie el ingreso de otra.
- El recorrido se completa en dos pasos como máximo y tarda menos de 10 segundos en las pruebas de aceptación.
- Probar el producto con 5 a 8 personas y hacer un piloto de cuatro semanas con un grupo real. Medir tiempo de carga, uso de foto frente a texto, retención semanal y percepción de justicia.

## Fuera de alcance del piloto

- Transferencias de dinero, conciliación bancaria y pagos reales.
- División manual basada en acuerdos libres, ítems del ticket, gastos recurrentes, recordatorios y bot de WhatsApp.
- Grupos con más de ocho integrantes para la sugerencia exacta de pagos.
