import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

if (typeof window !== 'undefined') {
  throw new Error('FATAL: adminClient (con service_role) jamás puede ser importado ni ejecutado en el cliente.');
}

export function createAdminClient() {
  // lib/env ya validó esta variable en el servidor
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
