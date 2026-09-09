# Autenticación de Divi

El módulo usa Supabase Auth con sesiones basadas en cookies y validación de requests con Zod.

Cada alta en Supabase Auth crea automáticamente un registro equivalente en `public.perfiles` mediante un trigger de base de datos. El perfil guarda el nombre visible, email y avatar; la contraseña y las credenciales siguen siendo responsabilidad exclusiva de `auth.users`. Para esta versión académica, el registro es inmediato y no requiere confirmar el email.

## Variables de entorno

Copiar `.env.example` como `.env.local` y completar:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-publica
```

La clave debe ser la clave pública/anon. Nunca usar `service_role` en el navegador ni en estas rutas.

## Endpoints

| Método | Ruta | Acceso | Propósito |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | Público | Crea una cuenta con nombre, email y contraseña. |
| `POST` | `/api/auth/login` | Público | Inicia sesión y devuelve la sesión pública de Supabase. |
| `POST` | `/api/auth/logout` | Sesión | Cierra la sesión y limpia las cookies. |
| `GET` | `/api/auth/me` | Sesión | Devuelve el usuario autenticado. |
| `POST` | `/api/auth/forgot-password` | Público | Solicita un email de recuperación. |
| `POST` | `/api/auth/update-password` | Sesión | Actualiza la contraseña después del callback. |
| `GET` | `/auth/callback` | Público | Intercambia el código PKCE por una sesión de recuperación. |

Las respuestas de error mantienen este formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Revisá los datos ingresados.",
    "fields": {
      "email": ["Ingresá un email válido."]
    }
  }
}
```

## Flujo de sesión

1. El formulario llama al endpoint correspondiente.
2. El servidor usa `@supabase/ssr` y escribe las cookies de sesión.
3. El cliente de navegador sincroniza la sesión recibida.
4. `middleware.ts` refresca tokens cuando Supabase lo necesita.
5. Las rutas protegidas validan al usuario con `auth.getUser()` antes de consultar datos.

Para recuperación de contraseña, agregar en Supabase la URL `http://localhost:5173/auth/callback` dentro de las URLs permitidas.
