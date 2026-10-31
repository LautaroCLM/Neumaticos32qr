'use client';

import { use, useActionState, useState } from 'react';
import { loginAction } from '@/lib/actions/auth';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ acceso?: string }>;
}) {
  const { acceso } = use(searchParams);
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
          className="inline-flex items-center gap-1.5 text-xs text-[#c8cdd5] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#d31a24]" />
          <span>Volver al portal público</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#14161b] border border-[#262a33] rounded-3xl p-7 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Acento superior en Rojo Furia */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#d31a24]" />

        {/* Branding Taller */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="relative w-40 h-24">
              <Image
                src="/logo.webp"
                alt="Neumáticos el 32"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className="text-xl font-black uppercase tracking-tight text-white font-sans">
            Acceso Personal del Taller
          </h1>
          <p className="text-xs text-[#d31a24] font-bold uppercase tracking-widest mt-1">
            Sistema de Gestión y Órdenes
          </p>
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#d31a24]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-[#c8cdd5] uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] text-white text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-[#c8cdd5] uppercase tracking-wider mb-1.5">
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
                className="w-full pl-10 pr-11 py-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] text-white text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]"
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
              className="w-full py-4 px-4 rounded-xl bg-[#d31a24] hover:bg-[#e52530] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#d31a24]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[50px]"
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

        <p className="mt-6 text-center text-[11px] text-[#8b929e]">
          Uso restringido al personal autorizado de Neumáticos el 32.
        </p>
      </div>
    </div>
  );
}
