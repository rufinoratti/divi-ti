# Configuración de Supabase para Divi

## Paso 1: Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Anota el **Project URL** y **anon public key**

## Paso 2: Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

También podés copiar `.env.example` como base.

## Paso 3: Crear las tablas base
1. Ve al **SQL Editor** en el dashboard de Supabase
2. Copia y pega todo el contenido de `database/schema.sql`
3. Haz clic en **Run**

## Paso 4: Aplicar migraciones pendientes

En un proyecto nuevo creado desde `database/schema.sql`, ejecutá también `supabase/migrations/20260930160051_add_private_income_and_division_methods.sql` para habilitar ingresos privados, métodos de división y sincronización Realtime.

Si el proyecto ya tiene datos, aplicá las migraciones de `supabase/migrations/` que todavía no figuren en su historial, en orden por nombre. No vuelvas a ejecutar migraciones ya aplicadas.

La función de reparto proporcional devuelve solo los importes asignados. Las fotos de tickets se procesan en el navegador y no se guardan en Supabase.

## Paso 5: Configurar Auth
1. En Supabase abrí **Authentication → Providers → Email**.
2. Activá Email/Password.
3. Desactivá **Confirm email** para que el registro sea inmediato en esta versión académica.
4. Si vas a usar recuperación de contraseña, en **URL Configuration** agregá `http://localhost:5173/auth/callback` como URL de redirección.

La aplicación implementa:

- Registro con nombre, email y contraseña.
- Inicio y cierre de sesión.
- Consulta de sesión actual.
- Recuperación y actualización de contraseña.
- Validaciones del request con Zod.
- Sesión SSR mediante cookies y refresh automático.

## Paso 6: Iniciar la app
```bash
npm run dev
```
La app estará en `http://localhost:5173`
