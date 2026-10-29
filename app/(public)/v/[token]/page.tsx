import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatPatenteDisplay } from '@/lib/utils/formatters';
import { TicketCard } from '@/components/public/TicketCard';
import { HistoryList } from '@/components/public/HistoryList';
import { ShareButton } from '@/components/public/ShareButton';
import { WhatsAppButton } from '@/components/public/WhatsAppButton';
import { ShieldCheck, MapPin, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { PublicVehicleTicketResult, ServiceRecord } from '@/lib/types/database';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Ticket Digital de Servicio | Neumáticos el 32`,
    description: `Consultá el ticket de mantenimiento e historial completo para este vehículo en Neumáticos el 32.`,
  };
}

export default async function VehicleTicketPage({ params }: PageProps) {
  const { token } = await params;

  if (!token || token.length < 16) {
    notFound();
  }

  // Llamar a get_vehicle_by_token
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_vehicle_by_token', {
    p_token: token,
  });

  const ticketData = data as PublicVehicleTicketResult | null;

  if (error || !ticketData || !ticketData.success || !ticketData.vehicle) {
    return (
      <div className="py-12 px-4 text-center space-y-4 max-w-md mx-auto animate-in fade-in">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-zinc-100">
          Enlace no disponible o revocado
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          El código QR o enlace ingresado no existe, fue revocado por el taller tras una reemisión, o el vehículo fue dado de baja.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Cabecera del Vehículo */}
      <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Vehículo en Sistema
            </span>
          </div>
          <h1 className="text-2xl font-black text-zinc-100 tracking-tight">
            {vehicle.marca} {vehicle.modelo}
          </h1>
          {vehicle.anio && (
            <p className="text-xs text-zinc-400">Año de fabricación: {vehicle.anio}</p>
          )}
        </div>

        {/* Patente Estilo Placa Argentina */}
        <div className="self-start sm:self-auto inline-flex flex-col items-center bg-zinc-950 border-2 border-zinc-700 rounded-xl px-4 py-2 shadow-inner">
          <span className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase">
            REPUBLICA ARGENTINA
          </span>
          <span className="text-xl font-black font-mono tracking-widest text-zinc-100">
            {formatPatenteDisplay(vehicle.patente)}
          </span>
        </div>
      </div>

      {/* Acciones Rápidas (Compartir / WhatsApp) */}
      <div className="flex items-center gap-2.5">
        <ShareButton
          title={`Ticket ${vehicle.patente}`}
          patente={vehicle.patente}
        />
        <WhatsAppButton
          whatsappNumber={shop?.whatsapp || '+5491132003200'}
          patente={vehicle.patente}
          vehiculoInfo={`${vehicle.marca} ${vehicle.modelo}`}
        />
      </div>

      {/* Ticket del Último Servicio Destacado */}
      {latestService ? (
        <TicketCard service={latestService} hidePrices={hide_prices} />
      ) : (
        <div className="p-8 text-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-sm">
          Aún no hay servicios registrados para este vehículo.
        </div>
      )}

      {/* Historial Cronológico de Mantenimientos Anteriores */}
      {pastServices.length > 0 && (
        <HistoryList services={pastServices} hidePrices={hide_prices} />
      )}

      {/* Ficha Informativa del Taller */}
      <div className="p-5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2 text-zinc-200 font-bold text-sm">
          <ShieldCheck className="w-4 h-4 text-amber-500" />
          <span>Atendido en {shop?.nombre || 'Neumáticos el 32'}</span>
        </div>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <span>{shop?.direccion || 'Av. Mitre 3200, Quilmes, Prov. de Buenos Aires'}</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
            <span>{shop?.horarios || 'Lunes a Viernes de 8:00 a 18:30 | Sábados de 8:00 a 13:00'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
