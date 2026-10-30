import { z } from 'zod';

const isServer = typeof window === 'undefined';

// Determina si estamos en un entorno productivo real (despliegue en Vercel o conexión a Supabase remoto en producción)
const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_ENV);
const isRemoteSupabase =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('127.0.0.1') &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');

const isProductionEnvironment =
  isVercel || (process.env.NODE_ENV === 'production' && isRemoteSupabase);

export const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_URL es requerida.')
    .url('NEXT_PUBLIC_SUPABASE_URL debe ser una URL válida (ej. https://xyz.supabase.co)')
    .refine(
      (url) => {
        if (isProductionEnvironment) {
          return url.startsWith('https://');
        }
        return true;
      },
      {
        message: 'En producción, NEXT_PUBLIC_SUPABASE_URL debe ser HTTPS.',
      }
    ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida y debe ser válida.'),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .min(1, 'NEXT_PUBLIC_SITE_URL es requerida.')
    .url('NEXT_PUBLIC_SITE_URL debe ser una URL válida')
    .refine(
      (url) => {
        if (isProductionEnvironment) {
          return (
            url.startsWith('https://') &&
            !url.includes('localhost') &&
            !url.includes('127.0.0.1')
          );
        }
        return true;
      },
      {
        message:
          'En producción, NEXT_PUBLIC_SITE_URL debe usar HTTPS (https://) y no puede ser localhost ni 127.0.0.1.',
      }
    ),
});

export const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(10, 'SUPABASE_SERVICE_ROLE_KEY es requerida en el servidor.'),
});

/**
 * Valida las variables de entorno en el arranque de la aplicación.
 * Lanza un error detallado si alguna variable es inválida o falta en producción.
 */
export function validateEnv() {
  const currentEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const schema = isServer ? serverEnvSchema : clientEnvSchema;
  const result = schema.safeParse(currentEnv);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((e) => `  - [${e.path.join('.')}]: ${e.message}`)
      .join('\n');

    const errorHeader =
      '\n🚨 ERROR CRÍTICO DE CONFIGURACIÓN DE VARIABLES DE ENTORNO:\n';
    console.error(errorHeader + errorMessages + '\n');
    throw new Error(
      `Fallo de validación en variables de entorno:\n${errorMessages}`
    );
  }

  return result.data;
}

// Ejecutar validación inmediata al importar en el servidor o cliente
export const env = validateEnv();
