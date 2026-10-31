import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePatente, isValidPatente } from '@/lib/utils/formatters';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { patente, ultimos_digitos: ultimosDigitos } = body;

    if (typeof patente !== 'string' || typeof ultimosDigitos !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Ingresá la patente y los últimos 4 dígitos del teléfono.' },
        { status: 400 }
      );
    }

    const cleanPatente = normalizePatente(patente);

    if (!isValidPatente(cleanPatente)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de patente no válido (ej: AE123CD o ABC123).',
        },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(ultimosDigitos)) {
      return NextResponse.json(
        { success: false, error: 'Ingresá los últimos 4 dígitos del teléfono.' },
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

    // Invocar request_vehicle_access en el servidor usando cliente administrativo (service_role)
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.rpc('request_vehicle_access', {
      p_patente: cleanPatente,
      p_ultimos_digitos: ultimosDigitos,
      p_ip: clientIp,
    });

    if (error) {
      console.error('Error al ejecutar request_vehicle_access:', error);
      return NextResponse.json(
        { success: false, error: 'Ocurrió un error al consultar el historial.' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: data?.blocked ? 429 : 200 });
  } catch (err) {
    console.error('Error inesperado en /api/vehicle-access:', err);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor.' },
      { status: 500 }
    );
  }
}
