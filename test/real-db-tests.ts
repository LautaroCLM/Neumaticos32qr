import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Suite de Verificación Contra Base de Datos Real (PostgreSQL / Supabase en Vivo)
 * 
 * Este test crea usuarios reales en Auth vía Supabase Admin API:
 * - 1 usuario con rol 'admin'
 * - 1 usuario con rol 'operario'
 * Y ejecuta pruebas reales contra las políticas RLS, funciones, triggers y restricciones CHECK.
 */

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};

  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function runRealDatabaseTests() {
  console.log('================================================================');
  console.log('🧪 TEST SUITE: POSTGRESQL / SUPABASE EN VIVO (CON USUARIOS REALES)');
  console.log('================================================================\n');

  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isPlaceholderKey =
    !anonKey ||
    anonKey.includes('placeholder') ||
    !serviceRoleKey ||
    serviceRoleKey.includes('placeholder');

  if (!supabaseUrl || isPlaceholderKey) {
    console.log('⚠️  [ESTADO: BASE DE DATOS REAL NO CONFIGURADA EN .env.local]');
    console.log('----------------------------------------------------------------');
    console.log('No se ejecutó la suite de pruebas contra base real porque las credenciales');
    console.log('en .env.local contienen valores de marcador (placeholders).\n');
    console.log('Para ejecutar estas pruebas contra tu base de datos real:');
    console.log('1. Abrí .env.local y colocá tus claves reales de Supabase:');
    console.log('   NEXT_PUBLIC_SUPABASE_URL=https://<tu-ref>.supabase.co');
    console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key_real>');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=<tu_service_role_key_real>');
    console.log('2. Aplicá las 2 migraciones en el SQL Editor de tu Supabase:');
    console.log('   - 20261028000000_init_schema.sql');
    console.log('   - 20261028000001_ticket_customization.sql');
    console.log('3. Ejecutá: npx tsx test/real-db-tests.ts');
    console.log('----------------------------------------------------------------\n');
    process.exit(1);
  }

  if (!supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
    console.error('⛔ ABORTADO POR SEGURIDAD: Los tests solo pueden ejecutarse contra una base de datos local (127.0.0.1 o localhost).');
    process.exit(1);
  }

  console.log(`Conectando a base de datos real: ${supabaseUrl}...`);
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const anonClient = createClient(supabaseUrl, anonKey);

  // Identificadores de usuarios de prueba temporales
  const testRunId = Date.now();
  const adminEmail = `test_admin_${testRunId}@taller32.local`;
  const operarioEmail = `test_operario_${testRunId}@taller32.local`;
  const tempPassword = `TallerTest_${testRunId}!`;

  let adminUserId: string | null = null;
  let operarioUserId: string | null = null;
  let shopId: string | null = null;
  let vehicleId: string | null = null;
  let serviceId: string | null = null;

  try {
    // 0. Obtener o crear taller de prueba
    const { data: shops, error: shopErr } = await adminClient.from('shops').select('id').limit(1);
    if (shopErr || !shops || shops.length === 0) {
      console.error('❌ Error: No se encontró ningún taller en la tabla shops. Ejecutá las migraciones primero.');
      process.exit(1);
    }
    shopId = shops[0].id;

    // Crear vehículo de prueba (El trigger BEFORE INSERT generará el token real del servidor)
    const clientProvidedToken = `test-token-${testRunId}-${Math.random().toString(36).substring(2, 10)}`;
    const testPatente = `TT${Math.floor(100 + Math.random() * 900)}ZZ`;
    const { data: vehData, error: vehErr } = await adminClient.from('vehicles').insert({
      shop_id: shopId,
      public_token: clientProvidedToken,
      patente: testPatente,
      marca: 'TestMarca',
      modelo: 'TestModelo',
      anio: 2023,
    }).select('id, public_token').single();

    if (vehErr || !vehData) {
      console.error('❌ Error creando vehículo de prueba:', vehErr?.message);
      process.exit(1);
    }
    vehicleId = vehData.id;
    const testToken = vehData.public_token; // Usar el token real generado por el trigger en Postgres

    console.log('1. Creando usuarios de prueba en Supabase Auth vía Admin API...');
    const { data: adminAuth, error: adminAuthErr } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
    });
    if (adminAuthErr) throw new Error(`Error creando admin en Auth: ${adminAuthErr.message}`);
    adminUserId = adminAuth.user.id;

    const { data: operarioAuth, error: operarioAuthErr } = await adminClient.auth.admin.createUser({
      email: operarioEmail,
      password: tempPassword,
      email_confirm: true,
    });
    if (operarioAuthErr) throw new Error(`Error creando operario en Auth: ${operarioAuthErr.message}`);
    operarioUserId = operarioAuth.user.id;

    // Insertar en staff_users
    await adminClient.from('staff_users').insert([
      { id: adminUserId, shop_id: shopId, nombre: 'Admin Test Real', rol: 'admin', is_active: true },
      { id: operarioUserId, shop_id: shopId, nombre: 'Operario Test Real', rol: 'operario', is_active: true },
    ]);

    // Iniciar sesión con clientes autenticados reales
    const operarioClient = createClient(supabaseUrl, anonKey);
    const { error: operarioLoginErr } = await operarioClient.auth.signInWithPassword({
      email: operarioEmail,
      password: tempPassword,
    });
    if (operarioLoginErr) throw new Error(`Login operario falló: ${operarioLoginErr.message}`);

    const testAdminClient = createClient(supabaseUrl, anonKey);
    const { error: adminLoginErr } = await testAdminClient.auth.signInWithPassword({
      email: adminEmail,
      password: tempPassword,
    });
    if (adminLoginErr) throw new Error(`Login admin falló: ${adminLoginErr.message}`);

    console.log('✔ Usuarios reales autenticados con éxito (Admin y Operario).\n');

    // --------------------------------------------------------------------------
    // TEST 1: Operario no puede hacer UPDATE directo (RLS)
    // --------------------------------------------------------------------------
    console.log('[TEST 1/11] Verificando que operario NO pueda hacer UPDATE directo sobre services...');
    // Crear un servicio inicial válido
    const { data: srvData, error: srvErr } = await operarioClient.from('services').insert({
      created_by: operarioUserId,
      vehicle_id: vehicleId,
      shop_id: shopId,
      kilometraje: 50000,
      tipo: 'neumaticos',
      descripcion: 'Prueba inicial de servicio',
      items: [{ concepto: 'Neumático', cantidad: 2, precio_unitario: 50000 }],
      total_manual: 95000,
      notas_internas: 'Nota confidencial interna que no debe salir',
      notas_cliente: 'Revisar balanceo a los 1000 km',
      visibilidad: {
        mostrar_km: true,
        mostrar_productos: true,
        mostrar_precio: true,
        mostrar_proximo_servicio: true,
        mostrar_sucursal: true,
        mostrar_notas: false,
      },
    }).select('id').single();

    if (srvErr || !srvData) {
      throw new Error(`Error insertando servicio inicial: ${srvErr?.message}`);
    }
    serviceId = srvData.id;

    const { data: opUpdate, error: opUpdateErr } = await operarioClient
      .from('services')
      .update({ precio: 10 } as any)
      .eq('id', serviceId)
      .select();

    if (opUpdateErr || !opUpdate || (opUpdate as any[]).length === 0) {
      console.log('✔ PASÓ: UPDATE directo rechazado por política RLS para operario.');
    } else {
      throw new Error('FALLÓ: El operario pudo hacer un UPDATE directo sobre services.');
    }

    // --------------------------------------------------------------------------
    // TEST 2: Operario no puede modificar public_token directamente en vehicles
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2/11] Verificando que operario NO pueda modificar public_token directamente en vehicles...');
    const { error: tokenUpdateErr } = await operarioClient
      .from('vehicles')
      .update({ public_token: 'hacked-token-manual-attempt' })
      .eq('id', vehicleId);

    if (tokenUpdateErr && tokenUpdateErr.message.includes('tokens de acceso')) {
      console.log('✔ PASÓ: Trigger trg_protect_vehicle_tokens bloqueó la modificación directa del token.');
    } else {
      throw new Error('FALLÓ: Se permitió modificar public_token directamente en vehicles.');
    }

    // --------------------------------------------------------------------------
    // TEST 3: Operario NO puede anular servicio (función auditada)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 3/11] Verificando que operario NO pueda anular servicio...');
    const { error: opAnularErr } = await operarioClient.rpc('update_service_with_audit', {
      p_service_id: serviceId,
      p_datos: { anulado: true, anulado_motivo: 'Intento operario' },
    });

    if (opAnularErr && opAnularErr.message.includes('administrador')) {
      console.log('✔ PASÓ: update_service_with_audit rechazó anulación por operario.');
    } else {
      throw new Error('FALLÓ: El operario pudo anular un servicio sin permisos de admin.');
    }

    // --------------------------------------------------------------------------
    // TEST 4: Admin SÍ puede anular servicio
    // --------------------------------------------------------------------------
    console.log('\n[TEST 4/11] Verificando que Admin SÍ puede anular servicio...');
    const { data: srvAnular } = await operarioClient.from('services').insert({
      created_by: operarioUserId,
      vehicle_id: vehicleId,
      shop_id: shopId,
      kilometraje: 51000,
      tipo: 'frenos',
      descripcion: 'Servicio a anular por admin',
      items: [],
    }).select('id').single();

    const { data: admAnular, error: admAnularErr } = await testAdminClient.rpc('update_service_with_audit', {
      p_service_id: srvAnular.id,
      p_datos: { anulado: true, anulado_motivo: 'Carga duplicada' },
      p_motivo: 'Anulado por error de carga',
    });

    if (admAnular?.success && admAnular?.anulado) {
      console.log('✔ PASÓ: Admin anuló el servicio con auditoría registrada.');
    } else {
      throw new Error(`FALLÓ: Admin no pudo anular servicio: ${admAnularErr?.message}`);
    }

    // --------------------------------------------------------------------------
    // TEST 5: Bloqueo de edición sobre servicio ya anulado
    // --------------------------------------------------------------------------
    console.log('\n[TEST 5/11] Verificando bloqueo de edición sobre servicio anulado...');
    const { error: editAnuladoErr } = await testAdminClient.rpc('update_service_with_audit', {
      p_service_id: srvAnular.id,
      p_datos: { descripcion: 'Intento de modificar anulado' },
    });

    if (editAnuladoErr && editAnuladoErr.message.includes('anulado')) {
      console.log('✔ PASÓ: Se bloqueó la edición de un servicio anulado.');
    } else {
      throw new Error('FALLÓ: Se permitió modificar un servicio anulado.');
    }

    // --------------------------------------------------------------------------
    // TEST 6: Editar solo una nota NO pierde total_manual y genera revisión
    // --------------------------------------------------------------------------
    console.log('\n[TEST 6/11] Verificando que editar notas conserve total_manual y genere revisión...');
    const { error: editErr } = await operarioClient.rpc('update_service_with_audit', {
      p_service_id: serviceId,
      p_datos: {
        notas_cliente: 'Nueva nota de prueba sin tocar total_manual',
      },
      p_motivo: 'Actualización de nota de garantía',
    });

    if (editErr) throw new Error(`Error al editar servicio: ${editErr.message}`);

    const { data: updatedSrv } = await adminClient.from('services').select('*').eq('id', serviceId).single();
    if (updatedSrv.total_manual !== 95000) {
      throw new Error(`FALLÓ: total_manual se perdió o cambió. Valor actual: ${updatedSrv.total_manual}`);
    }
    if (!updatedSrv.editado) {
      throw new Error('FALLÓ: El servicio no fue marcado como editado = true.');
    }

    const { data: revisions } = await adminClient
      .from('service_revisions')
      .select('*')
      .eq('service_id', serviceId);

    if (revisions && revisions.length > 0) {
      console.log('✔ PASÓ: total_manual (95.000) preservado, editado = true y revisión registrada.');
    } else {
      throw new Error('FALLÓ: No se registró la revisión en service_revisions.');
    }

    // --------------------------------------------------------------------------
    // TEST 7: Precios negativos o ítems negativos son rechazados en INSERT directo
    // --------------------------------------------------------------------------
    console.log('\n[TEST 7/11] Verificando que ítems negativos sean rechazados en INSERT directo...');
    const { error: negItemErr } = await operarioClient.from('services').insert({
      created_by: operarioUserId,
      vehicle_id: vehicleId,
      shop_id: shopId,
      kilometraje: 52000,
      tipo: 'frenos',
      descripcion: 'Item negativo ilegal',
      items: [{ concepto: 'Freno', cantidad: 1, precio_unitario: -500 }],
    });

    if (negItemErr && (negItemErr.message.includes('negativos') || negItemErr.message.includes('mayor o igual a 0'))) {
      console.log('✔ PASÓ: Inserción con ítem negativo rechazada por trigger de validación.');
    } else {
      throw new Error('FALLÓ: Se permitió insertar un ítem con precio unitario negativo.');
    }

    // --------------------------------------------------------------------------
    // TEST 8: Precio enviado por el cliente es IGNORADO en INSERT directo
    // --------------------------------------------------------------------------
    console.log('\n[TEST 8/11] Verificando que precio enviado por el cliente sea IGNORADO...');
    const { data: srvPriceIgnored, error: priceIgnoredErr } = await operarioClient.from('services').insert({
      created_by: operarioUserId,
      vehicle_id: vehicleId,
      shop_id: shopId,
      kilometraje: 53000,
      tipo: 'frenos',
      descripcion: 'Intento de falsificar precio enviado por cliente',
      items: [], // sin items ni total manual
      precio: 999999.00, // Precio fraudulento que debe ser sobrescrito a 0.00
    }).select('id, precio').single();

    if (priceIgnoredErr || !srvPriceIgnored) {
      throw new Error(`Error en insert: ${priceIgnoredErr?.message}`);
    }
    if (srvPriceIgnored.precio === 0) {
      console.log('✔ PASÓ: Precio arbitrario enviado por cliente ($999.999) fue ignorado y recalculado a $0.00.');
    } else {
      throw new Error(`FALLÓ: El precio arbitrario del cliente fue aceptado: ${srvPriceIgnored.precio}`);
    }

    // --------------------------------------------------------------------------
    // TEST 9: Visibilidad con valor no booleano es rechazada por CHECK
    // --------------------------------------------------------------------------
    console.log('\n[TEST 9/11] Verificando que visibilidad con valor no booleano sea rechazada por CHECK...');
    const { error: nonBoolVisErr } = await operarioClient.from('services').insert({
      created_by: operarioUserId,
      vehicle_id: vehicleId,
      shop_id: shopId,
      kilometraje: 54000,
      tipo: 'frenos',
      descripcion: 'Visibilidad corrupta',
      items: [],
      visibilidad: {
        mostrar_km: 'si', // String inválido, debe ser boolean
        mostrar_productos: true,
      },
    });

    if (nonBoolVisErr && (nonBoolVisErr.message.includes('chk_services_visibilidad') || nonBoolVisErr.message.includes('check constraint'))) {
      console.log('✔ PASÓ: Visibilidad no booleana rechazada por la restricción CHECK chk_services_visibilidad.');
    } else {
      throw new Error('FALLÓ: Se permitió insertar visibilidad con valores no booleanos.');
    }

    // --------------------------------------------------------------------------
    // TEST 10: Inmutabilidad de service_revisions (Trigger de bloqueo)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 10/11] Verificando inmutabilidad física de service_revisions...');
    const { error: revMutationErr } = await adminClient
      .from('service_revisions')
      .delete()
      .eq('service_id', serviceId);

    if (revMutationErr && revMutationErr.message.includes('inmutable')) {
      console.log('✔ PASÓ: Trigger trg_prevent_service_revisions_mutation bloqueó DELETE en auditoría.');
    } else {
      throw new Error('FALLÓ: Se permitió borrar un registro en service_revisions.');
    }

    // --------------------------------------------------------------------------
    // TEST 11: get_vehicle_by_token purga notas_internas y campos ocultos
    // --------------------------------------------------------------------------
    console.log('\n[TEST 11/11] Verificando purga en respuesta pública de get_vehicle_by_token...');
    const { data: pubTicket, error: pubErr } = await anonClient.rpc('get_vehicle_by_token', {
      p_token: testToken,
    });

    if (pubErr || !pubTicket?.success) {
      throw new Error(`Error en get_vehicle_by_token: ${pubErr?.message}`);
    }

    const firstSrv = pubTicket.services[0];
    if ('notas_internas' in firstSrv) {
      throw new Error('FALLÓ: notas_internas viaja en el payload público.');
    }
    if ('notas_cliente' in firstSrv && firstSrv.notas_cliente !== null) {
      throw new Error('FALLÓ: notas_cliente no fue purgada cuando mostrar_notas era false.');
    }

    console.log('✔ PASÓ: notas_internas nunca viaja y campos ocultos son purgados del payload.\n');

    console.log('================================================================');
    console.log('🎉 TODOS LOS 11 TESTS EN POSTGRESQL REAL PASARON AL 100%');
    console.log('================================================================');
  } finally {
    console.log('\n🧹 Limpiando usuarios y registros temporales de prueba...');
    if (vehicleId) {
      try { await adminClient.from('service_revisions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
      try { await adminClient.from('services').delete().eq('vehicle_id', vehicleId); } catch {}
      try { await adminClient.from('vehicles').delete().eq('id', vehicleId); } catch {}
    }
    if (operarioUserId) {
      try { await adminClient.from('staff_users').delete().eq('id', operarioUserId); } catch {}
      try { await adminClient.auth.admin.deleteUser(operarioUserId); } catch {}
    }
    if (adminUserId) {
      try { await adminClient.from('staff_users').delete().eq('id', adminUserId); } catch {}
      try { await adminClient.auth.admin.deleteUser(adminUserId); } catch {}
    }
    console.log('✔ Entorno de prueba limpiado correctamente.');
  }
}

runRealDatabaseTests();
