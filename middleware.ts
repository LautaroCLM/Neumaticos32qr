import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import '@/lib/env';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:55321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === '/admin/login';
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');

  // Si intenta acceder a cualquier ruta admin sin estar logueado, redirigir a login
  if (isAdminRoute && !isLoginPage && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Si ya está logueado e intenta entrar a login, redirigir al dashboard
  if (isLoginPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    return NextResponse.redirect(url);
  }

  // Si un usuario autenticado intenta acceder a /admin/settings, verificar rol admin en servidor
  if (user && request.nextUrl.pathname.startsWith('/admin/settings')) {
    const { data: staff } = await supabase
      .from('staff_users')
      .select('rol, is_active')
      .eq('id', user.id)
      .single();

    if (!staff || !staff.is_active || staff.rol !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Cabeceras de seguridad estrictas para el panel de administración
  supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  supabaseResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
