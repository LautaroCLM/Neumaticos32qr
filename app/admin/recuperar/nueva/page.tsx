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
      <div className="w-full max-w-md bg-[#14161b] border border-[#262a33] rounded-3xl p-7 sm:p-8 shadow-2xl space-y-5">
        <h1 className="text-xl font-black uppercase tracking-tight text-white">Nueva Contraseña</h1>

        {canChangePassword ? (
          <NewPasswordForm />
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#d31a24]" />
              <span>El enlace venció o no es válido. Para cambiar tu contraseña, pedí uno nuevo.</span>
            </div>
            <Link
              href="/admin/recuperar"
              className="flex items-center justify-center w-full py-3 px-4 rounded-xl bg-[#d31a24] hover:bg-[#e52530] text-white font-black text-xs uppercase tracking-wider transition-all min-h-[48px]"
            >
              Pedir un Enlace Nuevo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
