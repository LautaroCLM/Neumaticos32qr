'use client';

import { use, useActionState, useState } from 'react';
import { loginAction } from '@/lib/actions/auth';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ acceso?: string; clave?: string }>;
}) {
  const { acceso, clave } = use(searchParams);
  const [state, formAction, isPending] = useActionState(loginAction, null);
  const [showPassword, setShowPassword] = useState(false);
  const errorMessage =
    state?.error ||
    (acceso === 'denegado' ? 'Acceso denegado: tu usuario no está habilitado en el personal del taller.' : null);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      {/* Botón para volver al portal público */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#c8cad0] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#f04d55]" />
          <span>Volver al portal público</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#161719] border border-[#2a2b2e] p-6 sm:p-8">
        {/* Branding Taller */}
        <div className="mb-7">
          <div className="mb-5">
            <div className="relative w-24 h-24 -ml-1">
              <Image
                src="/logo.webp"
                alt="Neumáticos el 32"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="font-display text-2xl leading-none text-[#f2f2ef]">
            Acceso Personal del Taller
          </h1>
          <p className="text-sm text-[#9a9da3] mt-2">
            Sistema de Gestión y Órdenes
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xs bg-[#d31a24]/10 border border-[#d31a24]/60 text-[#f2f2ef] text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#f04d55]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {clave === 'actualizada' && !errorMessage && (
          <div className="mb-6 p-3.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            Tu contraseña se actualizó. Ya podés iniciar sesión.
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block label-caps text-[#9a9da3] mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-email"
                type="email"
                name="email"
                required
                placeholder="operario@taller32.local"
                className="w-full pl-10 pr-4 py-3.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] hover:border-[#5f6166] text-[#f2f2ef] text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block label-caps text-[#9a9da3] mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] hover:border-[#5f6166] text-[#f2f2ef] text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-2"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 px-4 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[50px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Ingresando...</span>
                </>
              ) : (
                <span>Ingresar al Panel</span>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/admin/recuperar"
            className="inline-flex items-center text-xs text-[#c8cad0] hover:text-white underline underline-offset-2 min-h-[44px]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <p className="mt-2 text-center text-[11px] text-[#9a9da3]">
          Uso restringido al personal autorizado de Neumáticos el 32.
        </p>
      </div>
    </div>
  );
}
