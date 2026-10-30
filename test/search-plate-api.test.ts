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

// 2. Mock seguro de server-only para ejecución directa en tsx/node fuera del bundler
try {
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  Module.prototype.require = function (id: string) {
    if (id === 'server-only') return {};
    return originalRequire.apply(this, arguments);
  };
} catch {}

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createMockRequest(body: any, clientIp: string): NextRequest {
  const url = 'http://localhost:3000/api/search-plate';
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': clientIp,
    },
    body: JSON.stringify(body),
  });
}

async function runSearchPlateApiTests() {
  console.log('================================================================');
  console.log('🧪 TEST SUITE: ENDPOINT /api/search-plate & SEGURIDAD PÚBLICA');
  console.log('================================================================\n');

  const { POST } = await import('../app/api/search-plate/route');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const testIp = `192.168.100.${Math.floor(10 + Math.random() * 200)}`;
  const testPatenteInexistente = `NO${Math.floor(100 + Math.random() * 900)}EX`;

  try {
    // --------------------------------------------------------------------------
    // TEST 1: Patente inexistente
    // --------------------------------------------------------------------------
    console.log('[TEST 1/4] Consultando patente inexistente...');
    const reqNotFound = createMockRequest({ patente: testPatenteInexistente }, testIp);
    const resNotFound = await POST(reqNotFound);
    const dataNotFound = await resNotFound.json();

    if (dataNotFound.success !== false || !dataNotFound.not_found) {
      throw new Error(`Esperado not_found: true, obtenido: ${JSON.stringify(dataNotFound)}`);
    }
    console.log(`✔ PASÓ: Patente inexistente rechazada correctamente con not_found: true ("${dataNotFound.error}").\n`);

    // --------------------------------------------------------------------------
    // TEST 2: Patente existente NUNCA incluye precio ni kilometraje
    // --------------------------------------------------------------------------
    console.log('[TEST 2/4] Verificando que la respuesta pública NUNCA incluya precio ni kilometraje...');
    // Consultamos la Amarok de demostración del seed
    const reqExistente = createMockRequest({ patente: 'AE123CD' }, testIp);
    const resExistente = await POST(reqExistente);
    const dataExistente = await resExistente.json();

    if (!dataExistente.success || !dataExistente.data) {
      throw new Error(`Error consultando patente existente: ${JSON.stringify(dataExistente)}`);
    }

    const payload = dataExistente.data;

    // Aserciones estrictas: NINGÚN campo de precio ni kilometraje del odómetro
    if ('precio' in payload || payload.precio !== undefined) {
      throw new Error('FALLO CRÍTICO DE PRIVACIDAD: El campo "precio" viaja en la respuesta pública.');
    }
    if ('kilometraje' in payload || payload.kilometraje !== undefined) {
      throw new Error('FALLO CRÍTICO DE PRIVACIDAD: El campo "kilometraje" viaja en la respuesta pública.');
    }
    if ('notas_internas' in payload || payload.notas_internas !== undefined) {
      throw new Error('FALLO CRÍTICO: "notas_internas" viaja en la respuesta pública.');
    }
    if ('items' in payload || payload.items !== undefined) {
      throw new Error('FALLO CRÍTICO: "items" viaja en la respuesta pública.');
    }

    console.log('✔ PASÓ: La respuesta pública contiene solo datos autorizados (marca, modelo, fecha último servicio).');
    console.log(`   Datos públicos recibidos: Marca: ${payload.marca}, Modelo: ${payload.modelo}, Fecha: ${payload.fecha_ultimo_servicio}`);
    console.log('   Campos sensibles verificados ausentes: precio = undefined, kilometraje = undefined.\n');

    // --------------------------------------------------------------------------
    // TEST 3: Rate Limiting por Patente (5 fallos en 15 minutos bloquean la patente)
    // --------------------------------------------------------------------------
    console.log('[TEST 3/4] Probando bloqueo por patente tras 5 intentos fallidos...');
    const bruteForcePatente = `BF${Math.floor(100 + Math.random() * 900)}ZZ`;

    // Realizar 5 intentos fallidos con diferentes IPs sobre la misma patente
    for (let i = 1; i <= 5; i++) {
      const distinctIp = `10.0.0.${i + 10}`;
      const req = createMockRequest({ patente: bruteForcePatente }, distinctIp);
      await POST(req);
    }

    // El 6to intento (incluso desde una IP completamente nueva) debe resultar bloqueado por patente
    const req6 = createMockRequest({ patente: bruteForcePatente }, '172.16.0.99');
    const res6 = await POST(req6);
    const data6 = await res6.json();

    if (data6.blocked !== true) {
      throw new Error(`Esperado bloqueo por patente (blocked: true), obtenido: ${JSON.stringify(data6)}`);
    }
    console.log(`✔ PASÓ: Patente bloqueada tras 5 intentos fallidos ("${data6.error}").\n`);

    // --------------------------------------------------------------------------
    // TEST 4: Rate Limiting por IP (20 intentos en 60 segundos bloquean la IP)
    // --------------------------------------------------------------------------
    console.log('[TEST 4/4] Probando bloqueo por IP tras 20 solicitudes en 60 segundos...');
    const spammerIp = `198.51.100.${Math.floor(10 + Math.random() * 200)}`;

    for (let i = 1; i <= 20; i++) {
      const dummyPatente = `AB${Math.floor(100 + Math.random() * 900)}CD`;
      const req = createMockRequest({ patente: dummyPatente }, spammerIp);
      await POST(req);
    }

    // El intento 21 debe ser rechazado inmediatamente por IP
    const reqSpammerBlocked = createMockRequest({ patente: 'AE123CD' }, spammerIp);
    const resSpammerBlocked = await POST(reqSpammerBlocked);
    const dataSpammerBlocked = await resSpammerBlocked.json();

    if (dataSpammerBlocked.blocked !== true) {
      throw new Error(`Esperado bloqueo por IP (blocked: true), obtenido: ${JSON.stringify(dataSpammerBlocked)}`);
    }
    console.log(`✔ PASÓ: IP bloqueada exitosamente por superar límite de ráfaga ("${dataSpammerBlocked.error}").\n`);

    console.log('================================================================');
    console.log('🎉 TODOS LOS TESTS DE /api/search-plate PASARON EXITOSAMENTE');
    console.log('================================================================\n');
  } finally {
    // Limpieza completa de registros en rate_limit_attempts al finalizar la suite
    await adminClient
      .from('rate_limit_attempts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('🧹 Limpieza de rate_limit_attempts completada.');
  }
}

runSearchPlateApiTests().catch((err) => {
  console.error('\n❌ ERROR EN LA SUITE DE /api/search-plate:', err);
  process.exit(1);
});
