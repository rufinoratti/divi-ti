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

## Paso 3: Ejecutar el schema
1. Ve al **SQL Editor** en el dashboard de Supabase
2. Copia y pega todo el contenido de `database/schema.sql`
3. Haz clic en **Run**

Si el proyecto de Supabase ya tenía el schema anterior, ejecutá también `supabase/migrations/20260929224821_add_group_join_codes.sql` en el SQL Editor para agregar los códigos reutilizables de grupo.

Para habilitar los avisos de pago con confirmación del destinatario, ejecutá `supabase/migrations/20260929234149_add_payment_confirmation_notifications.sql`, `supabase/migrations/20260929234356_index_settlement_foreign_keys.sql`, `supabase/migrations/20260929234451_preserve_payment_audit_users.sql` y `supabase/migrations/20260929234634_enforce_payment_resolution_audit.sql`.

## Paso 4: Configurar Auth
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

## Paso 5: Iniciar la app
```bash
npm run dev
```
La app estará en `http://localhost:5173`
