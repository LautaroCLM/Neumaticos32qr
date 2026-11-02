import { test, expect, type Page } from '@playwright/test';
import QRCode from 'qrcode';
import fs from 'node:fs';
import { createUser, createVehicle, login, supabaseAdmin, SHOP_ID } from './helpers';

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

    test('Alta y edición de vehículo se abren dentro de la pantalla', async ({ page }) => {
      await login(page, email);
      await page.locator('button', { hasText: 'Alta de Vehículo' }).click();
      await expectInsideViewport(page, `${overlay} > div`);
      const overlayBox = await page.locator(overlay).boundingBox();
      expect(overlayBox!.y).toBe(0);
      expect(overlayBox!.height).toBe(viewport.height);

      const vehicle = await createVehicle();
      await page.goto(`/admin/vehicles/${vehicle.id}`);
      await page.locator('button', { hasText: 'Editar Vehículo' }).click();
      await expectInsideViewport(page, `${overlay} > div`);
    });
  });
}

test.describe('QR general del taller', () => {
  let email: string;

  test.beforeAll(async () => {
    email = (await createUser('qr-local', { rol: 'admin' })).email;
  });

  const openQrTab = async (page: Page) => {
    await login(page, email);
    await page.goto('/admin/settings');
    await page.locator('button', { hasText: 'QR del Local' }).click();
  };

  test('El PNG descargado codifica la página principal y no un vehículo', async ({ page }) => {
    await openQrTab(page);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!.replace(/\/+$/, '');
    await expect(page.locator('input[readonly]')).toHaveValue(`${siteUrl}/`);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('button', { hasText: 'Descargar PNG' }).click(),
    ]);
    // Se lee la matriz del PNG descargado (centro de cada módulo) y se compara con la que
    // corresponde a la página principal: si coinciden, el QR lleva ahí y no a un vehículo.
    const expected = QRCode.create(`${siteUrl}/`, { errorCorrectionLevel: 'H' }).modules;
    const pngBase64 = fs.readFileSync(await download.path()).toString('base64');
    const read = await page.evaluate(
      async ({ src, size, margin }) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const scale = img.width / (size + margin * 2);
        const dark: boolean[] = [];
        for (let row = 0; row < size; row++) {
          for (let col = 0; col < size; col++) {
            const x = Math.floor((col + margin + 0.5) * scale);
            const y = Math.floor((row + margin + 0.5) * scale);
            dark.push(ctx.getImageData(x, y, 1, 1).data[0] < 128);
          }
        }
        return dark;
      },
      { src: `data:image/png;base64,${pngBase64}`, size: expected.size, margin: 2 }
    );
    const mismatches = read.filter((d, i) => d !== Boolean(expected.data[i])).length;
    expect(mismatches).toBe(0);
  });

  test('La hoja A4 trae 12 stickers y escapa el nombre del taller', async ({ page, context }) => {
    const { data: shop } = await supabaseAdmin.from('shops').select('nombre').eq('id', SHOP_ID).single();
    const payload = '<img src=x onerror="document.title=\'inyectado\'">';
    await supabaseAdmin.from('shops').update({ nombre: payload }).eq('id', SHOP_ID);

    try {
      // La ventana de impresión no debe abrir el diálogo real durante el test
      await context.addInitScript(() => {
        window.print = () => {};
      });
      await openQrTab(page);

      const [popup] = await Promise.all([
        page.waitForEvent('popup'),
        page.locator('button', { hasText: 'Imprimir hoja de 12 stickers' }).click(),
      ]);
      await popup.waitForLoadState('load');
      await expect(popup.locator('.sticker')).toHaveCount(12);
      await expect(popup.locator('.sticker img.qr')).toHaveCount(12);
      expect(await popup.title()).not.toBe('inyectado');
      expect(await popup.locator('.sticker img.logo').first().getAttribute('alt')).toBe(payload);
    } finally {
      await supabaseAdmin.from('shops').update({ nombre: shop!.nombre }).eq('id', SHOP_ID);
    }
  });
});
