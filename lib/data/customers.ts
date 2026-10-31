import type { SupabaseClient } from '@supabase/supabase-js';

export const UNIQUE_VIOLATION = '23505';

interface FindOrCreateResult {
  customerId?: string;
  error?: string;
}

/**
 * Devuelve el cliente con ese teléfono o crea uno nuevo. Sin teléfono siempre crea uno,
 * porque dos personas pueden llamarse igual.
 */
export async function findOrCreateCustomer(
  supabase: SupabaseClient,
  shopId: string,
  nombre: string | null | undefined,
  telefono: string | null
): Promise<FindOrCreateResult> {
  if (telefono) {
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('id')
      .eq('shop_id', shopId)
      .eq('telefono', telefono)
      .is('deleted_at', null)
      .maybeSingle();

    if (findErr) return { error: findErr.message };
    if (existing) return { customerId: existing.id };
  }

  if (!nombre || nombre.trim().length < 2) {
    return { error: 'Ingresá el nombre del cliente.' };
  }

  const { data: created, error: insertErr } = await supabase
    .from('customers')
    .insert({ shop_id: shopId, nombre: nombre.trim(), telefono })
    .select('id')
    .single();

  if (insertErr || !created) {
    return { error: insertErr?.message || 'Error al guardar el cliente.' };
  }

  return { customerId: created.id };
}
