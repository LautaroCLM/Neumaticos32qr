import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    // Consulta trivial para verificar conectividad con la base de datos sin extraer datos sensibles
    const { data, error } = await supabase.from('shops').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        { ok: false, error: 'Database unreachable' },
        {
          status: 503,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Robots-Tag': 'noindex, nofollow',
          },
        }
      );
    }

    return NextResponse.json(
      { ok: true },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Internal health check error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      }
    );
  }
}
