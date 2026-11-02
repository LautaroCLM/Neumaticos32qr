import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0d0d0e] text-[#f2f2ef] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-in">
        <Image src="/logo.webp" alt="Neumáticos el 32" width={96} height={96} className="w-24 h-24 object-contain -ml-1" priority />

        <h1 className="mt-6 font-display text-[32px] leading-[0.95] text-balance">
          Página no encontrada
        </h1>
        <p className="mt-4 text-[15px] text-[#c8cad0] leading-relaxed">
          La sección o enlace al que intentás ingresar no existe, fue movido o cambió de dirección.
        </p>
        <p className="mt-2 figure text-xs text-[#9a9da3]">Error 404</p>

        <Link
          href="/"
          className="mt-8 flex items-center justify-center gap-2 w-full px-5 min-h-[52px] rounded-xs bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-display text-sm tracking-[0.1em] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>Volver al inicio</span>
        </Link>
      </div>
    </div>
  );
}
