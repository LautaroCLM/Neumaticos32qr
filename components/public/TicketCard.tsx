import { ServiceRecord, ShopTicketConfig } from '@/lib/types/database';
import { ServiceBadge } from './ServiceBadge';
import { formatDateBA, formatKilometers, formatCurrencyARS, formatTicketNumber } from '@/lib/utils/formatters';
import { FileEdit, MapPin, CalendarClock } from 'lucide-react';

interface TicketCardProps {
  service: ServiceRecord;
  hidePrices?: boolean;
  ticketConfig?: ShopTicketConfig;
  isPreview?: boolean;
}

export function TicketCard({
  service,
  hidePrices = false,
  ticketConfig,
  isPreview = false,
}: TicketCardProps) {
  return (
    <article className="relative bg-[#161719] border border-[#2a2b2e]">
      {/* Cabecera estilo orden de trabajo */}
      <header className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-[#2a2b2e]">
        <h2 className="label-caps text-[#f2f2ef]">
          {ticketConfig?.titulo_ticket || 'Último Servicio Realizado'}
        </h2>

        <div className="flex items-center gap-2 shrink-0">
          {service.editado && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#c8cad0]" title="Este ticket fue editado">
              <FileEdit className="w-3 h-3 text-[#9a9da3]" aria-hidden="true" />
              Editado
            </span>
          )}
          <span className="figure text-[12px] font-bold text-[#9a9da3] whitespace-nowrap">
            {isPreview
              ? 'VISTA PREVIA'
              : service.numero !== undefined
              ? formatTicketNumber(service.numero)
              : 'TICKET DIGITAL'}
          </span>
        </div>
      </header>

      <TicketDetails service={service} hidePrices={hidePrices} ticketConfig={ticketConfig} />
    </article>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="label-caps text-[#9a9da3] mb-2">{children}</h3>;
}

export function TicketDetails({
  service,
  hidePrices = false,
  ticketConfig,
}: Omit<TicketCardProps, 'isPreview'>) {
  const effectivePrice =
    service.total_manual !== null && service.total_manual !== undefined
      ? service.total_manual
      : service.precio;

  const hasItems = service.items && service.items.length > 0;
  const hasExtraFields = service.campos_extra && service.campos_extra.length > 0;
  const hasKm = service.kilometraje !== null && service.kilometraje !== undefined;
  const showTotal = !hidePrices && effectivePrice !== null && effectivePrice !== undefined;

  return (
    <div className="px-4 sm:px-6 py-5 space-y-6">
      <ServiceBadge tipo={service.tipo} />

      {/* Posiciones fijas: fecha, kilometraje y total siempre en el mismo lugar */}
      <dl className="grid grid-cols-2 sm:grid-cols-[1.3fr_1fr_1.2fr] border-y border-[#2a2b2e]">
        <div className="py-3 pr-3 col-span-2 sm:col-span-1 border-b sm:border-b-0 border-[#2a2b2e]">
          <dt className="label-caps text-[#9a9da3]">Fecha</dt>
          <dd className="mt-1 figure text-[15px] font-semibold text-[#f2f2ef]">
            {formatDateBA(service.fecha_hora, { includeTime: true })}
          </dd>
        </div>
        <div className="py-3 pr-3 sm:pl-4 sm:border-l border-[#2a2b2e]">
          <dt className="label-caps text-[#9a9da3]">Kilometraje</dt>
          <dd className="mt-1 figure text-[17px] font-bold text-[#f2f2ef]">
            {hasKm ? formatKilometers(service.kilometraje!) : '—'}
          </dd>
        </div>
        <div className="py-3 pl-4 border-l border-[#2a2b2e] text-right sm:text-left">
          <dt className="label-caps text-[#9a9da3]">Total</dt>
          <dd className="mt-1 figure text-[20px] leading-tight font-extrabold text-[#f2f2ef]" style={{ fontStretch: '118%' }}>
            {showTotal ? formatCurrencyARS(effectivePrice!) : '—'}
          </dd>
        </div>
      </dl>

      {service.sucursal && (
        <p className="-mt-3 flex items-center gap-1.5 text-xs text-[#c8cad0]">
          <MapPin className="w-3.5 h-3.5 text-[#9a9da3]" aria-hidden="true" />
          Sucursal {service.sucursal}
        </p>
      )}

      {/* Trabajo realizado (texto plano seguro) */}
      <section>
        <SectionLabel>Trabajo Realizado</SectionLabel>
        <p className="text-[15px] text-[#f2f2ef] leading-relaxed whitespace-pre-wrap max-w-[68ch]">
          {service.descripcion}
        </p>
      </section>

      {/* Repuestos / productos o desglose de ítems */}
      {hasItems ? (
        <section>
          <SectionLabel>Detalle de Ítems y Repuestos</SectionLabel>
          <ul className="border-t border-[#2a2b2e]">
            {service.items?.map((item, idx) => (
              <li key={idx} className="py-2.5 flex items-baseline justify-between gap-3 text-sm border-b border-[#2a2b2e]">
                <span className="flex items-baseline gap-2.5 min-w-0">
                  <span className="figure font-bold text-[#9a9da3] w-7 shrink-0">{item.cantidad}×</span>
                  <span className="text-[#f2f2ef] break-words min-w-0">{item.concepto}</span>
                </span>
                {!hidePrices && item.precio_unitario !== null && item.precio_unitario !== undefined && (
                  <span className="figure font-semibold text-[#f2f2ef] shrink-0">
                    {formatCurrencyARS(item.precio_unitario * item.cantidad)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        service.productos && (
          <section>
            <SectionLabel>Repuestos y Materiales</SectionLabel>
            <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap max-w-[68ch]">
              {service.productos}
            </p>
          </section>
        )
      )}

      {/* Campos extra personalizados */}
      {hasExtraFields && (
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-t border-[#2a2b2e]">
          {service.campos_extra?.map((f, idx) => (
            <div key={idx} className="py-2.5 border-b border-[#2a2b2e] flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-[#9a9da3]">{f.titulo}</dt>
              <dd className="font-semibold text-[#f2f2ef] text-right">{f.valor}</dd>
            </div>
          ))}
        </dl>
      )}

      {/* Observaciones para el cliente */}
      {service.notas_cliente && (
        <section>
          <SectionLabel>Observaciones del Taller</SectionLabel>
          <p className="text-sm text-[#c8cad0] leading-relaxed whitespace-pre-wrap max-w-[68ch]">
            {service.notas_cliente}
          </p>
        </section>
      )}

      {/* Próximo servicio recomendado */}
      {(service.proximo_servicio_km || service.proximo_servicio_fecha) && (
        <section className="flex items-start gap-3 p-4 bg-[#0d0d0e] border border-[#3a3b3f] rounded-xs">
          <CalendarClock className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-[#f2f2ef]">
              {ticketConfig?.etiqueta_proximo_service || 'Próximo control recomendado:'}
            </p>
            <p className="text-[#c8cad0]">
              {service.proximo_servicio_km && (
                <span>A los <strong className="figure text-[#f2f2ef]">{formatKilometers(service.proximo_servicio_km)}</strong></span>
              )}
              {service.proximo_servicio_km && service.proximo_servicio_fecha && <span> ó </span>}
              {service.proximo_servicio_fecha && (
                <span>el <strong className="figure text-[#f2f2ef]">{formatDateBA(service.proximo_servicio_fecha, { short: true })}</strong></span>
              )}
              <span> (lo que ocurra primero).</span>
            </p>
          </div>
        </section>
      )}

      {/* Texto de pie configurable */}
      {ticketConfig?.texto_pie && (
        <p className="pt-4 border-t border-[#2a2b2e] text-xs text-[#9a9da3] leading-relaxed">
          {ticketConfig.texto_pie}
        </p>
      )}
    </div>
  );
}
