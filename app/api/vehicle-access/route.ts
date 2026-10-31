import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getClientIp } from '@/lib/security/client-ip';
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

    const clientIp = getClientIp(request.headers);

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
