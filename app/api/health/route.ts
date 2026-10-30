import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'X-Robots-Tag': 'noindex, nofollow',
};

export async function GET() {
  try {
    const supabase = await createClient();
    // Consulta trivial para verificar conectividad con la base de datos sin extraer datos sensibles
    const { error } = await supabase.from('shops').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false },
        {
          status: 503,
          headers: NO_CACHE_HEADERS,
        }
      );
    }

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: NO_CACHE_HEADERS,
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      {
        status: 503,
        headers: NO_CACHE_HEADERS,
      }
    );
  }
}
