import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof import.meta !== 'undefined' 
  ? String((import.meta as any).env?.VITE_SUPABASE_URL ?? '') 
  : '';
const supabaseAnonKey = typeof import.meta !== 'undefined'
  ? String((import.meta as any).env?.VITE_SUPABASE_ANON_KEY ?? '')
  : '';

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL no está definida. Verificá el archivo .env.local y reiniciá el servidor con npm run dev.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
