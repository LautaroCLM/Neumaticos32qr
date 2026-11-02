import { test, expect, type Page } from '@playwright/test';
import { createUser, createVehicle, login, supabaseAdmin } from './helpers';

// Playwright desplaza la página hasta el elemento antes de hacer clic, así que un modal
// que quedó fuera de la pantalla igual "funciona" en los demás tests. Acá se mide.
async function expectInsideViewport(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize()!;
  expect(box, `${selector} no tiene caja`).not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeLessThan(viewport.height);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
}

const overlay = '.fixed.inset-0';

for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 900 }]) {
  test.describe(`Modales del panel a ${viewport.width}px`, () => {
    test.use({ viewport });
    let email: string;

    test.beforeAll(async () => {
      email = (await createUser('modales', { rol: 'admin' })).email;
    });

    test('Alta de vehículo y QR se abren dentro de la pantalla', async ({ page }) => {
      await login(page, email);
      await page.locator('button', { hasText: 'Alta de Vehículo' }).click();
      await expectInsideViewport(page, `${overlay} > div`);
      const overlayBox = await page.locator(overlay).boundingBox();
      expect(overlayBox!.y).toBe(0);
      expect(overlayBox!.height).toBe(viewport.height);

      const vehicle = await createVehicle();
      await page.goto(`/admin/vehicles/${vehicle.id}`);
      await page.locator('button', { hasText: 'Imprimir Sticker' }).click();
      await expectInsideViewport(page, `${overlay} > div`);
    });
  });
}

test('El sticker impreso no ejecuta HTML cargado en el modelo del vehículo', async ({ page, context }) => {
  const { email } = await createUser('sticker', { rol: 'admin' });
  const vehicle = await createVehicle();
  const payload = '<img src=x onerror="document.title=\'inyectado\'">';
  await supabaseAdmin.from('vehicles').update({ modelo: payload }).eq('id', vehicle.id);

  // La ventana de impresión no debe abrir el diálogo real durante el test
  await context.addInitScript(() => {
    window.print = () => {};
  });
  await login(page, email);
  await page.goto(`/admin/vehicles/${vehicle.id}`);
  await page.locator('button', { hasText: 'Imprimir Sticker' }).click();

  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.locator(overlay).getByText('Imprimir Sticker', { exact: false }).click(),
  ]);
  await popup.waitForLoadState('load');
  await expect(popup.locator('.car-info')).toContainText(payload);
  expect(await popup.title()).not.toBe('inyectado');
  expect(await popup.locator('.car-info img').count()).toBe(0);
});
