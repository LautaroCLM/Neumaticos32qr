'use client';

import { use, useActionState } from 'react';
import { requestPasswordResetAction } from '@/lib/actions/auth';
import { AlertCircle, ArrowLeft, Check, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export default function PasswordRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ enlace?: string }>;
}) {
  const { enlace } = use(searchParams);
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, null);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4">
        <Link
          href="/admin/login"
          className="inline-flex items-center gap-1.5 text-xs text-[#c8cad0] hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#f04d55]" />
          <span>Volver a iniciar sesión</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-[#161719] border border-[#2a2b2e] p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="font-display text-2xl leading-none text-[#f2f2ef]">Recuperar Contraseña</h1>
          <p className="text-sm text-[#c8cad0] mt-3 leading-relaxed">
            Ingresá tu email y te enviamos un enlace para crear una contraseña nueva.
          </p>
        </div>

        {enlace === 'invalido' && !state && (
          <div className="p-3.5 rounded-xs bg-[#d31a24]/10 border border-[#d31a24]/60 text-[#f2f2ef] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#f04d55]" />
            <span>
              El enlace venció o ya se usó. Pedí uno nuevo y abrilo en este mismo navegador.
            </span>
          </div>
        )}

        {state?.error && (
          <div className="p-3.5 rounded-xs bg-[#d31a24]/10 border border-[#d31a24]/60 text-[#f2f2ef] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#f04d55]" />
            <span>{state.error}</span>
          </div>
        )}

        {state?.success ? (
          <div className="p-3.5 rounded-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{state.success}</span>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="block label-caps text-[#9a9da3] mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="recovery-email"
                  type="email"
                  name="email"
                  required
                  className="w-full pl-10 pr-4 py-3.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] hover:border-[#5f6166] text-[#f2f2ef] text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 px-4 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[50px]"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Enviar Enlace</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
