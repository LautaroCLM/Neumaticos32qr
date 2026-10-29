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
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border-2 border-amber-500/40 shadow-2xl">
      {/* Ribbon superior */}
      <div className="bg-amber-500 px-4 py-1.5 flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-950 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {ticketConfig?.titulo_ticket || 'Último Servicio Realizado'}
        </span>

        <div className="flex items-center gap-1.5">
          {service.editado && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-950 text-amber-400 flex items-center gap-1" title="Este ticket fue editado">
              <FileEdit className="w-2.5 h-2.5" />
              Editado
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-950/20 text-zinc-950">
            {isPreview ? 'VISTA PREVIA' : 'TICKET DIGITAL'}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Encabezado: Tipo de trabajo y Fecha */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-4">
          <ServiceBadge tipo={service.tipo} />
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>{formatDateBA(service.fecha_hora, { includeTime: true })}</span>
          </div>
        </div>

        {/* Datos técnicos: Kilometraje y Sucursal (si no están purgados/ocultos) */}
        {(service.kilometraje !== null && service.kilometraje !== undefined || service.sucursal) && (
          <div className="grid grid-cols-2 gap-3">
            {service.kilometraje !== null && service.kilometraje !== undefined && (
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-amber-400 shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Kilometraje</p>
                  <p className="text-sm font-bold text-zinc-100 font-mono">
                    {formatKilometers(service.kilometraje)}
                  </p>
                </div>
              </div>
            )}

            {service.sucursal && (
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 flex items-center justify-center text-cyan-400 shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Sucursal</p>
                  <p className="text-sm font-semibold text-zinc-100 truncate">
                    {service.sucursal}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trabajo Realizado (Texto plano seguro) */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Trabajo Realizado
          </h4>
          <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/60 whitespace-pre-wrap">
            {service.descripcion}
          </p>
        </div>

        {/* Repuestos / Productos o Desglose de Ítems */}
        {hasItems ? (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
              Detalle de Ítems y Repuestos
            </h4>
            <div className="rounded-xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800/60 bg-zinc-950/40">
              {service.items?.map((item, idx) => (
                <div key={idx} className="p-2.5 px-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[11px] font-bold">
                      {item.cantidad}x
                    </span>
                    <span className="text-zinc-200 truncate">{item.concepto}</span>
                  </div>
                  {!hidePrices && item.precio_unitario !== null && item.precio_unitario !== undefined && (
                    <span className="text-zinc-300 font-mono shrink-0">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                Repuestos y Materiales
              </h4>
              <p className="text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 leading-normal whitespace-pre-wrap">
                {service.productos}
              </p>
            </div>
          )
        )}

        {/* Campos Extra Personalizados */}
        {hasExtraFields && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {service.campos_extra?.map((f, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60 text-xs">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase flex items-center gap-1">
                  <Tag className="w-3 h-3 text-zinc-500" />
                  {f.titulo}
                </p>
                <p className="text-zinc-200 font-medium mt-0.5">{f.valor}</p>
              </div>
            ))}
          </div>
        )}

        {/* Notas / Observaciones para el Cliente */}
        {service.notas_cliente && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-amber-400" />
              Observaciones del Taller
            </h4>
            <p className="text-xs text-zinc-300 bg-zinc-950/40 p-3 rounded-xl border border-zinc-800/60 leading-relaxed whitespace-pre-wrap">
              {service.notas_cliente}
            </p>
          </div>
        )}

        {/* Precio Total (si no está purgado ni oculto) */}
        {!hidePrices && effectivePrice !== null && effectivePrice !== undefined && (
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total Abonado
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono tracking-tight">
              {formatCurrencyARS(effectivePrice)}
            </span>
          </div>
        )}

        {/* Próximo Servicio Recomendado */}
        {(service.proximo_servicio_km || service.proximo_servicio_fecha) && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-300">
                {ticketConfig?.etiqueta_proximo_service || 'Próximo servicio recomendado:'}
              </p>
              <p className="text-zinc-300">
                {service.proximo_servicio_km && (
                  <span>A los <strong>{formatKilometers(service.proximo_servicio_km)}</strong></span>
                )}
                {service.proximo_servicio_km && service.proximo_servicio_fecha && <span> ó </span>}
                {service.proximo_servicio_fecha && (
                  <span>el <strong>{formatDateBA(service.proximo_servicio_fecha, { short: true })}</strong></span>
                )}
                <span> (lo que ocurra primero).</span>
              </p>
            </div>
          </div>
        )}

        {/* Texto de Pie configurable */}
        {ticketConfig?.texto_pie && (
          <div className="pt-2 border-t border-zinc-900 text-[11px] text-zinc-400 text-center leading-normal">
            {ticketConfig.texto_pie}
          </div>
        )}
      </div>
    </div>
  );
}
