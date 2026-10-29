import { PlateSearchForm } from '@/components/public/PlateSearchForm';
import { QrCode, Search, FileText, Sparkles, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tu vehículo siempre al día</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight">
          Historial de Servicios
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed">
          Ingresá la patente de tu auto o camioneta para verificar el estado de sus últimos mantenimientos en <strong>Neumáticos el 32</strong>.
        </p>
      </div>

      {/* 3 Pasos estilo Rioplatense */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 py-1">
        <div className="p-3 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase">Paso 1</p>
            <p className="text-xs sm:text-sm font-bold text-zinc-100">Escaneá el QR</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-cyan-400 uppercase">Paso 2</p>
            <p className="text-xs sm:text-sm font-bold text-zinc-100">Buscá tu patente</p>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-center space-y-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase">Paso 3</p>
            <p className="text-xs sm:text-sm font-bold text-zinc-100">Mirá tu historial</p>
          </div>
        </div>
      </div>

      {/* Buscador Interactivo de Patente */}
      <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 shadow-2xl space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-200">
            Consulta rápida por patente
          </h2>
          <p className="text-xs text-zinc-400">
            Ingresá los números y letras de tu chapa patente para consultar la ficha técnica:
          </p>
        </div>

        <PlateSearchForm />
      </div>

      {/* Información sobre el QR Sticker */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="text-xs text-zinc-400 space-y-1">
          <p className="font-semibold text-zinc-200">
            ¿Tenés el sticker en el parabrisas o en tu orden de servicio?
          </p>
          <p className="leading-relaxed">
            Escanear el código QR con la cámara de tu celular te lleva directo al ticket completo con comprobante de repuestos, alineación y precios abonados, sin contraseñas ni registros.
          </p>
        </div>
      </div>
    </div>
  );
}
