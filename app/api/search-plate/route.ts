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

    // Obtener IP real del cliente detrás de Vercel / proxy reverso:
    // 1. Vercel Edge asigna 'x-real-ip' con la IP de conexión TCP verificada del cliente (no falseable).
    // 2. Si no está presente, se extrae el primer valor de 'x-forwarded-for' (la IP original del cliente).
    const realIp = request.headers.get('x-real-ip');
    const forwardedFor = request.headers.get('x-forwarded-for');
    const rawIp = realIp || (forwardedFor ? forwardedFor.split(',')[0].trim() : null) || '127.0.0.1';

    // Sanitización estricta de formato IPv4 / IPv6 para prevenir inyecciones o caracteres espurios
    const clientIp = rawIp.replace(/[^0-9a-fA-F:.]/g, '').slice(0, 45) || '127.0.0.1';

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
