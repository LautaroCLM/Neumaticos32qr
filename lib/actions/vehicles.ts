'use server';

import { createClient } from '@/lib/supabase/server';
import { vehicleCreateSchema, VehicleCreateValues } from '@/lib/security/validations';
import { normalizePatente } from '@/lib/utils/formatters';
import { revalidatePath } from 'next/cache';

export async function createVehicleAction(values: VehicleCreateValues) {
  const validation = vehicleCreateSchema.safeParse(values);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos del vehículo inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  // Obtener el taller del usuario autenticado
  const { data: staff, error: staffErr } = await supabase
    .from('staff_users')
    .select('shop_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (staffErr || !staff) {
    return { success: false, error: 'No se encontró la membresía del taller o el usuario no está activo.' };
  }

  const normalized = normalizePatente(validation.data.patente);

  // Verificar si la patente ya existe en este taller
  const { data: existing } = await supabase
    .from('vehicles')
    .select('id, patente')
    .eq('shop_id', staff.shop_id)
    .eq('patente', normalized)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `Ya existe un vehículo registrado con la patente ${normalized}.`,
      vehicleId: existing.id,
    };
  }

  // Inserción respetando RLS del usuario. El public_token se genera estrictamente en servidor
  const { data: newVehicle, error: insertErr } = await supabase
    .from('vehicles')
    .insert({
      shop_id: staff.shop_id,
      patente: normalized,
      marca: validation.data.marca.trim(),
      modelo: validation.data.modelo.trim(),
      anio: validation.data.anio || null,
      cliente_nombre: validation.data.cliente_nombre?.trim() || null,
      cliente_telefono: validation.data.cliente_telefono?.trim() || null,
      // NULL hereda la configuración del taller; FALSE la pisaría y dejaría los precios visibles.
      ocultar_precios: validation.data.ocultar_precios || null,
    })
    .select('id, public_token, patente')
    .single();

  if (insertErr || !newVehicle) {
    return {
      success: false,
      error: insertErr?.message || 'Error al guardar el vehículo.',
    };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/vehicles');

  return {
    success: true,
    vehicleId: newVehicle.id,
    patente: newVehicle.patente,
  };
}

export async function regenerateVehicleTokenAction(vehicleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  const { data: staff } = await supabase
    .from('staff_users')
    .select('id, shop_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return { success: false, error: 'Usuario no activo en el personal del taller.' };
  }

  const { data, error } = await supabase.rpc('regenerate_vehicle_token', {
    p_vehicle_id: vehicleId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || 'No se pudo regenerar el token del QR.',
    };
  }

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return {
    success: true,
    newToken: data.new_token,
  };
}

export async function revokeVehicleTokenAction(vehicleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  const { data: staff } = await supabase
    .from('staff_users')
    .select('id, shop_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return { success: false, error: 'Usuario no activo en el personal del taller.' };
  }

  const { data, error } = await supabase.rpc('revoke_vehicle_token', {
    p_vehicle_id: vehicleId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || 'No se pudo revocar el token del QR.',
    };
  }

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return {
    success: true,
  };
}
