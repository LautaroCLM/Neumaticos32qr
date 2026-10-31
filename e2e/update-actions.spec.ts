import { test, expect, type Page } from '@playwright/test';
import { createCustomer, createUser, createVehicle, login, supabaseAdmin } from './helpers';

async function openVehicleEdit(page: Page, vehicleId: string) {
  await page.goto(`/admin/vehicles/${vehicleId}`);
  await page.waitForLoadState('networkidle');
  await page.locator('button', { hasText: 'Editar Vehículo' }).click();
}

async function openCustomerEdit(page: Page, nombre: string) {
  await page.goto('/admin/customers');
  await page.waitForLoadState('networkidle');
  await page.getByPlaceholder('Buscar por nombre').fill(nombre);
  await page.locator('button[title="Editar cliente"]').click();
}

const saveModal = (page: Page) => page.locator('form button[type="submit"]', { hasText: 'Guardar' }).click();

test.describe('Falsos éxitos al actualizar', () => {
  let email: string;

  test.beforeAll(async () => {
    email = (await createUser('actualiza', { rol: 'admin' })).email;
  });

  test('Vehículo: guarda, cierra el modal y persiste en la base', async ({ page }) => {
    const vehicle = await createVehicle();
    await login(page, email);
    await openVehicleEdit(page, vehicle.id);
    await page.locator('#edit-modelo').fill('Cronos Drive');
    await saveModal(page);

    await expect(page.locator('#edit-modelo')).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Cronos Drive/i })).toBeVisible();
    const { data } = await supabaseAdmin.from('vehicles').select('modelo').eq('id', vehicle.id).single();
    expect(data?.modelo).toBe('Cronos Drive');
  });

  test('Vehículo dado de baja mientras se edita: informa el error y no cierra', async ({ page }) => {
    const vehicle = await createVehicle();
    await login(page, email);
    await openVehicleEdit(page, vehicle.id);
    await page.locator('#edit-modelo').fill('No Debe Guardarse');

    await supabaseAdmin.from('vehicles').update({ deleted_at: new Date().toISOString() }).eq('id', vehicle.id);
    await saveModal(page);

    await expect(page.getByText('No se guardó ningún cambio')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#edit-modelo')).toBeVisible();
    const { data } = await supabaseAdmin.from('vehicles').select('modelo').eq('id', vehicle.id).single();
    expect(data?.modelo).toBe('Cronos');
  });

  test('Vehículo: patente repetida y patente inválida informan el error', async ({ page }) => {
    const vehicle = await createVehicle();
    const other = await createVehicle();
    await login(page, email);
    await openVehicleEdit(page, vehicle.id);

    await page.locator('#edit-patente').fill(other.patente);
    await saveModal(page);
    await expect(page.getByText('Ya existe otro vehículo con esa patente.')).toBeVisible({ timeout: 10000 });

    await page.locator('#edit-patente').fill('NOVALIDA');
    await saveModal(page);
    await expect(page.getByText('Patente inválida')).toBeVisible({ timeout: 10000 });

    const { data } = await supabaseAdmin.from('vehicles').select('patente').eq('id', vehicle.id).single();
    expect(data?.patente).toBe(vehicle.patente);
  });

  test('Cliente: guarda, cierra el modal y persiste en la base', async ({ page }) => {
    const customer = await createCustomer();
    await login(page, email);
    await openCustomerEdit(page, customer.nombre);
    await page.locator('#customer-nombre').fill(`${customer.nombre} Editado`);
    await saveModal(page);

    await expect(page.locator('#customer-nombre')).toHaveCount(0, { timeout: 10000 });
    const { data } = await supabaseAdmin.from('customers').select('nombre').eq('id', customer.id).single();
    expect(data?.nombre).toBe(`${customer.nombre} Editado`);
  });

  test('Cliente dado de baja mientras se edita: informa el error y no cierra', async ({ page }) => {
    const customer = await createCustomer();
    await login(page, email);
    await openCustomerEdit(page, customer.nombre);
    await page.locator('#customer-nombre').fill('No Debe Guardarse');

    await supabaseAdmin.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', customer.id);
    await saveModal(page);

    await expect(page.getByText('No se guardó ningún cambio')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#customer-nombre')).toBeVisible();
    const { data } = await supabaseAdmin.from('customers').select('nombre').eq('id', customer.id).single();
    expect(data?.nombre).toBe(customer.nombre);
  });

  test('Cliente: teléfono inválido informa el error', async ({ page }) => {
    const customer = await createCustomer();
    await login(page, email);
    await openCustomerEdit(page, customer.nombre);
    await page.locator('#customer-telefono').fill('123');
    await saveModal(page);
    await expect(page.getByText(/Teléfono inválido/)).toBeVisible({ timeout: 10000 });
  });
});
