'use server';

import { createClient } from '@/lib/supabase/server';
import { clearLoginAttempts, registerAuthAttempt } from '@/lib/security/auth-rate-limit';
import { isRecentRecoverySession } from '@/lib/security/recovery-session';
import { env } from '@/lib/env';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const resetRequestSchema = z.object({
  email: z.string().trim().email('Ingresá un email válido.'),
});

const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(12, 'La contraseña debe tener al menos 12 caracteres.')
      .max(72, 'La contraseña no puede superar los 72 caracteres.'),
    confirmacion: z.string(),
  })
  .refine((data) => data.password === data.confirmacion, {
    message: 'Las contraseñas no coinciden.',
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

  // Se responde igual exista o no la cuenta, y aunque esta vez la contraseña sea correcta
  if (!(await registerAuthAttempt('login', email))) {
    return {
      error: 'Demasiados intentos de inicio de sesión. Esperá unos minutos y volvé a probar.',
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

  await clearLoginAttempts(email);

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

export async function requestPasswordResetAction(prevState: any, formData: FormData) {
  const validation = resetRequestSchema.safeParse({ email: formData.get('email') });
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message };
  }

  const { email } = validation.data;

  // El límite y cualquier error de envío quedan fuera de la respuesta: dar pistas
  // permitiría averiguar qué emails están registrados.
  if (await registerAuthAttempt('password_reset', email)) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/admin/auth/confirm`,
    });

    if (error) {
      console.error('Error al solicitar la recuperación de contraseña:', error.code || error.status);
    }
  }

  return {
    success: 'Si el email está registrado, te enviamos un enlace para crear una contraseña nueva. Revisá también el correo no deseado.',
  };
}

export async function updatePasswordAction(prevState: any, formData: FormData) {
  const validation = newPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmacion: formData.get('confirmacion'),
  });
  if (!validation.success) {
    return { error: validation.error.issues[0]?.message };
  }

  const supabase = await createClient();

  if (!(await isRecentRecoverySession(supabase))) {
    return { error: 'El enlace venció. Pedí uno nuevo para cambiar tu contraseña.' };
  }

  const { error } = await supabase.auth.updateUser({ password: validation.data.password });

  if (error) {
    if (error.code === 'same_password') {
      return { error: 'La contraseña nueva debe ser distinta de la anterior.' };
    }
    if (error.code === 'weak_password') {
      return { error: 'La contraseña es demasiado débil. Probá con una más larga o menos común.' };
    }
    console.error('Error al actualizar la contraseña:', error.code || error.status);
    return { error: 'No se pudo cambiar la contraseña. Pedí un enlace nuevo y volvé a intentar.' };
  }

  // Cierra todas las sesiones: la anterior pudo quedar abierta en otro dispositivo
  await supabase.auth.signOut();
  redirect('/admin/login?clave=actualizada');
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
