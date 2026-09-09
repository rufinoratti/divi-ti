const viteEnv = import.meta.env;
const processEnv = typeof process !== 'undefined' ? process.env : {};

function readEnv(...names: string[]) {
  for (const name of names) {
    const value = viteEnv[name] ?? processEnv[name];
    if (value) return value;
  }

  return '';
}

export const supabaseUrl = readEnv('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
export const supabasePublishableKey = readEnv(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
);

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export function getSupabaseConfigError() {
  return new Error(
    'Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.',
  );
}
