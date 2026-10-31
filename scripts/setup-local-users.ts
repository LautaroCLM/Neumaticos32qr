import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const env: Record<string, string> = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:53321';

  // ABORTAR si no apunta a 127.0.0.1 o localhost
  try {
    const parsed = new URL(supabaseUrl);
    const hostname = parsed.hostname;
    if (hostname !== '127.0.0.1' && hostname !== 'localhost') {
      console.error(`\n❌ ERROR DE SEGURIDAD CRÍTICO: setup-local-users.ts solo puede ejecutarse en entorno local (127.0.0.1 o localhost).`);
      console.error(`URL detectada: ${supabaseUrl} (hostname: ${hostname})`);
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`\n❌ ERROR: URL de Supabase inválida: ${supabaseUrl}`);
    process.exit(1);
  }

  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const shopId = '00000000-0000-0000-0000-000000000001';

  const adminPassword = process.env.LOCAL_ADMIN_PASSWORD || env.LOCAL_ADMIN_PASSWORD;
  const operarioPassword = process.env.LOCAL_OPERARIO_PASSWORD || env.LOCAL_OPERARIO_PASSWORD;

  if (!adminPassword || !operarioPassword) {
    console.error('❌ ERROR: LOCAL_ADMIN_PASSWORD y LOCAL_OPERARIO_PASSWORD deben estar definidas en las variables de entorno o en .env.local.');
    process.exit(1);
  }

  const usersToProvision = [
    {
      email: 'admin@taller32.local',
      password: adminPassword,
      nombre: 'Administrador Demo',
      rol: 'admin',
    },
    {
      email: 'operario@taller32.local',
      password: operarioPassword,
      nombre: 'Operario Demo',
      rol: 'operario',
    },
  ];

  for (const u of usersToProvision) {
    // 1. Buscar si existe en Auth
    const { data: list } = await adminClient.auth.admin.listUsers();
    let existingAuth = list.users.find((user) => user.email === u.email);

    let userId: string;
    if (!existingAuth) {
      const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        throw new Error(`Error creando ${u.email}: ${createErr?.message}`);
      }
      userId = created.user.id;
      console.log(`✔ Usuario auth creado: ${u.email}`);
    } else {
      userId = existingAuth.id;
      // Actualizar password por si acaso
      await adminClient.auth.admin.updateUserById(userId, { password: u.password });
      console.log(`✔ Usuario auth existente actualizado: ${u.email}`);
    }

    // 2. Vincular a staff_users
    const { error: staffErr } = await adminClient
      .from('staff_users')
      .upsert(
        {
          id: userId,
          shop_id: shopId,
          nombre: u.nombre,
          rol: u.rol,
          is_active: true,
        },
        { onConflict: 'id' }
      );

    if (staffErr) {
      throw new Error(`Error vinculando staff_users para ${u.email}: ${staffErr.message}`);
    }
    console.log(`✔ Membresía en staff_users asegurada: ${u.nombre} (${u.rol})`);
  }

  console.log('\n✨ Usuarios locales listos para pruebas manuales.');
}

main().catch(console.error);
