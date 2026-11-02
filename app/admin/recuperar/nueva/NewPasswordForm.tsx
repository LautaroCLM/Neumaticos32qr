'use client';

import { useActionState } from 'react';
import { updatePasswordAction } from '@/lib/actions/auth';
import { AlertCircle, Loader2 } from 'lucide-react';

const INPUT_CLASS =
  'w-full px-4 py-3.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] hover:border-[#5f6166] text-[#f2f2ef] text-sm focus:outline-none focus:border-[#d31a24] transition-colors min-h-[48px]';

export function NewPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3.5 rounded-xs bg-[#d31a24]/10 border border-[#d31a24]/60 text-[#f2f2ef] text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#f04d55]" />
          <span>{state.error}</span>
        </div>
      )}

      <div>
        <label htmlFor="new-password" className="block label-caps text-[#9a9da3] mb-2">
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
        <label htmlFor="new-password-confirm" className="block label-caps text-[#9a9da3] mb-2">
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
        className="w-full py-4 px-4 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[50px]"
      >
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
        <span>Guardar Contraseña</span>
      </button>
    </form>
  );
}
