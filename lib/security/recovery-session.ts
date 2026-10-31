import type { SupabaseClient } from '@supabase/supabase-js';

const RECOVERY_SESSION_MAX_AGE_SECONDS = 15 * 60;

/**
 * Indica si la sesión actual se abrió hace poco con un enlace de recuperación. Sin esta
 * comprobación, cualquiera con una sesión abierta podría cambiar la contraseña sin conocerla.
 */
export async function isRecentRecoverySession(supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return false;

  // amr también puede traer textos sueltos, sin fecha: esos no sirven para validar la antigüedad
  const recovery = data.claims.amr?.find(
    (entry) => typeof entry !== 'string' && entry.method === 'recovery'
  );
  if (!recovery || typeof recovery === 'string') return false;

  return Date.now() / 1000 - recovery.timestamp <= RECOVERY_SESSION_MAX_AGE_SECONDS;
}
