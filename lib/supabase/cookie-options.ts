import { env } from '@/lib/env';

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

// La sesión solo se usa desde el servidor: el navegador no necesita leer esta cookie.
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NEXT_PUBLIC_SITE_URL.startsWith('https://'),
  sameSite: 'lax',
  path: '/',
} as const;

/**
 * @supabase/ssr ignora el maxAge de cookieOptions y siempre usa 400 días, así que se fija al
 * escribir la cookie. maxAge 0 significa que la está borrando y se respeta.
 */
export function withSessionMaxAge<T extends { maxAge?: number }>(options: T): T {
  return options.maxAge === 0 ? options : { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
}
