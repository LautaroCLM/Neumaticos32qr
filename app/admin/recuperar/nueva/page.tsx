import { createClient } from '@/lib/supabase/server';
import { isRecentRecoverySession } from '@/lib/security/recovery-session';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { NewPasswordForm } from './NewPasswordForm';

export default async function NewPasswordPage() {
  const supabase = await createClient();
  const canChangePassword = await isRecentRecoverySession(supabase);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161719] border border-[#2a2b2e] p-6 sm:p-8 space-y-5">
        <h1 className="font-display text-2xl leading-none text-[#f2f2ef]">Nueva Contraseña</h1>

        {canChangePassword ? (
          <NewPasswordForm />
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xs bg-[#d31a24]/10 border border-[#d31a24]/60 text-[#f2f2ef] text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#f04d55]" />
              <span>El enlace venció o no es válido. Para cambiar tu contraseña, pedí uno nuevo.</span>
            </div>
            <Link
              href="/admin/recuperar"
              className="flex items-center justify-center w-full py-3 px-4 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-black text-xs uppercase tracking-wider transition-all min-h-[48px]"
            >
              Pedir un Enlace Nuevo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
