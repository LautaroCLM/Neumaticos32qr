'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const validation = loginSchema.safeParse({ email, password });
  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || 'Datos inválidos',
    };
  }

  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return {
      error: 'Credenciales inválidas. Verificá tu correo y contraseña.',
    };
  }

  // Verificar que el usuario pertenezca al personal activo del taller
  const { data: staffMember, error: staffError } = await supabase
    .from('staff_users')
    .select('id, shop_id, nombre, rol, is_active')
    .eq('id', authData.user.id)
    .single();

  if (staffError || !staffMember || !staffMember.is_active) {
    await supabase.auth.signOut();
    return {
      error: 'Acceso denegado: tu usuario no está habilitado en el personal del taller.',
    };
  }

  redirect('/admin/dashboard');
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

export async function getCurrentStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: staff } = await supabase
    .from('staff_users')
    .select('id, shop_id, nombre, rol, is_active, shops (id, nombre, logo_url, color_primario, color_fondo, telefono, whatsapp, direccion, horarios, ocultar_precios, ticket_config)')
    .eq('id', user.id)
    .single();

  if (!staff || !staff.is_active) return null;

  return {
    user,
    staff,
    shop: (staff as any).shops,
  };
}
