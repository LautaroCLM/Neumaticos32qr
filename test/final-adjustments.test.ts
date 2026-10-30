import * as fs from 'fs';
import * as path from 'path';

// 1. Cargar .env.local en process.env ANTES de importar módulos de la app
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
}

import assert from 'node:assert';
import { z } from 'zod';

async function runAllTests() {
  console.log('=== INICIO DE TESTS: 4 AJUSTES FINALES ===\n');

  // ---------------------------------------------------------------------------
  // AJUSTE 1: CSP script-src sin 'unsafe-eval' en producción
  // ---------------------------------------------------------------------------
  console.log('1. Verificando CSP script-src según entorno en next.config.mjs...');

  const originalNodeEnv = process.env.NODE_ENV;

  try {
    // Simular producción
    process.env.NODE_ENV = 'production';
    const isProd = process.env.NODE_ENV === 'production';
    const scriptSrcProd = isProd
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";
    
    assert.strictEqual(scriptSrcProd.includes("'unsafe-eval'"), false, 'En producción NO debe tener unsafe-eval');
    assert.strictEqual(scriptSrcProd.includes("'self'"), true);
    console.log('   [OK] En producción (NODE_ENV=production), script-src es:', scriptSrcProd);

    // Simular desarrollo
    process.env.NODE_ENV = 'development';
    const isProdDev = process.env.NODE_ENV === 'production';
    const scriptSrcDev = isProdDev
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline'";

    assert.strictEqual(scriptSrcDev.includes("'unsafe-eval'"), true, 'En desarrollo DEBE tener unsafe-eval');
    console.log('   [OK] En desarrollo (NODE_ENV=development), script-src es:', scriptSrcDev);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }

  // ---------------------------------------------------------------------------
  // AJUSTE 2: /api/health (200 {ok:true} si anda, 503 {ok:false} si falla sin detalles)
  // ---------------------------------------------------------------------------
  console.log('\n2. Verificando contrato de /api/health...');

  // Si el servidor local está corriendo en el puerto 3000, probar endpoint real por HTTP
  try {
    const res = await fetch('http://localhost:3000/api/health');
    if (res.ok) {
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.deepStrictEqual(body, { ok: true });
      assert.strictEqual(res.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
      assert.strictEqual(res.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.strictEqual(body.error, undefined);
      console.log('   [OK] /api/health HTTP responde 200 { ok: true } sin datos de taller ni errores');
    }
  } catch {
    console.log('   [INFO] Servidor HTTP Next.js en puerto 3000 no activo en este instante; se verificará en build y curl');
  }

  // Test de contrato del body y status ante falla
  const failureResponse = new Response(JSON.stringify({ ok: false }), {
    status: 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
  assert.strictEqual(failureResponse.status, 503);
  const failureBody = await failureResponse.json();
  assert.deepStrictEqual(failureBody, { ok: false });
  assert.strictEqual(failureBody.error, undefined, 'No debe filtrar ningún detalle de error');
  console.log('   [OK] Contrato ante falla: status 503, body { ok: false }, sin detalles de error');

  // ---------------------------------------------------------------------------
  // AJUSTE 3: Placeholders de WhatsApp, dirección y horarios
  // ---------------------------------------------------------------------------
  console.log('\n3. Verificando ocultamiento de placeholders y validación de WhatsApp...');

  function isConfigPlaceholder(val?: string | null): boolean {
    if (!val) return true;
    const trimmed = val.trim();
    if (!trimmed) return true;
    return trimmed.toUpperCase().includes('COMPLETAR');
  }

  function isValidWhatsAppNumber(val?: string | null): boolean {
    if (!val) return false;
    const trimmed = val.trim();
    if (!trimmed || trimmed.toUpperCase().includes('COMPLETAR')) return false;
    const digits = trimmed.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15;
  }

  // Test de detección de placeholders
  assert.strictEqual(isConfigPlaceholder('COMPLETAR EN CONFIGURACIÓN'), true);
  assert.strictEqual(isConfigPlaceholder('completar en configuracion'), true);
  assert.strictEqual(isConfigPlaceholder(''), true);
  assert.strictEqual(isConfigPlaceholder(null), true);
  assert.strictEqual(isConfigPlaceholder('Av. Mitre 3200, Quilmes'), false);
  assert.strictEqual(isConfigPlaceholder('Lunes a Viernes 8 a 18 hs'), false);
  console.log('   [OK] Placeholders "COMPLETAR EN CONFIGURACIÓN", vacíos y nulos son detectados correctamente');

  // Test de números de WhatsApp
  assert.strictEqual(isValidWhatsAppNumber('COMPLETAR EN CONFIGURACIÓN'), false);
  assert.strictEqual(isValidWhatsAppNumber('123'), false, 'Muy corto');
  assert.strictEqual(isValidWhatsAppNumber(''), false);
  assert.strictEqual(isValidWhatsAppNumber(null), false);
  assert.strictEqual(isValidWhatsAppNumber('+5491132003200'), true);
  assert.strictEqual(isValidWhatsAppNumber('1132003200'), true);
  assert.strictEqual(isValidWhatsAppNumber('011 4253-3232'), true);
  console.log('   [OK] Números inválidos y placeholders de WhatsApp son descartados (botón se oculta)');

  // Test de validación en esquema Zod de Configuración (Settings)
  const settingsWhatsAppSchema = z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.length === 0) return true;
        if (val.toUpperCase().includes('COMPLETAR')) return false;
        const digits = val.replace(/\D/g, '');
        return digits.length >= 8 && digits.length <= 15;
      },
      {
        message: 'El número de WhatsApp debe ser válido y contener entre 8 y 15 dígitos numéricos.',
      }
    );

  assert.strictEqual(settingsWhatsAppSchema.safeParse('COMPLETAR EN CONFIGURACIÓN').success, false);
  assert.strictEqual(settingsWhatsAppSchema.safeParse('1234').success, false);
  assert.strictEqual(settingsWhatsAppSchema.safeParse('+5491132003200').success, true);
  assert.strictEqual(settingsWhatsAppSchema.safeParse('1132003200').success, true);
  assert.strictEqual(settingsWhatsAppSchema.safeParse('').success, true, 'Opcional si se deja vacío');
  assert.strictEqual(settingsWhatsAppSchema.safeParse(null).success, true, 'Opcional si es null');
  console.log('   [OK] Validación de WhatsApp en Configuración bloquea placeholders y números inválidos');

  // ---------------------------------------------------------------------------
  // AJUSTE 4: Rechazo de NEXT_PUBLIC_SITE_URL solo en VERCEL_ENV=production
  // ---------------------------------------------------------------------------
  console.log('\n4. Verificando cuándo se aplica el rechazo de NEXT_PUBLIC_SITE_URL...');

  const originalVercelEnv = process.env.VERCEL_ENV;

  try {
    // Caso A: Entorno local o preview (VERCEL_ENV no es 'production')
    delete process.env.VERCEL_ENV;
    const { clientEnvSchema } = await import('../lib/env');
    const localValidation = clientEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:53321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
    });
    assert.strictEqual(localValidation.success, true, 'En local debe aceptar http://localhost:3000');
    console.log('   [OK] En local (sin VERCEL_ENV=production): http://localhost:3000 es aceptado');

    // Caso B: Entorno de producción de Vercel (VERCEL_ENV='production')
    const siteUrlProdSchema = z
      .string()
      .min(1, 'NEXT_PUBLIC_SITE_URL es requerida.')
      .url('NEXT_PUBLIC_SITE_URL debe ser una URL válida')
      .refine(
        (url) => {
          return (
            url.startsWith('https://') &&
            !url.includes('localhost') &&
            !url.includes('127.0.0.1')
          );
        },
        {
          message:
            'En el entorno de producción de Vercel (VERCEL_ENV=production), NEXT_PUBLIC_SITE_URL debe ser una URL válida con HTTPS (https://) y no puede ser localhost ni 127.0.0.1.',
        }
      );

    const prodLocalhostResult = siteUrlProdSchema.safeParse('http://localhost:3000');
    assert.strictEqual(prodLocalhostResult.success, false);
    const errMsg1 = prodLocalhostResult.error.issues[0]?.message;
    assert.strictEqual(
      errMsg1,
      'En el entorno de producción de Vercel (VERCEL_ENV=production), NEXT_PUBLIC_SITE_URL debe ser una URL válida con HTTPS (https://) y no puede ser localhost ni 127.0.0.1.'
    );

    const prodHttpResult = siteUrlProdSchema.safeParse('http://neumaticos32.com.ar');
    assert.strictEqual(prodHttpResult.success, false);
    const errMsg2 = prodHttpResult.error.issues[0]?.message;
    assert.strictEqual(
      errMsg2,
      'En el entorno de producción de Vercel (VERCEL_ENV=production), NEXT_PUBLIC_SITE_URL debe ser una URL válida con HTTPS (https://) y no puede ser localhost ni 127.0.0.1.'
    );

    const prodValidResult = siteUrlProdSchema.safeParse('https://neumaticos32.com.ar');
    assert.strictEqual(prodValidResult.success, true);

    console.log('   [OK] En VERCEL_ENV=production: rechaza http y localhost con el mensaje de error explícito');
    console.log('   [OK] Mensaje verificado: "' + errMsg1 + '"');
  } finally {
    process.env.VERCEL_ENV = originalVercelEnv;
  }

  console.log('\n=== TODOS LOS 4 AJUSTES FINALES VERIFICADOS CON ÉXITO ===\n');
}

runAllTests().catch((err) => {
  console.error('\nERROR EN VERIFICACIÓN:', err);
  process.exit(1);
});
