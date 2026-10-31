import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export const PUBLIC_SHOP_CACHE_TAG = 'public-shop';

interface PublicShop {
  nombre: string;
  whatsapp: string | null;
  direccion: string | null;
  horarios: string | null;
}

// Sin cookies: unstable_cache no las admite y estos datos son iguales para todos los visitantes.
const fetchPublicShop = unstable_cache(
  async () => {
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase.rpc('get_public_shop');

    if (error) throw error;
    return data as PublicShop | null;
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
