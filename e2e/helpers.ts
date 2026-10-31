import { expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';
export const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SHOP_ID = '00000000-0000-0000-0000-000000000001';
export const PASSWORD = `Prueba-${Date.now()}-Local!`;

if (!SUPABASE_URL.includes('127.0.0.1') && !SUPABASE_URL.includes('localhost')) {
  throw new Error(
    '⛔ ABORTADO POR SEGURIDAD: Playwright solo puede ejecutarse contra una base de datos local (127.0.0.1 o localhost).'
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const uniqueSuffix = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

export function randomPlate() {
  const letters = () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26), 65 + Math.floor(Math.random() * 26));
  return `${letters()}${Math.floor(100 + Math.random() * 900)}${letters()}`;
}

export async function createUser(
  tag: string,
  staff?: { rol: 'admin' | 'operario'; isActive?: boolean }
) {
  const email = `${tag}-${uniqueSuffix()}@taller32.local`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`Error creando usuario: ${error?.message}`);

  if (staff) {
    const { error: staffError } = await supabaseAdmin.from('staff_users').insert({
      id: data.user.id,
      shop_id: SHOP_ID,
      nombre: tag,
      rol: staff.rol,
      is_active: staff.isActive ?? true,
    });
    if (staffError) throw new Error(`Error vinculando personal: ${staffError.message}`);
  }

  return { email, id: data.user.id };
}

export async function apiClient(email: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`Error iniciando sesión: ${error.message}`);
  return client;
}

export async function submitLogin(page: Page, email: string, password = PASSWORD) {
  // Sin esperar networkidle: la precarga de "/" usa stale-while-revalidate y Chromium no
  // reporta el fin de esa revalidación. El formulario funciona aunque no haya hidratado.
  await page.goto('/admin/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('button[type="submit"]', { hasText: 'Ingresar' }).click();
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await submitLogin(page, email, password);
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 });
}

export async function createVehicle() {
  const { data, error } = await supabaseAdmin
    .from('vehicles')
    .insert({ shop_id: SHOP_ID, patente: randomPlate(), marca: 'Fiat', modelo: 'Cronos' })
    .select('id, public_token, patente')
    .single();
  if (error || !data) throw new Error(`Error creando vehículo: ${error?.message}`);
  return data;
}

export async function createCustomer() {
  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({ shop_id: SHOP_ID, nombre: `Cliente ${uniqueSuffix()}` })
    .select('id, nombre')
    .single();
  if (error || !data) throw new Error(`Error creando cliente: ${error?.message}`);
  return data;
}
