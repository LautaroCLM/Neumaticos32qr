import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

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

async function runAdminPanelIntegrationTests() {
  console.log('================================================================');
  console.log('🧪 TEST SUITE: PANEL DEL TALLER (ETAPA C) - BASE LOCAL SUPABASE');
  console.log('================================================================\n');

  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const testRunId = Date.now();
  const adminEmail = `admin_panel_${testRunId}@taller32.local`;
  const operarioEmail = `operario_panel_${testRunId}@taller32.local`;
  const tempPassword = `PanelTest_${testRunId}!`;

  let adminUserId: string | null = null;
  let operarioUserId: string | null = null;
  let shopId: string | null = null;
  let testVehicleId: string | null = null;
  let testServiceId: string | null = null;
  let testTemplateId: string | null = null;

  try {
    // 0. Obtener taller
    const { data: shops } = await adminClient.from('shops').select('id').limit(1);
    shopId = shops![0].id;

    // Crear usuarios en Auth
    const { data: adminAuth } = await adminClient.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
    });
    adminUserId = adminAuth.user.id;

    const { data: opAuth } = await adminClient.auth.admin.createUser({
      email: operarioEmail,
      password: tempPassword,
      email_confirm: true,
    });
    operarioUserId = opAuth.user.id;

    // Insertar en staff_users
    await adminClient.from('staff_users').insert([
      { id: adminUserId, shop_id: shopId, nombre: 'Admin Panel Test', rol: 'admin', is_active: true },
      { id: operarioUserId, shop_id: shopId, nombre: 'Operario Panel Test', rol: 'operario', is_active: true },
    ]);

    // Clientes autenticados
    const testAdminClient = createClient(supabaseUrl, anonKey);
    await testAdminClient.auth.signInWithPassword({ email: adminEmail, password: tempPassword });

    const testOperarioClient = createClient(supabaseUrl, anonKey);
    await testOperarioClient.auth.signInWithPassword({ email: operarioEmail, password: tempPassword });

    console.log('✔ Usuarios reales autenticados con éxito (Admin y Operario).\n');

    // --------------------------------------------------------------------------
    // TEST 1: Operario puede dar de alta un vehículo (token generado en servidor)
    // --------------------------------------------------------------------------
    console.log('[TEST 1/10] Operario registra vehículo (Token generado estrictamente en servidor)...');
    const testPatente = `AB${Math.floor(100 + Math.random() * 900)}CD`;
    const { data: vehData, error: vehErr } = await testOperarioClient
      .from('vehicles')
      .insert({
        shop_id: shopId,
        patente: testPatente,
        marca: 'Toyota',
        modelo: 'Hilux',
        anio: 2024,
        cliente_nombre: 'Prueba Operario',
      })
      .select('id, public_token, patente')
      .single();

    if (vehErr || !vehData) throw new Error(`Fallo alta de vehículo por operario: ${vehErr?.message}`);
    testVehicleId = vehData.id;

    if (!vehData.public_token || vehData.public_token.length < 20) {
      throw new Error('Fallo: El token del vehículo no fue generado automáticamente en el servidor.');
    }
    console.log(`✔ PASÓ: Vehículo creado con token generado en servidor (${vehData.public_token.slice(0, 10)}...).`);

    // --------------------------------------------------------------------------
    // TEST 1.B: Operario intenta forzar public_token='aaaaaaaaaaaaaaaaaaaa' (Trigger BEFORE INSERT lo ignora)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 1.B] Operario intenta inyectar public_token="aaaaaaaaaaaaaaaaaaaa" (debe ser ignorado y sobreescrito por trigger)...');
    const maliciousToken = 'aaaaaaaaaaaaaaaaaaaa';
    const testPatenteMalicious = `XY${Math.floor(100 + Math.random() * 900)}ZZ`;
    const { data: vehMalicious, error: malErr } = await testOperarioClient
      .from('vehicles')
      .insert({
        shop_id: shopId,
        patente: testPatenteMalicious,
        marca: 'Ford',
        modelo: 'Ranger',
        anio: 2023,
        cliente_nombre: 'Intento Inyección Token',
        public_token: maliciousToken,
      })
      .select('id, public_token, patente')
      .single();

    if (malErr || !vehMalicious) throw new Error(`Fallo inserción con token arbitrario: ${malErr?.message}`);

    if (vehMalicious.public_token === maliciousToken) {
      throw new Error(`FALLO DE SEGURIDAD: La base de datos aceptó el token arbitrario '${maliciousToken}' enviado por el cliente.`);
    }

    if (typeof vehMalicious.public_token !== 'string' || vehMalicious.public_token.length < 20) {
      throw new Error(`FALLO: El token resultante no es válido: ${vehMalicious.public_token}`);
    }

    console.log(`✔ PASÓ: El token enviado por el cliente (${maliciousToken}) fue completamente IGNORADO y sobreescrito por la base con token aleatorio (${vehMalicious.public_token.slice(0, 10)}...).`);

    // Limpiar vehículo de prueba 1.B
    await adminClient.from('vehicles').delete().eq('id', vehMalicious.id);

    // --------------------------------------------------------------------------
    // TEST 2: Operario puede registrar servicio con ítems dinámicos y cálculo automático
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2/10] Operario registra servicio con ítems (cálculo de precio por trigger)...');
    const { data: srvData, error: srvErr } = await testOperarioClient
      .from('services')
      .insert({
        vehicle_id: testVehicleId,
        shop_id: shopId,
        kilometraje: 15000,
        tipo: 'neumaticos',
        descripcion: 'Colocación 2 neumáticos 265/65 R17',
        items: [
          { concepto: 'Neumático Bridgestone', cantidad: 2, precio_unitario: 120000 },
          { concepto: 'Válvula y armado', cantidad: 2, precio_unitario: 5000 },
        ],
        visibilidad: {
          mostrar_km: true,
          mostrar_productos: true,
          mostrar_precio: true,
          mostrar_proximo_servicio: true,
          mostrar_sucursal: true,
          mostrar_notas: false,
        },
      })
      .select('id, precio')
      .single();

    if (srvErr || !srvData) throw new Error(`Fallo inserción de servicio: ${srvErr?.message}`);
    testServiceId = srvData.id;

    if (srvData.precio !== 250000) {
      throw new Error(`Fallo cálculo de precio: esperado 250000, obtenido ${srvData.precio}`);
    }
    console.log(`✔ PASÓ: Servicio registrado con subtotal calculado exactamente ($250.000).`);

    // --------------------------------------------------------------------------
    // TEST 3: Operario NO puede modificar datos del taller ni ticket_config (RLS)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 3/10] Verificando que Operario NO pueda modificar shops / ticket_config...');
    const { data: opShopUpdate, error: opShopErr } = await testOperarioClient
      .from('shops')
      .update({ nombre: 'Hack Taller' })
      .eq('id', shopId)
      .select();

    if (opShopErr || !opShopUpdate || opShopUpdate.length === 0) {
      console.log('✔ PASÓ: Operario rechazado por política RLS para UPDATE sobre shops.');
    } else {
      throw new Error('FALLÓ: Un operario pudo modificar la tabla shops.');
    }

    // --------------------------------------------------------------------------
    // TEST 4: Admin SÍ puede modificar datos del taller y ticket_config (RLS)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 4/10] Verificando que Admin SÍ puede modificar ticket_config...');
    const { data: adminShopUpdate, error: adminShopErr } = await testAdminClient
      .from('shops')
      .update({
        ticket_config: {
          titulo_ticket: 'Ticket Actualizado por Admin',
          texto_pie: 'Garantía 6 meses Neumáticos el 32',
          etiqueta_proximo_service: 'Próximo control sugerido',
        },
      })
      .eq('id', shopId)
      .select();

    if (adminShopErr || !adminShopUpdate || adminShopUpdate.length === 0) {
      throw new Error(`FALLÓ: El admin no pudo modificar shops: ${adminShopErr?.message}`);
    }
    console.log('✔ PASÓ: Admin actualizó ticket_config correctamente.');

    // --------------------------------------------------------------------------
    // TEST 5: Operario NO puede crear plantillas de servicio (RLS)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 5/10] Verificando que Operario NO pueda insertar service_templates...');
    const { error: opTmplErr } = await testOperarioClient
      .from('service_templates')
      .insert({
        shop_id: shopId,
        nombre: 'Plantilla No Autorizada',
        tipo: 'neumaticos',
      });

    if (opTmplErr) {
      console.log('✔ PASÓ: Operario bloqueado por RLS al crear service_templates.');
    } else {
      throw new Error('FALLÓ: El operario pudo insertar en service_templates.');
    }

    // --------------------------------------------------------------------------
    // TEST 6: Admin SÍ puede crear plantillas de servicio (RLS)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 6/10] Verificando que Admin SÍ puede crear service_templates...');
    const { data: adminTmplData, error: adminTmplErr } = await testAdminClient
      .from('service_templates')
      .insert({
        shop_id: shopId,
        nombre: 'Alineación y Balanceo Completo (Test)',
        tipo: 'alineacion_balanceo',
        descripcion_base: 'Alineación de tren delantero y balanceo de 4 ruedas.',
        items_base: [{ concepto: 'Mano de obra alineación', cantidad: 1, precio_unitario: 35000 }],
        activo: true,
      })
      .select('id')
      .single();

    if (adminTmplErr || !adminTmplData) {
      throw new Error(`FALLÓ: Admin no pudo crear plantilla: ${adminTmplErr?.message}`);
    }
    testTemplateId = adminTmplData.id;
    console.log('✔ PASÓ: Admin creó plantilla de servicio exitosamente.');

    // --------------------------------------------------------------------------
    // TEST 7: Operario NO puede anular servicio vía update_service_with_audit
    // --------------------------------------------------------------------------
    console.log('\n[TEST 7/10] Verificando que Operario NO pueda anular servicio...');
    const { data: opAnularRes, error: opAnularErr } = await testOperarioClient.rpc(
      'update_service_with_audit',
      {
        p_service_id: testServiceId,
        p_datos: { anulado: true },
        p_motivo: 'Intento de anulación por operario',
      }
    );

    if (opAnularErr || opAnularRes?.success === false) {
      console.log('✔ PASÓ: update_service_with_audit denegó la anulación por operario.');
    } else {
      throw new Error('FALLÓ: El operario pudo anular un servicio.');
    }

    // --------------------------------------------------------------------------
    // TEST 8: Admin SÍ puede anular servicio y genera auditoría inmutable
    // --------------------------------------------------------------------------
    console.log('\n[TEST 8/10] Verificando que Admin SÍ puede anular servicio con auditoría...');
    const { data: adminAnularRes, error: adminAnularErr } = await testAdminClient.rpc(
      'update_service_with_audit',
      {
        p_service_id: testServiceId,
        p_datos: { anulado: true },
        p_motivo: 'Garantía cumplida / Anulado por duplicado',
      }
    );

    if (adminAnularErr || !adminAnularRes?.success) {
      throw new Error(`FALLÓ: Admin no pudo anular servicio: ${adminAnularErr?.message}`);
    }

    const { data: revisions } = await adminClient
      .from('service_revisions')
      .select('*')
      .eq('service_id', testServiceId);

    if (!revisions || revisions.length === 0) {
      throw new Error('FALLÓ: No se generó el registro de auditoría tras la anulación.');
    }
    console.log(`✔ PASÓ: Servicio anulado y registrado en service_revisions con motivo "${revisions[0].motivo_edicion}".`);

    // --------------------------------------------------------------------------
    // TEST 9: Regeneración de token QR
    // --------------------------------------------------------------------------
    console.log('\n[TEST 9/10] Verificando regeneración de token QR...');
    const oldToken = vehData.public_token;
    const { data: regenRes, error: regenErr } = await testOperarioClient.rpc(
      'regenerate_vehicle_token',
      { p_vehicle_id: testVehicleId }
    );

    if (regenErr || !regenRes?.success) {
      throw new Error(`FALLÓ: Regeneración de token: ${regenErr?.message}`);
    }

    const newToken = regenRes.new_token;
    if (newToken === oldToken) {
      throw new Error('FALLÓ: El nuevo token es idéntico al anterior.');
    }

    // Token anterior debe fallar
    const { data: oldPublic } = await adminClient.rpc('get_vehicle_by_token', { p_token: oldToken });
    if (oldPublic?.success) {
      throw new Error('FALLÓ: El token antiguo sigue respondiendo tras ser regenerado.');
    }

    // Nuevo token debe responder
    const { data: newPublic } = await adminClient.rpc('get_vehicle_by_token', { p_token: newToken });
    if (!newPublic?.success) {
      throw new Error('FALLÓ: El nuevo token no responde correctamente.');
    }
    console.log('✔ PASÓ: Token regenerado correctamente. El token anterior quedó invalidado de inmediato.');

    // --------------------------------------------------------------------------
    // TEST 10: Revocación de token QR
    // --------------------------------------------------------------------------
    console.log('\n[TEST 10/10] Verificando revocación de token QR...');
    const { data: revokeRes, error: revokeErr } = await testOperarioClient.rpc(
      'revoke_vehicle_token',
      { p_vehicle_id: testVehicleId }
    );

    if (revokeErr || !revokeRes?.success) {
      throw new Error(`FALLÓ: Revocación de token: ${revokeErr?.message}`);
    }

    const { data: revokedCheck } = await adminClient.rpc('get_vehicle_by_token', { p_token: newToken });
    if (revokedCheck?.success) {
      throw new Error('FALLÓ: El token revocado aún devuelve datos exitosos.');
    }
    console.log('✔ PASÓ: Token revocado. El acceso público retorna error de revocación.');

    console.log('\n================================================================');
    console.log('🎉 TODOS LOS 10 TESTS DEL PANEL Y ROLES PASARON AL 100%');
    console.log('================================================================');
  } finally {
    console.log('\n🧹 Limpiando registros temporales de la suite del panel...');
    if (testTemplateId) {
      try { await adminClient.from('service_templates').delete().eq('id', testTemplateId); } catch {}
    }
    if (testVehicleId) {
      try { await adminClient.from('service_revisions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); } catch {}
      try { await adminClient.from('services').delete().eq('vehicle_id', testVehicleId); } catch {}
      try { await adminClient.from('vehicles').delete().eq('id', testVehicleId); } catch {}
    }
    if (operarioUserId) {
      try { await adminClient.from('staff_users').delete().eq('id', operarioUserId); } catch {}
      try { await adminClient.auth.admin.deleteUser(operarioUserId); } catch {}
    }
    if (adminUserId) {
      try { await adminClient.from('staff_users').delete().eq('id', adminUserId); } catch {}
      try { await adminClient.auth.admin.deleteUser(adminUserId); } catch {}
    }
    console.log('✔ Limpieza finalizada.');
  }
}

runAdminPanelIntegrationTests();
