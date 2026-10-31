/**
 * Obtiene la IP real del cliente detrás de Vercel / proxy reverso:
 * 1. Vercel asigna 'x-real-ip' con la IP de conexión TCP verificada del cliente (no falseable).
 * 2. Si no está presente, se extrae el primer valor de 'x-forwarded-for' (la IP original del cliente).
 */
export function getClientIp(headers: Headers): string {
  const realIp = headers.get('x-real-ip');
  const forwardedFor = headers.get('x-forwarded-for');
  const rawIp = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || '127.0.0.1';

  // Sanitización estricta de formato IPv4 / IPv6 para prevenir inyecciones o caracteres espurios
  return rawIp.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || '127.0.0.1';
}
