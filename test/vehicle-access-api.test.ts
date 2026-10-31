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

import assert from 'node:assert';
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SHOP_ID = '00000000-0000-0000-0000-000000000001';

function randomPlate() {
  const letters = () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
  return `${letters()}${Math.floor(100 + Math.random() * 900)}${letters()}`;
}

function randomPhone() {
  return `54911${Math.floor(10000000 + Math.random() * 89999999)}`;
}

function randomIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

async function runTests() {
  console.log('🧪 TEST SUITE: /api/vehicle-access, propietarios y privacidad\n');

  const { POST } = await import('../app/api/vehicle-access/route');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';
  if (!supabaseUrl.includes('127.0.0.1') && !supabaseUrl.includes('localhost')) {
    console.error('⛔ ABORTADO POR SEGURIDAD: Los tests solo pueden ejecutarse contra una base de datos local (127.0.0.1 o localhost).');
    process.exit(1);
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const anon = createClient(supabaseUrl, anonKey);

  const request = async (patente: string, ultimosDigitos: string, ip = randomIp()) => {
    const req = new NextRequest('http://localhost:3000/api/vehicle-access', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify({ patente, ultimos_digitos: ultimosDigitos }),
    });
    const res = await POST(req);
    return { status: res.status, body: await res.json() };
  };

  // Datos de prueba
  const email = `staff-${Date.now()}@taller32.local`;
  const password = `Prueba-${Date.now()}!`;
  const { data: created, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ok(created.user, `No se pudo crear el usuario: ${userErr?.message}`);
  await admin.from('staff_users').insert({ id: created.user.id, shop_id: SHOP_ID, nombre: 'Staff Test', rol: 'operario' });

  const staff = createClient(supabaseUrl, anonKey);
  const { error: loginErr } = await staff.auth.signInWithPassword({ email, password });
  assert.ifError(loginErr);

  const newCustomer = async (nombre: string) => {
    const telefono = randomPhone();
    const { data, error } = await staff
      .from('customers')
      .insert({ shop_id: SHOP_ID, nombre, telefono })
      .select('id, telefono')
      .single();
    assert.ifError(error);
    return data!;
  };

  const patente = randomPlate();
  const { data: vehicle, error: vehErr } = await staff
    .from('vehicles')
    .insert({ shop_id: SHOP_ID, patente, marca: 'Ford', modelo: 'Ranger' })
    .select('id, public_token')
    .single();
  assert.ifError(vehErr);

  const primerDueno = await newCustomer('Primer Dueño');
  const assign1 = await staff.rpc('assign_vehicle_owner', {
    p_vehicle_id: vehicle!.id,
    p_customer_id: primerDueno.id,
  });
  assert.ifError(assign1.error);
  assert.strictEqual(assign1.data.new_token, null, 'El primer dueño no debe cambiar el QR');

  const { data: user } = await staff.auth.getUser();
  const { error: srvErr } = await staff.from('services').insert({
    vehicle_id: vehicle!.id,
    shop_id: SHOP_ID,
    kilometraje: 1000,
    tipo: 'frenos',
    descripcion: 'Trabajo del primer dueño',
    items: [{ concepto: 'Pastillas', cantidad: 1, precio_unitario: 50000 }],
    notas_cliente: 'Nota privada del primer dueño',
    visibilidad: { mostrar_notas: true },
    created_by: user.user!.id,
  });
  assert.ifError(srvErr);
  const digitos = primerDueno.telefono.slice(-4);
  const digitosIncorrectos = digitos === '0000' ? '1111' : '0000';

  // ---------------------------------------------------------------------------
  console.log('[1] Los datos incorrectos no revelan si la patente existe');
  const inexistente = await request(randomPlate(), '1234');
  const incorrecto = await request(patente, digitosIncorrectos);
  assert.strictEqual(inexistente.body.success, false);
  assert.strictEqual(incorrecto.body.success, false);
  assert.strictEqual(inexistente.body.error, incorrecto.body.error);
  assert.strictEqual(incorrecto.body.token, undefined);
  console.log('✔ PASÓ');

  console.log('[2] Con los datos correctos solo se entrega el enlace');
  const correcto = await request(patente, digitos);
  assert.deepStrictEqual(correcto.body, { success: true, token: vehicle!.public_token });
  console.log('✔ PASÓ');

  console.log('[3] Formatos inválidos se rechazan sin consultar');
  assert.strictEqual((await request('NOVALIDA', '1234')).status, 400);
  assert.strictEqual((await request(patente, '12')).status, 400);
  console.log('✔ PASÓ');

  console.log('[4] 5 fallos por patente la bloquean, incluso con los datos correctos');
  const patenteBloqueo = randomPlate();
  for (let i = 0; i < 5; i++) await request(patenteBloqueo, '1234');
  const bloqueada = await request(patenteBloqueo, '1234');
  assert.strictEqual(bloqueada.status, 429);
  assert.strictEqual(bloqueada.body.blocked, true);
  console.log('✔ PASÓ');

  console.log('[5] 20 intentos por minuto bloquean la IP');
  const ip = randomIp();
  for (let i = 0; i < 20; i++) await request(randomPlate(), '1234', ip);
  const ipBloqueada = await request(randomPlate(), '1234', ip);
  assert.strictEqual(ipBloqueada.status, 429);
  console.log('✔ PASÓ');

  console.log('[6] anon no puede leer clientes ni vehículos');
  assert.ok((await anon.from('customers').select('id')).error);
  assert.ok((await anon.from('vehicles').select('id')).error);
  console.log('✔ PASÓ');

  console.log('[7] El personal no puede escribir propietarios directamente');
  const directo = await staff.from('vehicle_owners').update({ hasta: new Date().toISOString() }).eq('vehicle_id', vehicle!.id);
  assert.ok(directo.error);
  console.log('✔ PASÓ');

  console.log('[8] Corregir un propietario mal cargado no cambia el QR');
  const correccion = await newCustomer('Dueño Corregido');
  const assign2 = await staff.rpc('assign_vehicle_owner', {
    p_vehicle_id: vehicle!.id,
    p_customer_id: correccion.id,
    p_es_transferencia: false,
  });
  assert.ifError(assign2.error);
  assert.strictEqual(assign2.data.new_token, null);
  const antesDeVender = await anon.rpc('get_vehicle_by_token', { p_token: vehicle!.public_token });
  assert.strictEqual(antesDeVender.data.services[0].precio, 50000);
  console.log('✔ PASÓ');

  console.log('[9] Un cambio de dueño invalida el QR viejo y oculta precios y notas anteriores');
  const nuevoDueno = await newCustomer('Nuevo Dueño');
  const assign3 = await staff.rpc('assign_vehicle_owner', {
    p_vehicle_id: vehicle!.id,
    p_customer_id: nuevoDueno.id,
  });
  assert.ifError(assign3.error);
  const nuevoToken = assign3.data.new_token;
  assert.ok(/^[0-9a-f]{48}$/.test(nuevoToken));

  const qrViejo = await anon.rpc('get_vehicle_by_token', { p_token: vehicle!.public_token });
  assert.strictEqual(qrViejo.data.success, false);

  await staff.from('services').insert({
    vehicle_id: vehicle!.id,
    shop_id: SHOP_ID,
    kilometraje: 2000,
    tipo: 'neumaticos',
    descripcion: 'Trabajo del nuevo dueño',
    items: [{ concepto: 'Cubierta', cantidad: 1, precio_unitario: 90000 }],
    created_by: user.user!.id,
  });

  const qrNuevo = await anon.rpc('get_vehicle_by_token', { p_token: nuevoToken });
  const [reciente, anterior] = qrNuevo.data.services;
  assert.strictEqual(reciente.precio, 90000);
  assert.strictEqual(anterior.descripcion, 'Trabajo del primer dueño');
  assert.strictEqual(anterior.precio, undefined);
  assert.strictEqual(anterior.notas_cliente, undefined);
  assert.strictEqual(anterior.items[0].precio_unitario, undefined);
  assert.ok(reciente.numero > anterior.numero);
  console.log('✔ PASÓ');

  console.log('[10] El teléfono del dueño anterior ya no da acceso');
  assert.strictEqual((await request(patente, correccion.telefono.slice(-4))).body.success, false);
  assert.strictEqual((await request(patente, nuevoDueno.telefono.slice(-4))).body.token, nuevoToken);
  console.log('✔ PASÓ');

  console.log('[11] El mismo teléfono no puede cargarse en dos clientes');
  const duplicado = await staff.from('customers').insert({ shop_id: SHOP_ID, nombre: 'Duplicado', telefono: nuevoDueno.telefono });
  assert.strictEqual(duplicado.error?.code, '23505');
  console.log('✔ PASÓ');

  console.log('[12] No se puede cargar un servicio ya anulado ni a nombre de otro');
  const anulado = await staff.from('services').insert({
    vehicle_id: vehicle!.id,
    shop_id: SHOP_ID,
    kilometraje: 1,
    tipo: 'otro',
    descripcion: 'No debería guardarse',
    anulado: true,
    created_by: user.user!.id,
  });
  assert.ok(anulado.error);
  console.log('✔ PASÓ');

  console.log('\n🎉 TODOS LOS TESTS PASARON');
}

runTests().then(
  () => process.exit(0),
  (err) => {
    console.error('\n❌ ERROR EN LA SUITE:', err);
    process.exit(1);
  }
);
