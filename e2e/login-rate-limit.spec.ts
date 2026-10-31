import { createHash } from 'node:crypto';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { createUser, login, submitLogin, supabaseAdmin, uniqueSuffix } from './helpers';

const BLOCKED = 'Demasiados intentos de inicio de sesión';
const INVALID = 'Credenciales inválidas';

const randomIp = () =>
  `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(1 + Math.random() * 254)}`;
const accountKey = (email: string) => createHash('sha256').update(email.toLowerCase()).digest('hex');

async function pageFromIp(browser: Browser, ip: string) {
  const context = await browser.newContext({
    baseURL: test.info().project.use.baseURL,
    extraHTTPHeaders: { 'x-real-ip': ip },
  });
  return context.newPage();
}

async function failLogin(page: Page, email: string, expected = INVALID) {
  await submitLogin(page, email, 'contrasena-incorrecta-123');
  await expect(page.getByText(expected)).toBeVisible({ timeout: 15000 });
}

const register = (key: string, ip: string, kind = 'login') =>
  supabaseAdmin.rpc('register_auth_attempt', { p_kind: kind, p_account_key: key, p_ip: ip });

test.describe('Login desde la aplicación', () => {
  test('5 fallos bloquean esa cuenta desde esa IP, incluso con la contraseña correcta', async ({ browser }) => {
    const staff = await createUser('limite-login', { rol: 'admin' });
    const page = await pageFromIp(browser, randomIp());

    for (let i = 0; i < 5; i += 1) await failLogin(page, staff.email);

    await submitLogin(page, staff.email);
    await expect(page.getByText(BLOCKED)).toBeVisible({ timeout: 15000 });
    expect(page.url()).toContain('/admin/login');
  });

  test('Un tercero no bloquea a la persona real desde otra IP', async ({ browser }) => {
    const staff = await createUser('limite-tercero', { rol: 'admin' });
    const attacker = await pageFromIp(browser, randomIp());
    for (let i = 0; i < 5; i += 1) await failLogin(attacker, staff.email);

    const owner = await pageFromIp(browser, randomIp());
    await login(owner, staff.email);
  });

  test('El mensaje no permite saber si la cuenta existe', async ({ browser }) => {
    const page = await pageFromIp(browser, randomIp());
    const unknown = `nadie-${uniqueSuffix()}@taller32.local`;

    for (let i = 0; i < 5; i += 1) await failLogin(page, unknown);
    await failLogin(page, unknown, BLOCKED);
  });

  test('El bloqueo se recupera solo al vencer la ventana', async ({ browser }) => {
    const staff = await createUser('limite-vence', { rol: 'admin' });
    const page = await pageFromIp(browser, randomIp());

    for (let i = 0; i < 5; i += 1) await failLogin(page, staff.email);
    await submitLogin(page, staff.email);
    await expect(page.getByText(BLOCKED)).toBeVisible({ timeout: 15000 });

    await supabaseAdmin
      .from('rate_limit_attempts')
      .update({ attempted_at: new Date(Date.now() - 16 * 60 * 1000).toISOString() })
      .eq('target_type', 'login')
      .eq('target_key', accountKey(staff.email));

    await login(page, staff.email);
  });

  test('Entrar correctamente olvida los errores de esa IP', async ({ browser }) => {
    const staff = await createUser('limite-limpia', { rol: 'admin' });
    const page = await pageFromIp(browser, randomIp());

    for (let i = 0; i < 4; i += 1) await failLogin(page, staff.email);
    await login(page, staff.email);

    const { count } = await supabaseAdmin
      .from('rate_limit_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('target_type', 'login')
      .eq('target_key', accountKey(staff.email));
    expect(count).toBe(0);
  });

  test('La base no guarda el email ni la contraseña', async ({ browser }) => {
    const email = `privado-${uniqueSuffix()}@taller32.local`;
    const page = await pageFromIp(browser, randomIp());
    await failLogin(page, email);

    const { data } = await supabaseAdmin
      .from('rate_limit_attempts')
      .select('target_key')
      .eq('target_key', accountKey(email));
    expect(data).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('privado');
  });
});

test.describe('Contador en la base', () => {
  test('20 fallos desde una IP la bloquean para otras cuentas, no a las demás IP', async () => {
    const ip = randomIp();
    for (let i = 0; i < 20; i += 1) {
      const { data } = await register(`cuenta-ip-${uniqueSuffix()}`, ip);
      expect(data.allowed).toBe(true);
    }
    expect((await register(`cuenta-ip-${uniqueSuffix()}`, ip)).data.allowed).toBe(false);
    expect((await register(`cuenta-ip-${uniqueSuffix()}`, randomIp())).data.allowed).toBe(true);
  });

  test('20 fallos desde IP distintas bloquean la cuenta hasta que venza la ventana', async () => {
    const key = `cuenta-distribuida-${uniqueSuffix()}`;
    for (let i = 0; i < 20; i += 1) {
      expect((await register(key, randomIp())).data.allowed).toBe(true);
    }
    expect((await register(key, randomIp())).data.allowed).toBe(false);

    await supabaseAdmin
      .from('rate_limit_attempts')
      .update({ attempted_at: new Date(Date.now() - 16 * 60 * 1000).toISOString() })
      .eq('target_key', key);
    expect((await register(key, randomIp())).data.allowed).toBe(true);
  });

  test('Los rechazados no alargan el bloqueo', async () => {
    const key = `cuenta-rechazos-${uniqueSuffix()}`;
    const ip = randomIp();
    for (let i = 0; i < 5; i += 1) await register(key, ip);
    for (let i = 0; i < 5; i += 1) expect((await register(key, ip)).data.allowed).toBe(false);

    const { count } = await supabaseAdmin
      .from('rate_limit_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('target_key', key);
    expect(count).toBe(5);
  });

  test('Intentos simultáneos no superan el límite', async () => {
    const key = `cuenta-paralela-${uniqueSuffix()}`;
    const ip = randomIp();
    const results = await Promise.all(Array.from({ length: 15 }, () => register(key, ip)));
    expect(results.filter((result) => result.data?.allowed).length).toBe(5);
  });

  test('La recuperación de contraseña tiene su propio límite', async () => {
    const key = `cuenta-reset-${uniqueSuffix()}`;
    for (let i = 0; i < 3; i += 1) {
      expect((await register(key, randomIp(), 'password_reset')).data.allowed).toBe(true);
    }
    expect((await register(key, randomIp(), 'password_reset')).data.allowed).toBe(false);
    expect((await register(key, randomIp())).data.allowed).toBe(true);
  });
});
