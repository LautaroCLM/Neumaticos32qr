import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, HelpCircle } from 'lucide-react';

export default function NotFound() {
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

        <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D31A24]/10 border border-[#D31A24]/30 flex items-center justify-center text-[#D31A24]">
          <HelpCircle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#D31A24]">
            Error 404
          </span>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            Página No Encontrada
          </h1>
          <p className="text-xs sm:text-sm text-[#C8CDD5] leading-relaxed">
            La sección o enlace al que intentás ingresar no existe, fue movido o cambió de dirección.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-[#D31A24] hover:bg-[#b0141c] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all min-h-[48px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
