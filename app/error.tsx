'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RefreshCw, ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-[#0d0d0e] text-[#f2f2ef] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <Image src="/logo.webp" alt="Neumáticos el 32" width={96} height={96} className="w-24 h-24 object-contain -ml-1" priority />

        <h1 className="mt-6 font-display text-[32px] leading-[0.95] text-balance">Algo salió mal</h1>
        <p className="mt-4 text-[15px] text-[#c8cad0] leading-relaxed">
          Ocurrió un error al procesar la solicitud. Puede tratarse de una interrupción temporal de conexión.
        </p>
        {error.digest && (
          <p className="mt-2 figure text-xs text-[#9a9da3]">Código de referencia: {error.digest}</p>
        )}

        <div className="mt-8 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full px-5 min-h-[52px] rounded-xs bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-display text-sm tracking-[0.1em] transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Reintentar</span>
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full px-5 min-h-[48px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-[#f2f2ef] text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Volver al inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
