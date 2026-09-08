import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '.'), 'VITE_');
  return {
    css: { postcss: { plugins: [tailwindcss()] } },
    plugins: [vinext()],
    server: { port: 5173 },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
    },
  };
});
