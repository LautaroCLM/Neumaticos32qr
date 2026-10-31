import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';

if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  throw new Error(
    '⛔ ABORTADO POR SEGURIDAD: Playwright solo puede ejecutarse contra una base de datos local (127.0.0.1 o localhost).'
  );
}

const SHOP_ID = '00000000-0000-0000-0000-000000000001';
const PASSWORD = `Sesion-${Date.now()}-Prueba!`;

const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createStaff(tag: string) {
  const email = `${tag}-${Date.now()}@taller32.local`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Error creando usuario: ${error?.message}`);

  await supabaseAdmin
    .from('staff_users')
    .insert({ id: data.user.id, shop_id: SHOP_ID, nombre: tag, rol: 'admin', is_active: true });

  return { email, id: data.user.id };
}

async function login(page: Page, email: string) {
  await page.goto('/admin/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(PASSWORD);
  await page.locator('button[type="submit"]', { hasText: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
}

const sessionCookies = async (page: Page) =>
  (await page.context().cookies()).filter((cookie) => cookie.name.includes('auth-token'));

test('La cookie de sesión no es legible desde el navegador y dura 30 días', async ({ page }) => {
  const staff = await createStaff('cookie');
  await login(page, staff.email);

  const cookies = await sessionCookies(page);
  expect(cookies.length).toBeGreaterThan(0);

  for (const cookie of cookies) {
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    const days = (cookie.expires - Date.now() / 1000) / 86400;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
  }

  expect(await page.evaluate(() => document.cookie)).not.toContain('auth-token');

  await page.reload();
  await expect(page.getByText('Gestión de Servicios y Vehículos')).toBeVisible();
});

for (const [caso, quitarAcceso] of [
  ['desactivado', (id: string) => supabaseAdmin.from('staff_users').update({ is_active: false }).eq('id', id)],
  ['quitado del personal', (id: string) => supabaseAdmin.from('staff_users').delete().eq('id', id)],
] as const) {
  test(`Usuario ${caso} con la sesión abierta: se cierra sin bucle de redirecciones`, async ({ page }) => {
    const staff = await createStaff('baja');
    await login(page, staff.email);
    await quitarAcceso(staff.id);

    let navigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });

    await page.goto('/admin/dashboard');
    // Una precarga del panel puede cerrar la sesión antes: entonces llega al login sin el aviso
    await expect(page).toHaveURL(/\/admin\/login\?(acceso=denegado|redirectTo=)/);
    expect(await sessionCookies(page)).toHaveLength(0);

    // Sin bucle: se queda en el login
    await page.waitForTimeout(3000);
    expect(navigations).toBeLessThanOrEqual(2);
    await expect(page).toHaveURL(/\/admin\/login/);
  });
}
