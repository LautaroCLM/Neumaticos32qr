import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/server';
import { formatPatenteDisplay, isConfigPlaceholder } from '@/lib/utils/formatters';
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

function TicketErrorView({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-md mx-auto py-10 animate-in">
      <span className="w-12 h-12 flex items-center justify-center border-2 border-[#d31a24] text-[#d31a24]" aria-hidden="true">
        <AlertTriangle className="w-6 h-6" />
      </span>
      <h1 className="mt-6 font-display text-[28px] leading-none text-balance text-[#f2f2ef]">{title}</h1>
      <p className="mt-4 text-[15px] text-[#c8cad0] leading-relaxed">{description}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 px-4 min-h-[48px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-[#f2f2ef] text-sm font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        <span>Volver a buscar por patente</span>
      </Link>
    </div>
  );
}

export default async function VehicleTicketPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return (
      <TicketErrorView
        title="Formato de Enlace Inválido"
        description="El identificador del enlace no tiene el largo requerido. Volvé a la página principal y buscá tu vehículo con la patente y los últimos 4 dígitos de tu teléfono."
      />
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
      'El código ingresado no corresponde a ningún vehículo registrado en el taller. Volvé a buscar tu vehículo con la patente y los últimos 4 dígitos de tu teléfono.';

    if (isNetworkError) {
      title = 'Error de Conexión';
      description =
        'No se pudo conectar con el servidor para consultar el ticket. Verificá tu conexión a internet e intentá nuevamente.';
    } else if (isRevoked) {
      title = 'Acceso Revocado por el Taller';
      description =
        'El enlace ingresado fue revocado por el personal del taller. Volvé a buscar tu vehículo con la patente y los últimos 4 dígitos de tu teléfono, o consultá en el taller.';
    }

    return <TicketErrorView title={title} description={description} />;
  }

  const { vehicle, shop, services = [], hide_prices = false } = ticketData;
  const latestService = services[0] as ServiceRecord | undefined;
  const pastServices = services.slice(1) as ServiceRecord[];

  const hasDireccion = !isConfigPlaceholder(shop?.direccion);
  const hasHorarios = !isConfigPlaceholder(shop?.horarios);
  const shopNombre = !isConfigPlaceholder(shop?.nombre) ? shop!.nombre : 'Neumáticos el 32';

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Cabecera del vehículo: la patente es la pieza dominante */}
      <header className="space-y-5">
        <div className="inline-flex h-[72px] sm:h-20 rounded-md overflow-hidden bg-[#f2f2ef] border-2 border-[#f2f2ef] animate-plate-in">
          <span
            aria-hidden="true"
            className="w-10 shrink-0 bg-[#0d0d0e] text-[#f2f2ef] flex items-end justify-center pb-2 text-[11px] font-extrabold tracking-[0.08em]"
          >
            RA
          </span>
          <span
            className="flex items-center px-4 sm:px-5 text-[#0d0d0e] text-[32px] sm:text-[38px] figure font-extrabold tracking-[0.08em] whitespace-nowrap"
            style={{ fontStretch: '125%' }}
          >
            <span className="sr-only">Patente </span>
            {formatPatenteDisplay(vehicle.patente)}
          </span>
        </div>

        <div>
          <h1 className="font-display text-[clamp(1.75rem,7vw,2.5rem)] leading-[0.95] text-balance text-[#f2f2ef]">
            {vehicle.marca} {vehicle.modelo}
          </h1>
          {vehicle.anio && (
            <p className="mt-2 text-sm text-[#c8cad0]">
              Año <span className="figure font-semibold text-[#f2f2ef]">{vehicle.anio}</span>
            </p>
          )}
        </div>

        {/* Acciones rápidas (compartir / WhatsApp) */}
        <div className="flex items-stretch gap-2.5">
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
      </header>

      {/* Ticket del último servicio */}
      {latestService ? (
        <TicketCard
          service={latestService}
          hidePrices={hide_prices}
          ticketConfig={shop?.ticket_config}
        />
      ) : (
        <p className="py-8 text-center border-y border-[#2a2b2e] text-[#9a9da3] text-sm">
          Aún no hay servicios registrados para este vehículo.
        </p>
      )}

      {/* Historial cronológico de mantenimientos anteriores */}
      {pastServices.length > 0 && (
        <HistoryList
          services={pastServices}
          hidePrices={hide_prices}
          ticketConfig={shop?.ticket_config}
        />
      )}

      {/* Ficha del taller */}
      <footer className="pt-5 border-t border-[#2a2b2e] space-y-2.5 text-sm text-[#c8cad0]">
        <p className="flex items-center gap-2 font-semibold text-[#f2f2ef]">
          <ShieldCheck className="w-4 h-4 text-[#d31a24]" aria-hidden="true" />
          <span>Atendido en {shopNombre}</span>
        </p>
        {hasDireccion && (
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#9a9da3] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{shop?.direccion}</span>
          </p>
        )}
        {hasHorarios && (
          <p className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#9a9da3] shrink-0 mt-0.5" aria-hidden="true" />
            <span>{shop?.horarios}</span>
          </p>
        )}
      </footer>
    </div>
  );
}
