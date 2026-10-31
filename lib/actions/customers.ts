'use server';

import { createClient } from '@/lib/supabase/server';
import { customerSchema, CustomerValues } from '@/lib/security/validations';
import { UNIQUE_VIOLATION } from '@/lib/data/customers';
import { revalidatePath } from 'next/cache';

const DUPLICATE_PHONE_ERROR = 'Ya existe un cliente con ese teléfono.';

export async function createCustomerAction(values: CustomerValues) {
  const validation = customerSchema.safeParse(values);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos del cliente inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  const { data: staff } = await supabase
    .from('staff_users')
    .select('shop_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return { success: false, error: 'Usuario no activo en el personal del taller.' };
  }

  const { error } = await supabase.from('customers').insert({
    shop_id: staff.shop_id,
    nombre: validation.data.nombre,
    telefono: validation.data.telefono,
    email: validation.data.email || null,
    notas_internas: validation.data.notas_internas || null,
  });

  if (error) {
    return {
      success: false,
      error: error.code === UNIQUE_VIOLATION ? DUPLICATE_PHONE_ERROR : error.message,
    };
  }

  revalidatePath('/admin/customers');
  return { success: true };
}

export async function updateCustomerAction(customerId: string, values: CustomerValues) {
  const validation = customerSchema.safeParse(values);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos del cliente inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  // RLS limita la edición a los clientes del taller del usuario
  const { error } = await supabase
    .from('customers')
    .update({
      nombre: validation.data.nombre,
      telefono: validation.data.telefono,
      email: validation.data.email || null,
      notas_internas: validation.data.notas_internas || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .is('deleted_at', null);

  if (error) {
    return {
      success: false,
      error: error.code === UNIQUE_VIOLATION ? DUPLICATE_PHONE_ERROR : error.message,
    };
  }

  revalidatePath('/admin/customers');
  return { success: true };
}
