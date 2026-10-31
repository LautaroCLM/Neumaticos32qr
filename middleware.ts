import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { SESSION_COOKIE_OPTIONS, withSessionMaxAge } from '@/lib/supabase/cookie-options';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
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
            supabaseResponse.cookies.set(name, value, withSessionMaxAge(options))
          );
        },
      },
    }
  );

  // Las redirecciones conservan las cookies que Supabase haya renovado o borrado
  const redirectTo = (pathname: string, params: Record<string, string> = {}) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = '';
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === '/admin/login';

  // Si intenta acceder a cualquier ruta admin sin estar logueado, redirigir a login
  if (!isLoginPage && !user) {
    return redirectTo('/admin/login', { redirectTo: request.nextUrl.pathname });
  }

  if (user) {
    const { data: staff, error: staffError } = await supabase
      .from('staff_users')
      .select('rol, is_active')
      .eq('id', user.id)
      .maybeSingle();

    // Sesión válida de alguien que ya no es personal activo: se cierra para que no quede
    // rebotando entre el panel y el login. Si falló la consulta no se sabe, y no se cierra.
    if (!staffError && !staff?.is_active) {
      await supabase.auth.signOut();
      return redirectTo('/admin/login', { acceso: 'denegado' });
    }

    // Si ya está logueado e intenta entrar a login, redirigir al dashboard
    if (isLoginPage && staff?.is_active) {
      return redirectTo('/admin/dashboard');
    }

    // Solo administradores pueden acceder a /admin/settings
    if (request.nextUrl.pathname.startsWith('/admin/settings') && staff?.rol !== 'admin') {
      return redirectTo('/admin/dashboard');
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
