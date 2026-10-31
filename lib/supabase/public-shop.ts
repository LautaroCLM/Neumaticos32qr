import 'server-only';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from './admin';

export const PUBLIC_SHOP_CACHE_TAG = 'public-shop';

// shops no es legible por anon (RLS): se consulta en servidor y solo se piden los datos de contacto públicos.
const fetchPublicShop = unstable_cache(
  async () => {
    const { data, error } = await createAdminClient()
      .from('shops')
      .select('nombre, whatsapp, direccion, horarios')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
  [PUBLIC_SHOP_CACHE_TAG],
  { tags: [PUBLIC_SHOP_CACHE_TAG], revalidate: 300 }
);

export async function getPublicShop() {
  try {
    return await fetchPublicShop();
  } catch (err) {
    console.error('Error al obtener los datos públicos del taller:', err);
    return null;
  }
}
