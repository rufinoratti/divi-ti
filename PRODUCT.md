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

## Current State (Iteración 1+2 — Implementada)

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
  page.tsx (~350 líneas)
  layout.tsx - Fonts Geist
  api/
    movements/route.ts - GET/POST → Supabase (tabla: movimientos)
    groups/route.ts - GET grupo → Supabase (tabla: grupos)
    members/route.ts - GET miembros → Supabase (tabla: miembros)
components/
  layout/ (9 archivos): Avatar, MovementIcon, MovementItem, MovementList, Field, ProfileRow, AppLoading, Navigation, Header, BalanceCard
  features/ (5 archivos): MovementComposer, BalanceSection, ActivitySection, ProfileSection, QuickActions
hooks/
  useMovements.ts - Estado global, fetches desde Supabase, balances, settlements, Tab type
lib/
  ledger.ts - calculateBalances, calculateSettlements, tipos
  utils.ts - cn(), formatARS()
  supabase.ts - Cliente Supabase
database/
  schema.sql - Schema completo en español (grupos, miembros, movimientos + RLS)
```

### Grupo de demo
- **Nombre**: configurable por el usuario (default: "Grupo")
- **Flujo propuesto**: Crear grupo → nombre → integrantes → cargar movimientos
- **Integrantes default**: Martina (MA), Tomás (TO), Valentina (VA), Nicolás (NI)
- **Miembro actual**: Martina

### Features implementadas
- 4 tabs: Inicio, Actividad, Balance, Perfil
- Registro de gastos grupales (partes iguales) y préstamos 1 a 1
- Cálculo de balances netos y settlements
- Persistencia en Supabase
- Filtro de actividad por tipo
- Validación de formulario inline
- Navegación inferior
- Modal de "Nuevo movimiento"
- Datos de ejemplo (localStorage fallback)
- Grupo configurable por usuario

### Base de datos (Supabase - tablas en español)
- **Tabla `grupos`**: id, nombre, creado_por, creado_en
- **Tabla `miembros`**: id, nombre, iniciales, grupo_id
- **Tabla `movimientos`**: id, tipo ('gasto'/'prestamo'), descripcion, monto, pagado_por, receptor, categoria, participantes, creado_en, grupo_id
- RLS habilitado (lectura/escritura pública para desarrollo)
- Función `calculate_balances()` en PostgreSQL

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

## Out of Scope
- Autenticación de usuarios (usar Supabase Auth)
- Pagos reales
- Foto de ticket / OCR
- Edición/eliminación de movimientos
- Reglas de división avanzadas
- Multimoneda / multilingüe

## Next Iterations (Prioridad)
1. **Ejecutar `database/schema.sql` en Supabase** → crear tablas `grupos`, `miembros`, `movimientos`
2. Configurar `.env.local` con credenciales de Supabase
3. Probar la app con datos reales
4. **Crear flujo de "Nuevo Grupo"** → nombre → agregar miembros
5. Editar/Eliminar movimientos (PUT/DELETE)
6. Toast notifications
7. Reglas de división configurables
8. Autenticación con Supabase Auth
9. Tests
10. Deploy

## Setup para desarrollo
1. Crear proyecto en supabase.com
2. Copiar `database/schema.sql` al SQL Editor de Supabase
3. Crear `.env.local` con las credenciales (URL + anon key)
4. `npm run dev`
5. App en `http://localhost:5173`

## Design System
- Theme: Claro fijo, porcelana #ffffff, Signal Violet #594ff4
- Tipografía: Geist (sustituto de Aeonik)
- Radios: 30px tarjetas, 99px botones píldora
- Iconografía: Lucide monolineal
- Motion: MOTION_INTENSITY: 1 (mínimo)
- Density: VISUAL_DENSITY: 6 (compacta pero legible)
