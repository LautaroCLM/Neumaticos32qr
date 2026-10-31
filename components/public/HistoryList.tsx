'use client';

import { useState } from 'react';
import { ServiceRecord, ShopTicketConfig } from '@/lib/types/database';
import { ServiceBadge } from './ServiceBadge';
import { TicketDetails } from './TicketCard';
import { formatDateBA, formatKilometers, formatCurrencyARS } from '@/lib/utils/formatters';
import { ChevronDown, FileEdit, History } from 'lucide-react';

interface HistoryListProps {
  services: ServiceRecord[];
  hidePrices?: boolean;
  ticketConfig?: ShopTicketConfig;
}

export function HistoryList({ services, hidePrices = false, ticketConfig }: HistoryListProps) {
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
                aria-expanded={isExpanded}
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
                      {item.editado && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0a0b0d] text-[#c8cdd5] flex items-center gap-1">
                          <FileEdit className="w-2.5 h-2.5 text-[#d31a24]" />
                          Editado
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-[#c8cdd5] mt-1">
                      {formatDateBA(item.fecha_hora, { short: true })}
                    </p>
                    <p className="text-xs text-[#8b929e] mt-0.5 truncate">
                      {item.descripcion}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {!hidePrices && item.precio !== null && item.precio !== undefined && (
                    <span className="text-sm font-bold font-mono text-white">
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

              {/* Ticket completo desplegable */}
              {isExpanded && (
                <div className="border-t border-[#262a33]">
                  <TicketDetails service={item} hidePrices={hidePrices} ticketConfig={ticketConfig} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
