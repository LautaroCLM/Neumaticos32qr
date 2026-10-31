'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/lib/actions/auth';
import { AlertCircle, Loader2 } from 'lucide-react';

const INPUT_CLASS =
  'w-full px-4 py-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] text-white text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]';

export function NewPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#d31a24]" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="new-password" className="block text-xs font-bold text-[#c8cdd5] uppercase tracking-wider mb-1.5">
          Contraseña Nueva
        </label>
        <input
          id="new-password"
          type="password"
          name="password"
          required
          minLength={12}
          maxLength={72}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
        <p className="text-[11px] text-zinc-500 mt-1">Mínimo 12 caracteres.</p>
      </div>

      <div>
        <label htmlFor="new-password-confirm" className="block text-xs font-bold text-[#c8cdd5] uppercase tracking-wider mb-1.5">
          Repetir Contraseña
        </label>
        <input
          id="new-password-confirm"
          type="password"
          name="confirmacion"
          required
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-4 px-4 rounded-xl bg-[#d31a24] hover:bg-[#e52530] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[50px]"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>Guardar Contraseña</span>
      </button>
    </form>
  );
}
