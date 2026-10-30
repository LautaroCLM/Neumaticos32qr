import { ServiceRecord, ShopTicketConfig } from '@/lib/types/database';
import { ServiceBadge } from './ServiceBadge';
import { formatDateBA, formatKilometers, formatCurrencyARS } from '@/lib/utils/formatters';
import {
  Calendar,
  Gauge,
  MapPin,
  PackageCheck,
  AlertCircle,
  Clock,
  FileEdit,
  Tag,
  StickyNote,
} from 'lucide-react';

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
  const effectivePrice =
    service.total_manual !== null && service.total_manual !== undefined
      ? service.total_manual
      : service.precio;

  const hasItems = service.items && service.items.length > 0;
  const hasExtraFields = service.campos_extra && service.campos_extra.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#14161b] border-2 border-[#262a33] shadow-2xl">
      {/* Ribbon superior estilo Orden de Trabajo */}
      <div className="bg-[#d31a24] px-4 py-2 flex items-center justify-between shadow-md">
        <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 font-sans">
          <Clock className="w-3.5 h-3.5" />
          {ticketConfig?.titulo_ticket || 'Último Servicio Realizado'}
        </span>

        <div className="flex items-center gap-1.5">
          {service.editado && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0a0b0d] text-[#c8cdd5] flex items-center gap-1" title="Este ticket fue editado">
              <FileEdit className="w-2.5 h-2.5 text-[#d31a24]" />
              Editado
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0a0b0d]/30 text-white">
            {isPreview ? 'VISTA PREVIA' : 'TICKET DIGITAL'}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Encabezado: Tipo de trabajo y Fecha */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262a33] pb-4">
          <ServiceBadge tipo={service.tipo} />
          <div className="flex items-center gap-1.5 text-xs text-[#c8cdd5]">
            <Calendar className="w-3.5 h-3.5 text-[#8b929e]" />
            <span>{formatDateBA(service.fecha_hora, { includeTime: true })}</span>
          </div>
        </div>

        {/* Datos técnicos: Kilometraje y Sucursal (si no están purgados/ocultos) */}
        {(service.kilometraje !== null && service.kilometraje !== undefined || service.sucursal) && (
          <div className="grid grid-cols-2 gap-3">
            {service.kilometraje !== null && service.kilometraje !== undefined && (
              <div className="p-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-[#c8cdd5] shrink-0">
                  <Gauge className="w-4 h-4 text-[#d31a24]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8b929e] font-semibold uppercase tracking-wider">Kilometraje</p>
                  <p className="text-sm font-bold text-white font-mono">
                    {formatKilometers(service.kilometraje)}
                  </p>
                </div>
              </div>
            )}

            {service.sucursal && (
              <div className="p-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-[#c8cdd5] shrink-0">
                  <MapPin className="w-4 h-4 text-[#c8cdd5]" />
                </div>
                <div>
                  <p className="text-[10px] text-[#8b929e] font-semibold uppercase tracking-wider">Sucursal</p>
                  <p className="text-sm font-bold text-white truncate">
                    {service.sucursal}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trabajo Realizado (Texto plano seguro) */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8b929e]">
            Trabajo Realizado
          </h4>
          <p className="text-sm text-white leading-relaxed bg-[#0a0b0d] p-3.5 rounded-xl border border-[#262a33] whitespace-pre-wrap">
            {service.descripcion}
          </p>
        </div>

        {/* Repuestos / Productos o Desglose de Ítems */}
        {hasItems ? (
          <div className="space-y-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8b929e] flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-[#d31a24]" />
              Detalle de Ítems y Repuestos
            </h4>
            <div className="rounded-xl border border-[#262a33] overflow-hidden divide-y divide-[#262a33] bg-[#0a0b0d]">
              {service.items?.map((item, idx) => (
                <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-mono text-[11px] font-bold">
                      {item.cantidad}x
                    </span>
                    <span className="text-zinc-200 truncate">{item.concepto}</span>
                  </div>
                  {!hidePrices && item.precio_unitario !== null && item.precio_unitario !== undefined && (
                    <span className="text-white font-mono shrink-0 font-bold">
                      {formatCurrencyARS(item.precio_unitario * item.cantidad)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          service.productos && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8b929e] flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-[#d31a24]" />
                Repuestos y Materiales
              </h4>
              <p className="text-xs text-zinc-300 bg-[#0a0b0d] p-3 rounded-xl border border-[#262a33] leading-normal whitespace-pre-wrap">
                {service.productos}
              </p>
            </div>
          )
        )}

        {/* Campos Extra Personalizados */}
        {hasExtraFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {service.campos_extra?.map((f, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-[#0a0b0d] border border-[#262a33] text-xs">
                <p className="text-[10px] font-semibold text-[#8b929e] uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-[#d31a24]" />
                  {f.titulo}
                </p>
                <p className="text-white font-bold mt-0.5">{f.valor}</p>
              </div>
            ))}
          </div>
        )}

        {/* Notas / Observaciones para el Cliente */}
        {service.notas_cliente && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#8b929e] flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-[#c8cdd5]" />
              Observaciones del Taller
            </h4>
            <p className="text-xs text-zinc-300 bg-[#0a0b0d] p-3 rounded-xl border border-[#262a33] leading-relaxed whitespace-pre-wrap">
              {service.notas_cliente}
            </p>
          </div>
        )}

        {/* Precio Total (si no está purgado ni oculto) */}
        {!hidePrices && effectivePrice !== null && effectivePrice !== undefined && (
          <div className="pt-2 border-t border-[#262a33] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8b929e]">
              Total Abonado
            </span>
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatCurrencyARS(effectivePrice)}
            </span>
          </div>
        )}

        {/* Próximo Servicio Recomendado */}
        {(service.proximo_servicio_km || service.proximo_servicio_fecha) && (
          <div className="p-3.5 rounded-xl bg-[#880e14]/20 border border-[#d31a24]/30 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-[#d31a24] shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-white">
                {ticketConfig?.etiqueta_proximo_service || 'Próximo control recomendado:'}
              </p>
              <p className="text-[#c8cdd5]">
                {service.proximo_servicio_km && (
                  <span>A los <strong className="text-white">{formatKilometers(service.proximo_servicio_km)}</strong></span>
                )}
                {service.proximo_servicio_km && service.proximo_servicio_fecha && <span> ó </span>}
                {service.proximo_servicio_fecha && (
                  <span>el <strong className="text-white">{formatDateBA(service.proximo_servicio_fecha, { short: true })}</strong></span>
                )}
                <span> (lo que ocurra primero).</span>
              </p>
            </div>
          </div>
        )}

        {/* Texto de Pie configurable */}
        {ticketConfig?.texto_pie && (
          <div className="pt-2 border-t border-[#262a33] text-[11px] text-[#8b929e] text-center leading-normal">
            {ticketConfig.texto_pie}
          </div>
        )}
      </div>
    </div>
  );
}
