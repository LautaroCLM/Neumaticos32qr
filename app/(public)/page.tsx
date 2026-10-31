import Image from 'next/image';
import { PlateSearchForm } from '@/components/public/PlateSearchForm';
import { QrCode, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Neumáticos el 32 | Historial de Mantenimientos y Tickets Digitales',
  description:
    'Consultá el historial digital y servicios de tu vehículo en Neumáticos el 32 Quilmes. Búsqueda por patente y comprobantes de mantenimiento.',
};

export default function HomePage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Hero Section con Emblema Oficial */}
      <div className="text-center space-y-3 pt-4 pb-2">
        <div className="flex justify-center">
          <div className="relative w-48 sm:w-56 h-28 sm:h-32 drop-shadow-[0_10px_20px_rgba(211,26,36,0.15)]">
            <Image
              src="/logo.webp"
              alt="Neumáticos el 32"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase font-sans">
            Historial de Servicios
          </h1>
          <p className="text-xs sm:text-sm text-[#c8cdd5] max-w-sm mx-auto leading-relaxed">
            Ingresá tu patente para ver los trabajos realizados, los costos y el próximo control de tu vehículo.
          </p>
        </div>
      </div>

      {/* Buscador Interactivo de Patente */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#14161b] border border-[#262a33] shadow-2xl space-y-3">
        <div className="space-y-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#d31a24]">
            Búsqueda Rápida
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white">
            Consultá tu auto o camioneta
          </h2>
        </div>

        <PlateSearchForm />
      </div>

      {/* Acceso al Historial Completo vía Sticker QR */}
      <div className="p-4 rounded-xl bg-[#14161b]/80 border border-[#262a33] flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-[#880e14]/20 border border-[#d31a24]/30 flex items-center justify-center text-[#d31a24] shrink-0 mt-0.5">
          <QrCode className="w-5 h-5" />
        </div>
        <div className="text-xs text-[#c8cdd5] space-y-1">
          <p className="font-bold text-white text-sm">
            ¿Tenés el sticker de tu vehículo?
          </p>
          <p className="leading-relaxed">
            Escaneá el código QR con la cámara de tu celular y entrás directo a tu historial, sin escribir ningún dato.
          </p>
        </div>
      </div>
    </div>
  );
}
