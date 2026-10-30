'use client';

import { useState } from 'react';
import { ServiceRecord } from '@/lib/types/database';
import { ServiceBadge } from './ServiceBadge';
import { formatDateBA, formatKilometers, formatCurrencyARS } from '@/lib/utils/formatters';
import { ChevronDown, Calendar, Gauge, MapPin, PackageCheck, History } from 'lucide-react';

interface HistoryListProps {
  services: ServiceRecord[];
  hidePrices?: boolean;
}

export function HistoryList({ services, hidePrices = false }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (services.length === 0) {
    return (
      <div className="p-8 text-center rounded-2xl bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-sm">
        No hay registros de mantenimientos anteriores.
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm px-1">
        <History className="w-4 h-4 text-[#d31a24]" />
        <span>Historial de Mantenimientos Anteriores ({services.length})</span>
      </div>

      <div className="space-y-2.5">
        {services.map((item, index) => {
          const isExpanded = expandedId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-xl bg-[#14161b] border border-[#262a33] hover:border-zinc-700 transition-colors overflow-hidden"
            >
              {/* Encabezado colapsable con target tactil de 48px */}
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left hover:bg-zinc-800/40 transition-colors min-h-[48px]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#0a0b0d] border border-[#262a33] flex items-center justify-center text-xs font-mono font-bold text-[#c8cdd5] shrink-0">
                    #{services.length - index}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ServiceBadge tipo={item.tipo} />
                      {item.kilometraje !== null && item.kilometraje !== undefined && (
                        <span className="text-xs font-bold font-mono text-zinc-300">
                          {formatKilometers(item.kilometraje)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#8b929e] mt-1 truncate">
                      {item.descripcion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!hidePrices && item.precio !== null && (
                    <span className="text-sm font-bold font-mono text-white hidden sm:inline">
                      {formatCurrencyARS(item.precio)}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
                      isExpanded ? 'rotate-180 text-[#d31a24]' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Contenido Desplegable */}
              {isExpanded && (
                <div className="p-4 pt-2 border-t border-[#262a33] bg-[#0a0b0d] space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-[#8b929e]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#8b929e]" />
                      <span>{formatDateBA(item.fecha_hora, { includeTime: true })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#8b929e]" />
                      <span>{item.sucursal}</span>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-[#8b929e] mb-1">Detalle del trabajo:</p>
                    <p className="text-zinc-200 bg-[#14161b] p-3 rounded-lg border border-[#262a33] leading-relaxed">
                      {item.descripcion}
                    </p>
                  </div>

                  {item.productos && (
                    <div>
                      <p className="font-semibold text-[#8b929e] mb-1 flex items-center gap-1">
                        <PackageCheck className="w-3.5 h-3.5 text-[#d31a24]" />
                        Repuestos utilizados:
                      </p>
                      <p className="text-zinc-300 bg-[#14161b] p-3 rounded-lg border border-[#262a33]">
                        {item.productos}
                      </p>
                    </div>
                  )}

                  {!hidePrices && item.precio !== null && (
                    <div className="pt-2 border-t border-[#262a33] flex items-center justify-between">
                      <span className="text-[#8b929e] font-medium">Importe abonado:</span>
                      <span className="text-base font-bold font-mono text-white">
                        {formatCurrencyARS(item.precio)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
