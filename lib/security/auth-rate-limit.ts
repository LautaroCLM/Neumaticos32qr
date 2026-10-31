import 'server-only';
import { createHash } from 'crypto';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientIp } from './client-ip';

type AuthAttemptKind = 'login' | 'password_reset';

// La tabla de intentos guarda un hash: ni los logs ni la base conservan el email.
function accountKey(email: string): string {
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
}

/**
 * Registra el intento y devuelve si puede continuar. Si el contador no responde se rechaza:
 * sin él, la protección quedaría apagada sin que nadie lo note.
 */
export async function registerAuthAttempt(kind: AuthAttemptKind, email: string): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc('register_auth_attempt', {
    p_kind: kind,
    p_account_key: accountKey(email),
    p_ip: getClientIp(await headers()),
  });

  if (error) {
    console.error('Error al registrar el intento de autenticación:', error.code);
    return false;
  }

  return data?.allowed === true;
}

export async function clearLoginAttempts(email: string): Promise<void> {
  const { error } = await createAdminClient().rpc('clear_login_attempts', {
    p_account_key: accountKey(email),
    p_ip: getClientIp(await headers()),
  });

  if (error) {
    console.error('Error al limpiar los intentos de login:', error.code);
  }
}
