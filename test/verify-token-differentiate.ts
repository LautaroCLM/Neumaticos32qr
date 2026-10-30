import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const env: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const l of lines) {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function verifyTokenBehavior() {
  const env = loadEnv();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
    console.error('⛔ ABORTADO POR SEGURIDAD: Solo local.');
    process.exit(1);
  }

  const anonClient = createClient(supabaseUrl, anonKey);
  const adminClient = createClient(supabaseUrl, serviceKey);

  console.log('--- VERIFICACIÓN REAL DE get_vehicle_by_token ---');

  // 1. Enlace Inexistente
  const { data: resInexistente } = await anonClient.rpc('get_vehicle_by_token', {
    p_token: '000000000000000000000000000000000000000000000000',
  });
  console.log('1. Token inexistente:', resInexistente);
  if (resInexistente?.error !== 'El enlace del vehículo no existe.') {
    throw new Error(`FALLÓ: Mensaje inesperado para token inexistente: ${resInexistente?.error}`);
  }
  console.log('   ✅ Mensaje exacto verificado: "El enlace del vehículo no existe."');

  // 2. Crear vehículo de prueba y servicio con toggles apagados
  const { data: vTest } = await adminClient
    .from('vehicles')
    .insert({
      shop_id: '00000000-0000-0000-0000-000000000001',
      patente: 'TT123TT',
      marca: 'TestMarca',
      modelo: 'TestModelo',
    })
    .select('id, public_token')
    .single();

  const tokenValido = vTest!.public_token;

  await adminClient.from('services').insert({
    vehicle_id: vTest!.id,
    shop_id: '00000000-0000-0000-0000-000000000001',
    kilometraje: 45000,
    tipo: 'neumaticos',
    descripcion: 'Cambio con notas secretas',
    notas_internas: 'SECRETO_CONFIDENCIAL_TALLER_123',
    notas_cliente: 'Nota visible para cliente',
    visibilidad: {
      mostrar_km: false,
      mostrar_precio: false,
      mostrar_notas: true,
    },
    precio: 100000,
  });

  // Consultar como anónimo
  const { data: resValido } = await anonClient.rpc('get_vehicle_by_token', {
    p_token: tokenValido,
  });

  const srv = resValido.services[0];
  console.log('2. Datos retornados para servicio con toggle apagado y notas internas:');
  console.log('   - kilometraje:', srv.kilometraje, '(debe ser null/undefined)');
  console.log('   - precio:', srv.precio, '(debe ser null/undefined)');
  console.log('   - notas_internas:', srv.notas_internas, '(debe ser undefined)');
  console.log('   - notas_cliente:', srv.notas_cliente, '(debe ser visible)');

  if (srv.kilometraje !== null && srv.kilometraje !== undefined) {
    throw new Error('FALLÓ: kilometraje viajó a pesar del toggle mostrar_km=false');
  }
  if (srv.precio !== null && srv.precio !== undefined) {
    throw new Error('FALLÓ: precio viajó a pesar del toggle mostrar_precio=false');
  }
  if (srv.notas_internas !== undefined) {
    throw new Error('FALLÓ: notas_internas viajó en la respuesta pública!');
  }
  console.log('   ✅ Purga estricta verificada al 100%');

  // 3. Revocar el token
  const authUserClient = createClient(supabaseUrl, anonKey);
  await authUserClient.auth.signInWithPassword({
    email: 'admin@taller32.local',
    password: process.env.LOCAL_ADMIN_PASSWORD || 'Taller32Admin!',
  });
  await authUserClient.rpc('revoke_vehicle_token', { p_vehicle_id: vTest!.id });

  // Consultar con el token revocado
  const { data: resRevocado } = await anonClient.rpc('get_vehicle_by_token', {
    p_token: tokenValido,
  });
  console.log('3. Token revocado:', resRevocado);
  if (resRevocado?.error !== 'El enlace del vehículo ha sido revocado por el taller.') {
    throw new Error(`FALLÓ: Mensaje inesperado para token revocado: ${resRevocado?.error}`);
  }
  console.log('   ✅ Mensaje exacto verificado: "El enlace del vehículo ha sido revocado por el taller."');

  // Limpieza
  await adminClient.from('services').delete().eq('vehicle_id', vTest!.id);
  await adminClient.from('vehicles').delete().eq('id', vTest!.id);
  console.log('✨ Todas las verificaciones de get_vehicle_by_token pasaron.');
}

verifyTokenBehavior().catch((e) => {
  console.error(e);
  process.exit(1);
});
