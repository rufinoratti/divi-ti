# Rediseño del frontend de Divi

## Objetivo

Unificar y pulir la experiencia de Divi como PWA móvil, conservando su identidad visual, el violeta de marca, la tipografía y los flujos existentes.

## Cambios realizados

### Primera pasada (sistema y móvil)

- **Sistema visual:** centralización de colores existentes en tokens, jerarquías tipográficas y radios compartidos; mejores estados de foco, toque y movimiento reducido.
- **Inicio y navegación:** resumen del grupo más legible, navegación inferior con indicador de pestaña activa y listas de movimientos y grupos más claras.
- **Balance y pagos:** importes sin elipsis en pantallas estrechas, señales visuales para deudas y créditos, y mejor presentación del historial y avisos de pago.
- **Registro de movimientos:** compositor en hoja inferior adaptada al teléfono, con cabecera y acciones fijas, contenido desplazable y selector de tipo.
- **Perfil y grupos:** mejoras en onboarding, creación y unión a grupos, invitaciones, código para unirse y ajustes del perfil.
- **Cargas y estados vacíos:** skeletons con brillo suave y estructura contextual.
- **PWA móvil:** ajustes de áreas seguras, teclado y controles táctiles para mejorar el uso en teléfonos.
- **Accesibilidad:** etiquetas y estados accesibles, objetivos táctiles cómodos, contraste reforzado en textos pequeños y respeto por `prefers-reduced-motion`.

### Segunda pasada (pulido visual)

Se mantiene la paleta, la tipografía y los flujos. El foco pasa a iconos, movimiento y estados de carga.

- **Tokens:** escala de espacio (`--space-page`, `--space-section`, `--space-card`, `--space-stack`), radios de panel/control y tamaños de icono (`sm` 16 / `md` 20 / `lg` 24).
- **Iconos:** se instala `@phosphor-icons/react` y el wrapper `components/ui/icon.tsx` (`Icon`, `IconWell`, `LoadingIcon`). Las pantallas de layout y features migran a Phosphor; Lucide queda en los primitivos de shadcn. La pestaña activa usa peso `fill`.
- **Lectura del ticket:** al elegir la foto se muestra miniatura; durante el análisis, barrido violeta + texto “Leyendo el total y los productos”, skeletons en descripción e importe; al terminar, la miniatura permanece y el aviso resume lo detectado; si falla, “Reintentar” es la acción clara. El texto de ayuda deja de nombrar OpenRouter.
- **Cargas compartidas:** botones de guardar, crear grupo y calcular reparto usan el mismo `LoadingIcon`.
- **Superficies:** inicio, navegación, listas, balance, perfil, grupos, auth y hojas alineados al mismo sistema de iconos, pozos y radios.
- **Movimiento:** entrada corta al cambiar de pestaña (`divi-enter`); el resto responde a acciones. Se respeta `prefers-reduced-motion` (sin barrido del ticket).

## Alcance

Se conservaron las funciones existentes de movimientos, división de gastos, invitaciones y confirmación de pagos. Los cambios son de presentación, interacción y adaptación móvil. No se agregó modo oscuro.

## Validación

- `oxlint`: sin errores.
- Vista previa en navegador local (`localhost:5173`): login, onboarding, alta, inicio, compositor con lectura de ticket, balance y perfil.
- Dependencia nueva: `@phosphor-icons/react`.
