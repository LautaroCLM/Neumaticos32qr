import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error('FATAL: adminClient (con service_role) jamás puede ser importado ni ejecutado en el cliente.');
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || serviceRoleKey === 'placeholder') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno del servidor.');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
