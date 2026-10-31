# Rediseño del frontend de Divi

## Objetivo

Unificar y pulir la experiencia de Divi como PWA móvil, conservando su identidad visual, el violeta de marca, la tipografía y los flujos existentes.

## Cambios realizados

- **Sistema visual:** centralización de colores existentes en tokens, jerarquías tipográficas y radios compartidos; mejores estados de foco, toque y movimiento reducido.
- **Inicio y navegación:** resumen del grupo más legible, navegación inferior con indicador de pestaña activa y listas de movimientos y grupos más claras.
- **Balance y pagos:** importes sin elipsis en pantallas estrechas, señales visuales para deudas y créditos, y mejor presentación del historial y avisos de pago.
- **Registro de movimientos:** compositor en hoja inferior adaptada al teléfono, con cabecera y acciones fijas, contenido desplazable, selector de tipo con iconos Lucide y estados de análisis más claros.
- **Perfil y grupos:** mejoras en onboarding, creación y unión a grupos, invitaciones, código para unirse y ajustes del perfil.
- **Cargas y estados vacíos:** skeletons con brillo suave y estructura contextual; mensajes de error, éxito y listas vacías con iconos Lucide.
- **PWA móvil:** ajustes de áreas seguras, teclado y controles táctiles para mejorar el uso en teléfonos.
- **Accesibilidad:** etiquetas y estados accesibles, objetivos táctiles cómodos, contraste reforzado en textos pequeños y respeto por `prefers-reduced-motion`.

## Alcance

Se conservaron las funciones existentes de movimientos, división de gastos, invitaciones y confirmación de pagos. Los cambios son de presentación, interacción y adaptación móvil.

## Validación

- `git diff --check`: sin errores.
- No se ejecutaron pruebas ni compilaciones.
- No se pudo revisar una vista previa en navegador: el entorno no ofreció acceso al navegador y faltan las dependencias `@tailwindcss/vite` y `nitro/vite` para iniciar el servidor local.
