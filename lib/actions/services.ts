'use server';

import { createClient } from '@/lib/supabase/server';
import { serviceFormSchema, ServiceFormValues } from '@/lib/security/validations';
import { revalidatePath } from 'next/cache';

export async function createServiceAction(values: ServiceFormValues) {
  const validation = serviceFormSchema.safeParse(values);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos del servicio inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  const { data: staff, error: staffErr } = await supabase
    .from('staff_users')
    .select('shop_id')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (staffErr || !staff) {
    return { success: false, error: 'No se encontró la membresía del taller.' };
  }

  // Insertar servicio bajo la sesión del usuario (respetando RLS)
  // El trigger BEFORE INSERT OR UPDATE trg_services_recalc_total recalculará el total automáticamente
  const { data: newService, error: insertErr } = await supabase
    .from('services')
    .insert({
      vehicle_id: validation.data.vehicle_id,
      shop_id: staff.shop_id,
      fecha_hora: validation.data.fecha_hora,
      kilometraje: validation.data.kilometraje,
      tipo: validation.data.tipo,
      descripcion: validation.data.descripcion.trim(),
      productos: validation.data.productos?.trim() || null,
      items: validation.data.items || [],
      total_manual: validation.data.total_manual !== undefined ? validation.data.total_manual : null,
      proximo_servicio_km: validation.data.proximo_servicio_km || null,
      proximo_servicio_fecha: validation.data.proximo_servicio_fecha || null,
      sucursal: validation.data.sucursal?.trim() || 'Casa Central',
      notas_internas: validation.data.notas_internas?.trim() || null,
      notas_cliente: validation.data.notas_cliente?.trim() || null,
      campos_extra: validation.data.campos_extra || [],
      visibilidad: validation.data.visibilidad,
      created_by: user.id,
    })
    .select('id, vehicle_id')
    .single();

  if (insertErr || !newService) {
    return {
      success: false,
      error: insertErr?.message || 'Error guardando el servicio.',
    };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/vehicles/${newService.vehicle_id}`);

  return {
    success: true,
    serviceId: newService.id,
    vehicleId: newService.vehicle_id,
  };
}

export async function updateServiceAction(
  serviceId: string,
  values: Partial<ServiceFormValues>,
  motivo?: string
) {
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
    return { success: false, error: 'Usuario no activo en el taller.' };
  }

  // Llamada a la función con auditoría inmutable
  const { data, error } = await supabase.rpc('update_service_with_audit', {
    p_service_id: serviceId,
    p_datos: values,
    p_motivo: motivo || 'Modificación desde panel admin',
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || 'No se pudo actualizar el servicio.',
    };
  }

  revalidatePath('/admin/dashboard');
  revalidatePath(`/admin/services/${serviceId}/edit`);

  return {
    success: true,
    service: data.service,
  };
}

export async function anularServiceAction(serviceId: string, motivo: string) {
  if (!motivo || motivo.trim().length < 3) {
    return {
      success: false,
      error: 'Debés especificar un motivo de anulación claro (mínimo 3 caracteres).',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado. Iniciá sesión.' };
  }

  // Validación estricta de rol en servidor: solo admin puede anular
  const { data: staff } = await supabase
    .from('staff_users')
    .select('id, shop_id, rol')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff || staff.rol !== 'admin') {
    return { success: false, error: 'Solo un administrador puede anular servicios.' };
  }

  // Llamada a la función con auditoría inmutable
  const { data, error } = await supabase.rpc('update_service_with_audit', {
    p_service_id: serviceId,
    p_datos: { anulado: true },
    p_motivo: motivo.trim(),
  });

  if (error || !data?.success) {
    return {
      success: false,
      error: error?.message || data?.error || 'No se pudo anular el servicio. Verificá tus permisos.',
    };
  }

  revalidatePath('/admin/dashboard');
  return {
    success: true,
  };
}
