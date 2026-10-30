import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/server';
import { formatPatenteDisplay } from '@/lib/utils/formatters';
import { TicketCard } from '@/components/public/TicketCard';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { ShieldCheck, MapPin, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { PublicVehicleTicketResult, ServiceRecord } from '@/lib/types/database';

const ShareButton = dynamic(
  () => import('@/components/public/ShareButton').then((mod) => mod.ShareButton),
  { ssr: true }
);

const HistoryList = dynamic(
  () => import('@/components/public/HistoryList').then((mod) => mod.HistoryList),
  { ssr: true }
);

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Ticket Digital de Servicio | Neumáticos el 32`,
    description: `Consultá el ticket de mantenimiento e historial completo para este vehículo en Neumáticos el 32.`,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      noarchive: true,
    },
  };
}

export default async function VehicleTicketPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-[#d31a24]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Formato de Enlace Inválido</h1>
        <p className="text-sm text-[#8b929e] leading-relaxed">
          El identificador del enlace no tiene el largo requerido. Asegurate de escanear el código QR completo provisto por el taller.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14161b] hover:bg-[#1c1f26] border border-[#262a33] text-white text-sm font-semibold transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-[#d31a24]" />
            <span>Volver a buscar por patente</span>
          </Link>
        </div>
      </div>
    );
  }

  // Llamar a get_vehicle_by_token
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_vehicle_by_token', {
    p_token: token,
  });

  const ticketData = data as PublicVehicleTicketResult | null;

  if (error || !ticketData || !ticketData.success || !ticketData.vehicle) {
    const isNetworkError = Boolean(error);
    const errorMessage = ticketData?.error || '';
    const isRevoked = errorMessage.toLowerCase().includes('revocado');

    let title = 'Enlace Inexistente';
    let description =
      'El código ingresado no corresponde a ningún vehículo registrado en el taller. Verificá que la dirección o el código QR sea el correcto.';

    if (isNetworkError) {
      title = 'Error de Conexión';
      description =
        'No se pudo conectar con el servidor para consultar el ticket. Verificá tu conexión a internet e intentá nuevamente.';
    } else if (isRevoked) {
      title = 'Acceso Revocado por el Taller';
      description =
        'El código QR o enlace ingresado fue revocado por el personal tras la emisión de un nuevo código para el vehículo. Solicitá el sticker actualizado en el taller.';
    }

    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950/40 border border-red-500/40 flex items-center justify-center text-[#d31a24]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <p className="text-sm text-[#8b929e] leading-relaxed">{description}</p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14161b] hover:bg-[#1c1f26] border border-[#262a33] text-white text-sm font-semibold transition-colors min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4 text-[#d31a24]" />
            <span>Volver a buscar por patente</span>
          </Link>
        </div>
      </div>
    );
  }

  const { vehicle, shop, services = [], hide_prices = false } = ticketData;
  const latestService = services[0] as ServiceRecord | undefined;
  const pastServices = services.slice(1) as ServiceRecord[];

  return (
    <div className="space-y-6">
      {/* Cabecera del Vehículo */}
      <div className="p-5 rounded-2xl bg-[#14161b] border border-[#262a33] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#d31a24] bg-[#880e14]/20 px-2 py-0.5 rounded border border-[#d31a24]/30">
              Vehículo en Sistema
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {vehicle.marca} {vehicle.modelo}
          </h1>
          {vehicle.anio && (
            <p className="text-xs text-[#c8cdd5]">Año de fabricación: {vehicle.anio}</p>
          )}
        </div>

        {/* Patente Estilo Placa Argentina Mercosur */}
        <div className="self-start sm:self-auto inline-flex flex-col items-center bg-[#0a0b0d] border-2 border-[#262a33] rounded-xl overflow-hidden shadow-inner min-w-[150px]">
          <div className="w-full bg-[#0047ab] px-3 py-0.5 text-center flex items-center justify-between gap-3 text-[9px] font-bold text-white tracking-widest uppercase">
            <span>RA</span>
            <span className="text-[7px] font-normal tracking-normal text-blue-100">REPÚBLICA ARGENTINA</span>
          </div>
          <div className="px-4 py-1.5 text-center">
            <span className="text-xl font-black font-mono tracking-widest text-white">
              {formatPatenteDisplay(vehicle.patente)}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas (Compartir / WhatsApp) */}
      <div className="flex items-center gap-2.5">
        <ShareButton
          title={`Ticket ${vehicle.patente}`}
          patente={vehicle.patente}
        />
        <WhatsAppButton
          whatsappNumber={shop?.whatsapp}
          patente={vehicle.patente}
          vehiculoInfo={`${vehicle.marca} ${vehicle.modelo}`}
        />
      </div>

      {/* Ticket del Último Servicio Destacado */}
      {latestService ? (
        <TicketCard service={latestService} hidePrices={hide_prices} />
      ) : (
        <div className="p-8 text-center rounded-2xl bg-[#14161b] border border-[#262a33] text-[#8b929e] text-sm">
          Aún no hay servicios registrados para este vehículo.
        </div>
      )}

      {/* Historial Cronológico de Mantenimientos Anteriores */}
      {pastServices.length > 0 && (
        <HistoryList services={pastServices} hidePrices={hide_prices} />
      )}

      {/* Ficha Informativa del Taller */}
      {(() => {
        const isPlaceholder = (val?: string | null) =>
          !val || !val.trim() || val.toUpperCase().includes('COMPLETAR');

        const hasDireccion = !isPlaceholder(shop?.direccion);
        const hasHorarios = !isPlaceholder(shop?.horarios);
        const shopNombre = !isPlaceholder(shop?.nombre)
          ? shop!.nombre
          : 'Neumáticos el 32';

        return (
          <div className="p-5 rounded-2xl bg-[#14161b]/80 border border-[#262a33] space-y-3 text-xs text-[#c8cdd5]">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-[#d31a24]" />
              <span>Atendido en {shopNombre}</span>
            </div>

            {(hasDireccion || hasHorarios) && (
              <div className="space-y-1.5 pt-1">
                {hasDireccion && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#8b929e] shrink-0 mt-0.5" />
                    <span>{shop?.direccion}</span>
                  </div>
                )}
                {hasHorarios && (
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#8b929e] shrink-0 mt-0.5" />
                    <span>{shop?.horarios}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
