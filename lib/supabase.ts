import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL no está definida. Verificá el archivo .env.local y reiniciá el servidor con npm run dev.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
