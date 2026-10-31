import { execSync } from 'node:child_process';
import { test, expect, type Page } from '@playwright/test';
import { createUser, login, PASSWORD, submitLogin, uniqueSuffix } from './helpers';

const MAILPIT_URL = process.env.MAILPIT_URL || 'http://127.0.0.1:53324';
const DB_CONTAINER = process.env.SUPABASE_DB_CONTAINER || 'supabase_db_Neumaticos32';
const NEW_PASSWORD = `Nueva-${Date.now()}-Clave!`;
const GENERIC_MESSAGE = 'Si el email está registrado, te enviamos un enlace';

// Una IP por corrida: el tope por IP (10 por hora) no debe arrastrarse entre ejecuciones
test.use({
  extraHTTPHeaders: { 'x-real-ip': `10.88.${Math.floor(Math.random() * 255)}.${Math.floor(1 + Math.random() * 254)}` },
});

async function requestRecovery(page: Page, email: string) {
  await page.goto('/admin/recuperar');
  await page.waitForLoadState('networkidle');
  await page.locator('#recovery-email').fill(email);
  await page.locator('button[type="submit"]', { hasText: 'Enviar Enlace' }).click();
  await expect(page.getByText(GENERIC_MESSAGE)).toBeVisible({ timeout: 15000 });
}

async function recoveryLink(email: string) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const list = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
    if (list.messages?.length) {
      const message = await (await fetch(`${MAILPIT_URL}/api/v1/message/${list.messages[0].ID}`)).json();
      const link = String(message.Text).match(/https?:\/\/\S+verify\S+/)?.[0];
      if (link) return link.replace(/&amp;/g, '&');
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('No llegó el email de recuperación');
}

async function emailCount(email: string) {
  const list = await (await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`)).json();
  return list.messages_count ?? list.messages?.length ?? 0;
}

async function setNewPassword(page: Page, password: string, confirmation = password) {
  await page.locator('#new-password').fill(password);
  await page.locator('#new-password-confirm').fill(confirmation);
  await page.locator('button[type="submit"]', { hasText: 'Guardar Contraseña' }).click();
}

test('Recuperación válida: cambia la contraseña y la anterior deja de servir', async ({ page, context }) => {
  const staff = await createUser('recupera', { rol: 'admin' });

  await page.goto('/admin/login');
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/admin\/recuperar/);

  await requestRecovery(page, staff.email);
  const link = await recoveryLink(staff.email);

  await page.goto(link);
  await expect(page).toHaveURL(/\/admin\/recuperar\/nueva$/, { timeout: 15000 });

  // Validaciones del servidor
  await setNewPassword(page, NEW_PASSWORD, 'otra-clave-distinta-123');
  await expect(page.getByText('Las contraseñas no coinciden.')).toBeVisible({ timeout: 10000 });

  await setNewPassword(page, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/admin\/login\?clave=actualizada/, { timeout: 15000 });
  await expect(page.getByText('Tu contraseña se actualizó.')).toBeVisible();
  expect((await context.cookies()).filter((c) => c.name.includes('auth-token'))).toHaveLength(0);

  await submitLogin(page, staff.email, PASSWORD);
  await expect(page.getByText('Credenciales inválidas')).toBeVisible({ timeout: 10000 });

  await login(page, staff.email, NEW_PASSWORD);
});

test('Enlaces inválidos, reutilizados y vencidos muestran un mensaje claro', async ({ page, context }) => {
  // Inválidos
  await page.goto('/admin/auth/confirm?code=codigo-inventado');
  await expect(page).toHaveURL(/\/admin\/recuperar\?enlace=invalido/);
  await expect(page.getByText('El enlace venció o ya se usó.')).toBeVisible();

  await page.goto('/admin/auth/confirm?token_hash=inventado&type=recovery');
  await expect(page.getByText('El enlace venció o ya se usó.')).toBeVisible();

  await page.goto('/admin/auth/confirm');
  await expect(page.getByText('El enlace venció o ya se usó.')).toBeVisible();

  // Reutilizado: el mismo enlace por segunda vez
  const used = await createUser('reutiliza', { rol: 'admin' });
  await requestRecovery(page, used.email);
  const usedLink = await recoveryLink(used.email);
  await page.goto(usedLink);
  await expect(page).toHaveURL(/\/admin\/recuperar\/nueva$/, { timeout: 15000 });
  await context.clearCookies();
  await page.goto(usedLink);
  await expect(page.getByText('El enlace venció o ya se usó.')).toBeVisible({ timeout: 15000 });

  // Vencido: se envejece la solicitud en la base local
  const expired = await createUser('vencido', { rol: 'admin' });
  await requestRecovery(page, expired.email);
  const expiredLink = await recoveryLink(expired.email);
  execSync(
    `docker exec -i ${DB_CONTAINER} psql -U postgres -d postgres -q -c "UPDATE auth.users SET recovery_sent_at = NOW() - INTERVAL '2 days' WHERE id = '${expired.id}'"`
  );
  await page.goto(expiredLink);
  await expect(page.getByText('El enlace venció o ya se usó.')).toBeVisible({ timeout: 15000 });
});

test('Sin sesión de recuperación no se puede cambiar la contraseña', async ({ page }) => {
  await page.goto('/admin/recuperar/nueva');
  await expect(page.getByText('El enlace venció o no es válido.')).toBeVisible();
  await expect(page.locator('#new-password')).toHaveCount(0);

  // Una sesión normal tampoco alcanza
  const staff = await createUser('sesion', { rol: 'admin' });
  await login(page, staff.email);
  await page.goto('/admin/recuperar/nueva');
  await expect(page.getByText('El enlace venció o no es válido.')).toBeVisible();
  await expect(page.locator('#new-password')).toHaveCount(0);
});

test('La respuesta no revela si el email está registrado y limita los envíos', async ({ page }) => {
  const staff = await createUser('limite', { rol: 'admin' });

  await requestRecovery(page, `nadie-${uniqueSuffix()}@taller32.local`);
  await requestRecovery(page, staff.email);
  await recoveryLink(staff.email);

  // Con el límite alcanzado la respuesta es la misma, pero no salen más emails
  await requestRecovery(page, staff.email);
  await requestRecovery(page, staff.email);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const afterLimit = await emailCount(staff.email);
  await requestRecovery(page, staff.email);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  expect(await emailCount(staff.email)).toBe(afterLimit);
  expect(afterLimit).toBeLessThanOrEqual(3);
});
