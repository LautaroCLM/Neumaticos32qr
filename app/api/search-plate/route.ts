import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePatente, isValidPatente } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawPatente = body.patente;

    if (!rawPatente || typeof rawPatente !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Ingresá una patente válida.' },
        { status: 400 }
      );
    }

    const cleanPatente = normalizePatente(rawPatente);

    if (!isValidPatente(cleanPatente)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de patente no válido (ej: AE123CD o ABC123).',
        },
        { status: 400 }
      );
    }

    // Obtener IP real del cliente desde headers del reverse proxy / Vercel
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const clientIp = (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || realIp || '127.0.0.1';

    // Invocar search_vehicle_public en el servidor usando cliente administrativo (service_role)
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('search_vehicle_public', {
      p_patente: cleanPatente,
      p_ip: clientIp,
    });

    if (error) {
      console.error('Error al ejecutar search_vehicle_public:', error);
      return NextResponse.json(
        { success: false, error: 'Ocurrió un error al consultar el historial.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('Error inesperado en /api/search-plate:', err);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
