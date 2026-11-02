import { test, expect, type Page } from '@playwright/test';
import {
  apiClient,
  createCustomer,
  createUser,
  createVehicle,
  login,
  randomPlate,
  SHOP_ID,
  submitLogin,
  supabaseAdmin,
  uniqueSuffix,
} from './helpers';

const FORBIDDEN = '42501';

test.describe('Permisos efectivos por rol', () => {
  let operario: { email: string; id: string };
  let admin: { email: string; id: string };

  test.beforeAll(async () => {
    operario = await createUser('permisos-operario', { rol: 'operario' });
    admin = await createUser('permisos-admin', { rol: 'admin' });
  });

  test('Operario: conserva sus tareas diarias', async () => {
    const client = await apiClient(operario.email);
    const { data: user } = await client.auth.getUser();

    const { data: vehicle, error: vehicleError } = await client
      .from('vehicles')
      .insert({ shop_id: SHOP_ID, patente: randomPlate(), marca: 'Ford', modelo: 'Ka', ocultar_precios: true })
      .select('id')
      .single();
    expect(vehicleError).toBeNull();

    const { data: edited } = await client.from('vehicles').update({ modelo: 'Ka 2' }).eq('id', vehicle!.id).select('id');
    expect(edited).toHaveLength(1);

    const { data: customer, error: customerError } = await client
      .from('customers')
      .insert({ shop_id: SHOP_ID, nombre: `Cliente ${uniqueSuffix()}` })
      .select('id')
      .single();
    expect(customerError).toBeNull();

    const owner = await client.rpc('assign_vehicle_owner', { p_vehicle_id: vehicle!.id, p_customer_id: customer!.id });
    expect(owner.error).toBeNull();

    const { data: service, error: serviceError } = await client
      .from('services')
      .insert({
        vehicle_id: vehicle!.id,
        shop_id: SHOP_ID,
        kilometraje: 1000,
        tipo: 'frenos',
        descripcion: 'Cambio de pastillas',
        created_by: user.user!.id,
      })
      .select('id')
      .single();
    expect(serviceError).toBeNull();

    const edit = await client.rpc('update_service_with_audit', {
      p_service_id: service!.id,
      p_datos: { descripcion: 'Cambio de pastillas y discos' },
      p_motivo: 'Corrección',
    });
    expect(edit.error).toBeNull();

    const regenerate = await client.rpc('regenerate_vehicle_token', { p_vehicle_id: vehicle!.id });
    expect(regenerate.error).toBeNull();
  });

  test('Operario: no puede ejecutar acciones administrativas por API', async () => {
    const client = await apiClient(operario.email);
    const vehicle = await createVehicle();
    const customer = await createCustomer();

    const softDeleteVehicle = await client.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', vehicle.id);
    expect(softDeleteVehicle.error?.code).toBe(FORBIDDEN);

    const hidePrices = await client.from('vehicles').update({ ocultar_precios: true }).eq('id', vehicle.id);
    expect(hidePrices.error?.code).toBe(FORBIDDEN);

    const softDeleteCustomer = await client.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', customer.id);
    expect(softDeleteCustomer.error?.code).toBe(FORBIDDEN);

    const revoke = await client.rpc('revoke_vehicle_token', { p_vehicle_id: vehicle.id });
    expect(revoke.error?.code).toBe(FORBIDDEN);
    const { data: stillActive } = await supabaseAdmin.from('vehicles').select('token_revoked_at, deleted_at').eq('id', vehicle.id).single();
    expect(stillActive).toEqual({ token_revoked_at: null, deleted_at: null });

    const shop = await client.from('shops').update({ nombre: 'Hackeado' }).eq('id', SHOP_ID).select();
    expect(shop.data || []).toHaveLength(0);

    const template = await client.from('service_templates').insert({ shop_id: SHOP_ID, nombre: `x${uniqueSuffix()}`, tipo: 'otro' });
    expect(template.error).toBeTruthy();
  });

  test('Operario: no puede escalar privilegios ni ver al resto del personal', async () => {
    const client = await apiClient(operario.email);

    const staff = await client.from('staff_users').select('id');
    expect(staff.data?.map((row) => row.id)).toEqual([operario.id]);

    const promote = await client.from('staff_users').update({ rol: 'admin' }).eq('id', operario.id);
    expect(promote.error?.code).toBe(FORBIDDEN);

    const addStaff = await client.from('staff_users').insert({ id: admin.id, shop_id: SHOP_ID, nombre: 'x', rol: 'admin' });
    expect(addStaff.error).toBeTruthy();

    const owners = await client.from('vehicle_owners').delete().eq('shop_id', SHOP_ID);
    expect(owners.error?.code).toBe(FORBIDDEN);

    const attempts = await client.rpc('register_auth_attempt', { p_kind: 'login', p_account_key: 'x', p_ip: '1.1.1.1' });
    expect(attempts.error?.code).toBe(FORBIDDEN);
    const clear = await client.rpc('clear_login_attempts', { p_account_key: 'x', p_ip: '1.1.1.1' });
    expect(clear.error?.code).toBe(FORBIDDEN);
  });

  test('Administrador: ejecuta las acciones reservadas', async () => {
    const client = await apiClient(admin.email);
    const vehicle = await createVehicle();
    const customer = await createCustomer();

    const staff = await client.from('staff_users').select('id');
    expect((staff.data || []).length).toBeGreaterThan(1);

    const hide = await client.from('vehicles').update({ ocultar_precios: true }).eq('id', vehicle.id).select('id');
    expect(hide.data).toHaveLength(1);

    const revoke = await client.rpc('revoke_vehicle_token', { p_vehicle_id: vehicle.id });
    expect(revoke.error).toBeNull();

    const softDeleteCustomer = await client.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', customer.id).select('id');
    expect(softDeleteCustomer.data).toHaveLength(1);

    const softDeleteVehicle = await client.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', vehicle.id);
    expect(softDeleteVehicle.error).toBeNull();
    const { data } = await supabaseAdmin.from('vehicles').select('deleted_at').eq('id', vehicle.id).single();
    expect(data?.deleted_at).not.toBeNull();
  });

  test('La interfaz coincide: operario sin revocar ni ocultar precios, admin con ambos', async ({ browser }) => {
    const vehicle = await createVehicle();

    const checkPanel = async (email: string, canManage: boolean) => {
      const context = await browser.newContext({ baseURL: test.info().project.use.baseURL });
      const page: Page = await context.newPage();
      await login(page, email);
      await page.goto(`/admin/vehicles/${vehicle.id}`);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('button', { hasText: 'Regenerar Enlace' })).toBeVisible();
      await expect(page.locator('button', { hasText: 'Revocar Acceso' })).toHaveCount(canManage ? 1 : 0);
      await page.locator('button', { hasText: 'Editar Vehículo' }).click();
      await expect(page.getByText('Ocultar precios en el ticket público')).toHaveCount(canManage ? 1 : 0);

      // El operario puede editar sin que el trigger de precios le rechace el guardado
      await page.locator('#edit-modelo').fill(canManage ? 'Modelo Admin' : 'Modelo Operario');
      await page.locator('form button[type="submit"]', { hasText: 'Guardar' }).click();
      await expect(page.locator('#edit-modelo')).toHaveCount(0, { timeout: 10000 });
      await context.close();
    };

    await checkPanel(operario.email, false);
    await checkPanel(admin.email, true);
  });

  test('Usuario inactivo y usuario sin vinculación: sin datos y sin acciones', async ({ page }) => {
    const inactive = await createUser('permisos-inactivo', { rol: 'admin', isActive: false });
    const noStaff = await createUser('permisos-sin-staff');
    const vehicle = await createVehicle();

    for (const user of [inactive, noStaff]) {
      await submitLogin(page, user.email);
      await expect(page.getByText('Acceso denegado')).toBeVisible({ timeout: 10000 });

      const client = await apiClient(user.email);
      for (const table of ['vehicles', 'customers', 'services', 'shops', 'vehicle_owners', 'service_revisions']) {
        const { data } = await client.from(table).select('*');
        expect(data || []).toHaveLength(0);
      }

      const insert = await client.from('vehicles').insert({ shop_id: SHOP_ID, patente: randomPlate(), marca: 'x', modelo: 'y' });
      expect(insert.error).toBeTruthy();

      const update = await client.from('vehicles').update({ modelo: 'x' }).eq('id', vehicle.id).select('id');
      expect(update.data || []).toHaveLength(0);

      for (const [fn, args] of [
        ['regenerate_vehicle_token', { p_vehicle_id: vehicle.id }],
        ['revoke_vehicle_token', { p_vehicle_id: vehicle.id }],
        ['assign_vehicle_owner', { p_vehicle_id: vehicle.id, p_customer_id: null }],
      ] as const) {
        expect((await client.rpc(fn, args)).error).toBeTruthy();
      }
    }

    // Su propia fila no da más permisos: un inactivo no puede reactivarse
    const client = await apiClient(inactive.email);
    const reactivate = await client.from('staff_users').update({ is_active: true }).eq('id', inactive.id);
    expect(reactivate.error?.code).toBe(FORBIDDEN);
  });
});
