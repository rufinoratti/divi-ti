# Product

## Platform
web (PWA)

## Users
Grupos de amigos, parejas, compañeros de departamento y familiares que comparten gastos de manera informal.

## Product Purpose
Divi es una PWA para registrar gastos compartidos y préstamos puntuales entre personas, calcular un balance neto claro y reducir la incomodidad de reclamar dinero. Proyecto universitario iterativo.

## Positioning
Combina en un único balance los gastos grupales y los préstamos 1 a 1, con reglas de división configurables.

## Operating Context
Se usa desde el teléfono después de salidas, compras grupales, cumpleaños. Flujo: crear grupo → agregar integrantes → cargar gasto/préstamo → entender balance.

## Current State (Iteración 3 — En construcción)

### Stack técnico
- Framework: Next.js + React 19 + TypeScript (Vite + Vinext para RSC)
- Styling: Tailwind CSS v4 con CSS custom properties
- UI: shadcn/ui (base-nova) + componentes propios
- Icons: Lucide React
- **Database: Supabase (PostgreSQL)** — tablas en español
- Persistencia: Supabase
- Linting: oxlint + oxfmt

### Arquitectura
```
app/
  page.tsx - Shell de la aplicación y navegación
  layout.tsx - Fonts Geist
  api/
    movements/route.ts - GET/POST → Supabase
    groups/route.ts - GET/POST → Supabase
    members/route.ts - GET/POST → Supabase
    invitations/ - Crear y aceptar invitaciones
components/
  layout/ - Componentes visuales y navegación
  features/ - Formularios, balances, actividad, perfil e invitaciones
hooks/
  useAuth.ts - Sesión y perfil autenticado
  useMovements.ts - Movimientos, grupo, integrantes, balances y settlements
lib/
  ledger.ts - Cálculos monetarios exactos y settlements
  utils.ts - cn(), formatARS()
  supabase/ - Clientes para browser y server
database/
  schema.sql - Schema completo en español con RLS
supabase/migrations/
  - Migraciones aplicadas al proyecto remoto
```

### Flujo actual
- Registro o inicio de sesión → creación del primer grupo → invitación por enlace → carga de movimientos.
- El grupo activo se obtiene desde Supabase y sus integrantes se usan en el reparto.
- La aplicación está limitada a español y pesos argentinos (ARS).

### Features implementadas
- 4 tabs: Inicio, Actividad, Balance, Perfil
- Registro de gastos grupales (partes iguales) y préstamos 1 a 1
- Selección explícita de participantes para cada gasto
- Edición de movimientos existentes y sus participantes
- Cálculo de balances netos y settlements
- Persistencia en Supabase
- Filtro de actividad por tipo
- Validación de formulario inline y errores de API contextualizados
- Estado de guardado en el CTA del formulario
- Navegación inferior
- Modal de "Nuevo movimiento"
- Creación del primer grupo
- Invitaciones por enlace y listado de integrantes

### Base de datos (Supabase - tablas en español)
- **Tabla `grupos`**: id, nombre, creado_por, creado_en
- **Tabla `miembros`**: id, nombre, iniciales, grupo_id, usuario_id, invitacion_id
- **Tabla `movimientos`**: id, tipo ('gasto'/'prestamo'), descripcion, monto, pagado_por, receptor, categoria, creado_en, grupo_id
- **Tabla `movimiento_participantes`**: movimiento_id, grupo_id, miembro_id, monto_parte
- **Tabla `invitaciones`**: grupo_id, email, token, estado, creador y aceptación
- RLS habilitado con acceso por pertenencia al grupo
- El reparto se guarda en centavos para conservar la suma exacta

### Dev Server
- `vinext dev` funciona sin Cloudflare plugin
- TypeScript: ✅ Sin errores
- Oxlint: ✅ Sin errores en código de aplicación
- API routes conectan directamente a Supabase

### Reglas de negocio
- Gasto grupal: acredita al pagador, debita parte igual a todos
- Préstamo: acredita al pagador, debita al receptor
- Suma de balances = 0
- Validación inline: descripción, importe > 0, receptor ≠ pagador
- Formatos: ARS, español

## Out of Scope actual
- Pagos reales
- Foto de ticket / OCR
- Eliminación de movimientos
- Reglas de división avanzadas
- Multimoneda / multilingüe
- Tiempo real entre varios navegadores

## Next Iterations (Prioridad)
1. Eliminar movimientos.
2. Mejorar administración del grupo e integrantes.
3. Registrar y confirmar pagos para cerrar deudas.
4. Reglas de división configurables.
5. Dashboard y métricas del grupo.
6. Pruebas automatizadas y deploy académico.

## Setup para desarrollo
1. Crear o seleccionar el proyecto en Supabase.
2. Crear `.env.local` a partir de `.env.example` con la URL y la clave pública.
3. Aplicar las migraciones pendientes de `supabase/migrations/`.
4. `npm run dev`
5. Abrir `http://localhost:5173`

## Design System
- Theme: Claro fijo, porcelana #ffffff, Signal Violet #594ff4
- Tipografía: Geist (sustituto de Aeonik)
- Radios: 30px tarjetas, 99px botones píldora
- Iconografía: Lucide monolineal
- Motion: MOTION_INTENSITY: 1 (mínimo)
- Density: VISUAL_DENSITY: 6 (compacta pero legible)
