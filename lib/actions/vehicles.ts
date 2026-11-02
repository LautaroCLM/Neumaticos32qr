'use server';

import { createClient } from '@/lib/supabase/server';
import {
  customerSchema,
  entityIdSchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
  VehicleCreateValues,
  VehicleUpdateValues,
} from '@/lib/security/validations';
import { findOrCreateCustomer, UNIQUE_VIOLATION } from '@/lib/data/customers';
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

  const { cliente_nombre: clienteNombre, cliente_telefono: clienteTelefono } = validation.data;
  let customerId: string | undefined;

  if (clienteNombre || clienteTelefono) {
    const customer = await findOrCreateCustomer(supabase, staff.shop_id, clienteNombre, clienteTelefono);
    if (customer.error) {
      return { success: false, error: customer.error };
    }
    customerId = customer.customerId;
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

  if (customerId) {
    const { error: ownerErr } = await supabase.rpc('assign_vehicle_owner', {
      p_vehicle_id: newVehicle.id,
      p_customer_id: customerId,
    });

    if (ownerErr) {
      return {
        success: false,
        error: `El vehículo se guardó, pero no se pudo asociar al cliente: ${ownerErr.message}`,
        vehicleId: newVehicle.id,
      };
    }
  }

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/vehicles');
  revalidatePath('/admin/customers');

  return {
    success: true,
    vehicleId: newVehicle.id,
    patente: newVehicle.patente,
  };
}

export async function updateVehicleAction(vehicleId: string, values: VehicleUpdateValues) {
  const validation = vehicleUpdateSchema.safeParse(values);
  if (!validation.success || !entityIdSchema.safeParse(vehicleId).success) {
    return {
      success: false,
      error: validation.error?.issues[0]?.message || 'Datos del vehículo inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  const { data: staff } = await supabase
    .from('staff_users')
    .select('rol')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return { success: false, error: 'Usuario no activo en el personal del taller.' };
  }

  // RLS limita la edición a los vehículos del taller del usuario.
  // Sin coincidencias no hay error: la fila devuelta es lo que confirma el cambio.
  const { data: updated, error } = await supabase
    .from('vehicles')
    .update({
      patente: normalizePatente(validation.data.patente),
      marca: validation.data.marca,
      modelo: validation.data.modelo,
      anio: validation.data.anio || null,
      // La visibilidad de precios es decisión del administrador (también la exige un trigger)
      ...(staff.rol === 'admin' ? { ocultar_precios: validation.data.ocultar_precios || null } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', vehicleId)
    .is('deleted_at', null)
    .select('id');

  if (error) {
    if (error.code !== UNIQUE_VIOLATION) {
      console.error('Error al actualizar el vehículo:', error.code);
    }
    return {
      success: false,
      error:
        error.code === UNIQUE_VIOLATION
          ? 'Ya existe otro vehículo con esa patente.'
          : 'No se pudo guardar el vehículo. Volvé a intentar.',
    };
  }

  if (!updated || updated.length === 0) {
    return {
      success: false,
      error: 'No se guardó ningún cambio: el vehículo ya no existe o no tenés permiso para editarlo.',
    };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath('/admin/vehicles');
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return { success: true };
}

interface ChangeOwnerValues {
  // Cliente existente; si es null se usa nuevoCliente, y sin ninguno de los dos el vehículo queda sin dueño.
  customerId: string | null;
  nuevoCliente?: { nombre: string; telefono?: string | null } | null;
  esTransferencia: boolean;
}

export async function changeVehicleOwnerAction(vehicleId: string, values: ChangeOwnerValues) {
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

  let customerId = values.customerId;

  if (!customerId && values.nuevoCliente) {
    const validation = customerSchema.safeParse(values.nuevoCliente);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || 'Datos del cliente inválidos',
      };
    }

    const customer = await findOrCreateCustomer(
      supabase,
      staff.shop_id,
      validation.data.nombre,
      validation.data.telefono
    );
    if (customer.error || !customer.customerId) {
      return { success: false, error: customer.error || 'Error al guardar el cliente.' };
    }
    customerId = customer.customerId;
  }

  const { data, error } = await supabase.rpc('assign_vehicle_owner', {
    p_vehicle_id: vehicleId,
    p_customer_id: customerId,
    p_es_transferencia: values.esTransferencia,
  });

  if (error || !data?.success) {
    return { success: false, error: error?.message || 'No se pudo cambiar el propietario.' };
  }

  revalidatePath('/admin/vehicles');
  revalidatePath(`/admin/vehicles/${vehicleId}`);
  revalidatePath('/admin/customers');
  return { success: true, newToken: data.new_token as string | null };
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
      error: error?.message || data?.error || 'No se pudo regenerar el enlace del historial.',
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
    .select('id, shop_id, rol')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return { success: false, error: 'Usuario no activo en el personal del taller.' };
  }

  if (staff.rol !== 'admin') {
    return { success: false, error: 'Solo un administrador puede revocar el acceso al historial.' };
  }

  const { data, error } = await supabase.rpc('revoke_vehicle_token', {
    p_vehicle_id: vehicleId,
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || 'No se pudo revocar el enlace del historial.',
    };
  }

  revalidatePath(`/admin/vehicles/${vehicleId}`);
  return {
    success: true,
  };
}
