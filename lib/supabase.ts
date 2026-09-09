export { getSupabaseBrowserClient } from './supabase/client';

import { getSupabaseBrowserClient } from './supabase/client';

// Se mantiene este export para los módulos de datos existentes.
// Cuando faltan las variables de entorno, queda en null y la app puede
// mostrar el estado de configuración sin romper el render inicial.
export const supabase = getSupabaseBrowserClient();
