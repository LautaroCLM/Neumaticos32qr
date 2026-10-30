'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error no controlado capturado por app/error.tsx:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-zinc-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#14161B] border border-[#262A33] text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
        <div className="flex justify-center">
          <div className="relative w-36 h-20">
            <Image
              src="/logo.webp"
              alt="Neumáticos el 32"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-[#D31A24]">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#D31A24]">
            Error Inesperado
          </span>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Algo salió mal
          </h1>
          <p className="text-xs sm:text-sm text-[#C8CDD5] leading-relaxed">
            Ocurrió un error al procesar la solicitud. Puede tratarse de una interrupción temporal de conexión.
          </p>
          {error.digest && (
            <p className="text-[10px] text-zinc-500 font-mono">
              Código de referencia: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#D31A24] hover:bg-[#b0141c] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all cursor-pointer min-h-[48px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reintentar</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#0A0B0D] hover:bg-[#1c1f26] border border-[#262A33] text-zinc-300 hover:text-white text-xs font-bold transition-all min-h-[48px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
