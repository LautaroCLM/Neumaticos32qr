'use server';

import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const shopSettingsSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre de taller requerido').max(100),
  telefono: z.string().trim().max(30).optional().nullable(),
  whatsapp: z.string().trim().max(30).optional().nullable(),
  direccion: z.string().trim().max(200).optional().nullable(),
  horarios: z.string().trim().max(200).optional().nullable(),
  ocultar_precios: z.boolean().default(false),
  ticket_config: z.object({
    titulo_ticket: z.string().trim().min(2).max(100),
    texto_pie: z.string().trim().max(500).default(''),
    etiqueta_proximo_service: z.string().trim().max(100).default('Próximo control recomendado'),
    colores_personalizados: z.record(z.string(), z.string()).optional(),
  }),
});

export async function updateShopSettingsAction(data: z.infer<typeof shopSettingsSchema>) {
  const validation = shopSettingsSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos de configuración inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: staff } = await supabase
    .from('staff_users')
    .select('shop_id, rol')
    .eq('id', user.id)
    .single();

  if (!staff || staff.rol !== 'admin') {
    return { success: false, error: 'Acción permitida únicamente para administradores.' };
  }

  const { error: updateErr } = await supabase
    .from('shops')
    .update({
      nombre: validation.data.nombre,
      telefono: validation.data.telefono,
      whatsapp: validation.data.whatsapp,
      direccion: validation.data.direccion,
      horarios: validation.data.horarios,
      ocultar_precios: validation.data.ocultar_precios,
      ticket_config: validation.data.ticket_config,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staff.shop_id);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/dashboard');
  return { success: true };
}

const templateSchema = z.object({
  nombre: z.string().trim().min(2, 'Nombre requerido').max(100),
  tipo: z.string().min(1, 'Tipo requerido'),
  descripcion_base: z.string().trim().max(2000).optional().nullable(),
  items_base: z.array(z.any()).default([]),
  campos_extra_base: z.array(z.any()).default([]),
  visibilidad_base: z.record(z.string(), z.boolean()).default({}),
  activo: z.boolean().default(true),
});

export async function saveServiceTemplateAction(data: z.infer<typeof templateSchema>, templateId?: string) {
  const validation = templateSchema.safeParse(data);
  if (!validation.success) {
    return {
      success: false,
      error: validation.error.issues[0]?.message || 'Datos de plantilla inválidos',
    };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autorizado' };

  const { data: staff } = await supabase
    .from('staff_users')
    .select('shop_id, rol')
    .eq('id', user.id)
    .single();

  if (!staff || staff.rol !== 'admin') {
    return { success: false, error: 'Solo administradores pueden crear o editar plantillas.' };
  }

  if (templateId) {
    const { error: updateErr } = await supabase
      .from('service_templates')
      .update({
        nombre: validation.data.nombre,
        tipo: validation.data.tipo,
        descripcion_base: validation.data.descripcion_base || '',
        items_base: validation.data.items_base,
        campos_extra_base: validation.data.campos_extra_base,
        visibilidad_base: validation.data.visibilidad_base,
        activo: validation.data.activo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('shop_id', staff.shop_id);

    if (updateErr) return { success: false, error: updateErr.message };
  } else {
    const { error: insertErr } = await supabase
      .from('service_templates')
      .insert({
        shop_id: staff.shop_id,
        nombre: validation.data.nombre,
        tipo: validation.data.tipo,
        descripcion_base: validation.data.descripcion_base || '',
        items_base: validation.data.items_base,
        campos_extra_base: validation.data.campos_extra_base,
        visibilidad_base: validation.data.visibilidad_base,
        activo: validation.data.activo,
      });

    if (insertErr) return { success: false, error: insertErr.message };
  }

  revalidatePath('/admin/settings');
  revalidatePath('/admin/services/new');
  return { success: true };
}
