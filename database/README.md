# Supabase Setup Instructions

## Paso 1: Crear proyecto en Supabase
1. Ve a [supabase.com](https://supabase.com) y crea un proyecto
2. Anota el **Project URL** y **anon public key**

## Paso 2: Configurar variables de entorno
Crea un archivo `.env.local` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://tu-projecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
```

## Paso 3: Ejecutar el schema
1. Ve al **SQL Editor** en el dashboard de Supabase
2. Copia y pega todo el contenido de `database/schema.sql`
3. Haz clic en **Run**

## Paso 4: Verificar
1. Ve a **Table Editor** en Supabase
2. Deberías ver las tablas: `groups`, `members`, `movements`
3. Con datos de ejemplo precargados

## Paso 5: Iniciar la app
```bash
npm run dev
```
La app estará en `http://localhost:5173`
