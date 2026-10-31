import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Destino del enlace de recuperación. Admite las dos formas en que Supabase puede enviarlo:
// `code` (plantilla por defecto) y `token_hash` (plantilla propia, sirve desde otro dispositivo).
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const supabase = await createClient();
  let isValid = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    isValid = !error;
  } else if (tokenHash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
    isValid = !error;
  }

  const destination = request.nextUrl.clone();
  destination.search = '';
  destination.pathname = isValid ? '/admin/recuperar/nueva' : '/admin/recuperar';
  if (!isValid) destination.searchParams.set('enlace', 'invalido');

  return NextResponse.redirect(destination);
}
