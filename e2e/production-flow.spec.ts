import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';

if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  throw new Error(
    '⛔ ABORTADO POR SEGURIDAD: Playwright solo puede ejecutarse contra una base de datos local (127.0.0.1 o localhost).'
  );
}
const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRvAdvDIRTxPOu_tXpedb_dd_mptszFcz1OC4mxhn4U';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const randomNum = Math.floor(100 + Math.random() * 899).toString();
const clientPlate = `AE${randomNum}PW`;
const adminPlate = `AD${randomNum}ZZ`;
const revokedPlate = `AC${randomNum}PW`;

test.describe.serial('Suite End-to-End: Neumáticos el 32 (Playwright)', () => {
  let testVehicleToken: string;
  let testVehicleId: string;
  let revokedVehicleToken: string;

  test.beforeAll(async () => {
    // 1. Crear vehículo de prueba con campos ocultos para validar purga en cliente
    const { data: vehData, error: vehErr } = await supabaseAdmin
      .from('vehicles')
      .insert({
        shop_id: '00000000-0000-0000-0000-000000000001',
        patente: clientPlate,
        marca: 'Chevrolet',
        modelo: 'S10 High Country',
        anio: 2023,
      })
      .select('id, public_token')
      .single();

    if (vehErr || !vehData) throw new Error(`Error creando vehículo e2e: ${vehErr?.message}`);
    testVehicleId = vehData.id;
    testVehicleToken = vehData.public_token;

    // Crear servicio con toggles apagados (ocultar km y ocultar precios)
    await supabaseAdmin.from('services').insert({
      vehicle_id: testVehicleId,
      shop_id: '00000000-0000-0000-0000-000000000001',
      kilometraje: 52000,
      tipo: 'neumaticos',
      descripcion: 'Cambio de neumáticos con toggles de privacidad apagados.',
      items: [{ concepto: 'Cubierta Bridgestone', cantidad: 2, precio_unitario: 150000 }],
      precio: 300000,
      visibilidad: {
        mostrar_km: false,
        mostrar_precio: false,
        mostrar_productos: true,
        mostrar_proximo_servicio: false,
        mostrar_sucursal: true,
        mostrar_notas: false,
      },
    });

    // 2. Crear vehículo con token revocado para prueba de acceso revocado
    const { data: revData } = await supabaseAdmin
      .from('vehicles')
      .insert({
        shop_id: '00000000-0000-0000-0000-000000000001',
        patente: revokedPlate,
        marca: 'Toyota',
        modelo: 'Corolla Cross',
        anio: 2024,
      })
      .select('id, public_token')
      .single();

    if (revData) {
      revokedVehicleToken = revData.public_token;
      const userClient = createClient(SUPABASE_URL, ANON_KEY);
      await userClient.auth.signInWithPassword({
        email: 'admin@taller32.local',
        password: process.env.LOCAL_ADMIN_PASSWORD || 'Taller32Admin!',
      });
      const { error: revErr } = await userClient.rpc('revoke_vehicle_token', { p_vehicle_id: revData.id });
      if (revErr) throw new Error(`Error revocando token: ${revErr.message}`);
    }
  });

  test.afterAll(async () => {
    // Los vehículos creados en la prueba permanecen o pueden limpiarse si no tienen revisiones
  });

  test('1. Flujo Cliente: Búsqueda pública de patente y ticket con toggles de visibilidad apagados', async ({
    page,
  }) => {
    // Búsqueda de patente en la Home
    await page.goto('/');
    const input = page.locator('#patente-input');
    await expect(input).toBeVisible();

    await expect(page.getByText('¿Tu teléfono no está cargado?')).toBeVisible();

    // Los intentos de corridas anteriores no deben dejar la patente bloqueada
    await supabaseAdmin.from('rate_limit_attempts').delete().eq('target_key', 'AE123CD');

    // Con datos incorrectos no se revela nada del vehículo
    await input.fill('AE123CD');
    await page.locator('#digitos-input').fill('0000');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText('Los datos no coinciden con ningún vehículo registrado.')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Volkswagen')).not.toBeVisible();

    // Con los últimos 4 dígitos del teléfono del propietario se abre el historial
    await page.locator('#digitos-input').fill('7788');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/v\/demo-token-amarok-ae123cd-el32/, { timeout: 5000 });
    await expect(page.getByText('Amarok 2.0 TDI Highline 4x4 (Demo)')).toBeVisible();

    // Ahora abrir el ticket con token real generado por la base con toggles apagados
    await page.goto(`/v/${testVehicleToken}`);
    await expect(page.getByText('Chevrolet S10 High Country')).toBeVisible({ timeout: 5000 });

    // El kilometraje (52.000 km) y el precio ($ 300.000) NO deben aparecer en pantalla porque mostrar_km=false y mostrar_precio=false
    await expect(page.getByText('52.000 km')).not.toBeVisible();
    await expect(page.getByText('$ 300.000')).not.toBeVisible();
    await expect(page.getByText('TOTAL ABONADO')).not.toBeVisible();
  });

  test('2. Flujo Taller (Admin): Login, alta de vehículo, carga de servicio con 2 ítems, QR, edición y anulación', async ({
    page,
  }) => {
    // Login como Administrador
    await page.goto('/admin/login');
    await page.locator('#login-email').fill('admin@taller32.local');
    await page.locator('#login-password').fill('Taller32Admin!');
    await page.locator('button[type="submit"]').click();

    // Verificar llegada al Dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
    await expect(page.getByText('Gestión de Servicios y Vehículos')).toBeVisible();

    // Abrir modal de Alta Rápida de Vehículo
    await page.locator('button', { hasText: 'Alta de Vehículo' }).first().click();
    await expect(page.getByText('Alta Rápida de Vehículo')).toBeVisible();

    // Completar datos del vehículo
    await page.locator('input[placeholder*="AA 123"]').fill(adminPlate);
    await page.locator('input[placeholder*="Volkswagen"]').fill('Ford');
    await page.locator('input[placeholder*="Amarok"]').fill('Ranger 4x4');
    await page.locator('input[placeholder="2023"]').fill('2023');
    await page.locator('button[type="submit"]', { hasText: 'Registrar Vehículo' }).click();

    // Debe redirigir a la ficha del vehículo o navegar al listado
    await page.waitForTimeout(2000);
    await page.goto('/admin/vehicles');
    await page.locator('input[placeholder*="Buscar"]').fill(adminPlate);
    await expect(page.getByText('Ford Ranger 4x4')).toBeVisible({ timeout: 6000 });

    // Clic en "Ver Ficha": el vehículo ya no tiene QR propio, solo el enlace del historial
    await page.locator('a', { hasText: 'Ver Ficha' }).first().click();
    await expect(page.getByText('Enlace del Historial')).toBeVisible();
    await expect(page.locator('button', { hasText: 'Imprimir Sticker' })).toHaveCount(0);

    // Cargar nuevo servicio para este vehículo
    await page.locator('a[href*="/admin/services/new?vehicle_id="]').first().click();
    await expect(page.getByText('REGISTRAR NUEVO SERVICIO')).toBeVisible({ timeout: 8000 });

    // Completar formulario con 2 ítems
    await page.locator('textarea[placeholder*="Detallá el trabajo"]').fill('Mantenimiento integral con 2 neumáticos nuevos y válvulas.');

    // Kilometraje
    const kmInput = page.locator('input[type="number"]').first();
    await kmInput.fill('38000');

    // Ítem 1 (ya existente en el formulario)
    const itemConcepto = page.locator('input[placeholder*="Concepto"]').first();
    await itemConcepto.fill('Cubierta Pirelli Scorpion 265/70R16');
    await page.locator('input[placeholder="Cant."]').first().fill('2');
    await page.locator('input[placeholder="Precio Unit."]').first().fill('180000');

    // Agregar segundo ítem
    await page.locator('button', { hasText: 'Agregar Ítem' }).click();
    const secondConcepto = page.locator('input[placeholder*="Concepto"]').nth(1);
    await secondConcepto.fill('Válvulas de alta presión TR414');
    await page.locator('input[placeholder="Cant."]').nth(1).fill('2');
    await page.locator('input[placeholder="Precio Unit."]').nth(1).fill('7500');

    // Guardar el servicio
    await page.locator('button:visible', { hasText: 'Registrar Servicio' }).click();
    await page.waitForTimeout(2500);

    // Volver a la ficha y verificar el servicio creado
    await expect(page.getByText('Mantenimiento integral con 2 neumáticos nuevos').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('38.000 km').first()).toBeVisible();

    // Editar el servicio
    await page.locator('a[href*="/admin/services/"][href*="/edit"]').first().click();
    await expect(page.getByText('Modificar Servicio / Auditoría')).toBeVisible({ timeout: 8000 });

    // Modificar y poner motivo de edición
    await page.locator('input[placeholder*="Corrección de kilometraje"]').fill('Corrección y agregado de notas técnicas.');
    await page.locator('button:visible', { hasText: 'Guardar Cambios' }).click();
    await expect(page).toHaveURL(/\/admin\/vehicles\/[0-9a-f-]+/, { timeout: 10000 });

    // Verificar marca visual "Editado"
    await expect(page.locator('span', { hasText: 'Editado' }).first()).toBeVisible({ timeout: 10000 });

    // Anular el servicio (desde el formulario de edición o desde la ficha)
    await page.locator('a[href*="/admin/services/"][href*="/edit"]').first().click();
    await expect(page.getByText('Modificar Servicio / Auditoría')).toBeVisible({ timeout: 8000 });

    // Clic en el botón "Anular" en la barra de acciones
    await page.locator('button:visible', { hasText: /Anular/i }).first().click();

    // Modal de confirmación de anulación
    await expect(page.locator('h3', { hasText: 'Anular Servicio' })).toBeVisible();
    await page.locator('textarea[placeholder*="la razón por la que se anula"]').fill('Anulado por duplicado de prueba e2e.');
    await page.locator('button:visible', { hasText: 'Confirmar Anulación' }).click();
    await expect(page).toHaveURL(/\/admin\/vehicles\/[0-9a-f-]+/, { timeout: 10000 });

    // Verificar marca visual "Anulado" en la ficha del vehículo
    await expect(page.locator('span', { hasText: 'Anulado' }).first()).toBeVisible({ timeout: 8000 });
  });

  test('3. Flujo Operario: Bloqueo de acceso a /admin/settings y ausencia de botón de anulación', async ({
    page,
  }) => {
    // Cerrar sesión previa limpiando cookies
    await page.context().clearCookies();

    // Login como Operario
    await page.goto('/admin/login');
    await page.locator('#login-email').fill('operario@taller32.local');
    await page.locator('#login-password').fill('Taller32Operario!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });

    // Intentar acceder directamente a /admin/settings
    await page.goto('/admin/settings');

    // El middleware debe rechazarlo y redirigir inmediatamente a /admin/dashboard
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 8000 });

    // Verificar que en el dashboard el botón de anular servicio NO existe para operario
    const anularButton = page.locator('button[title="Anular Servicio"]');
    await expect(anularButton).toHaveCount(0);
  });

  test('4. Robustez de Enlaces: Enlace inexistente y enlace revocado muestran sus mensajes claros', async ({
    page,
  }) => {
    // Caso A: Token inexistente (48 ceros)
    await page.goto('/v/000000000000000000000000000000000000000000000000');
    await expect(page.getByText('Enlace Inexistente')).toBeVisible({ timeout: 8000 });
    await expect(
      page.getByText('El código ingresado no corresponde a ningún vehículo registrado en el taller.')
    ).toBeVisible();

    // Caso B: Token revocado
    if (revokedVehicleToken) {
      await page.goto(`/v/${revokedVehicleToken}`);
      await expect(page.getByText('Acceso Revocado por el Taller')).toBeVisible({ timeout: 8000 });
      await expect(
        page.getByText('El enlace ingresado fue revocado por el personal del taller.')
      ).toBeVisible();
    }
  });
});
