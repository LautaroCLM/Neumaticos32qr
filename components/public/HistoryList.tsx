'use client';

import { useState } from 'react';
import { ServiceRecord, ShopTicketConfig } from '@/lib/types/database';
import { ServiceBadge } from './ServiceBadge';
import { TicketDetails } from './TicketCard';
import { formatDateBA, formatKilometers, formatCurrencyARS, formatTicketNumber } from '@/lib/utils/formatters';
import { ChevronDown, FileEdit } from 'lucide-react';

interface HistoryListProps {
  services: ServiceRecord[];
  hidePrices?: boolean;
  ticketConfig?: ShopTicketConfig;
}

export function HistoryList({ services, hidePrices = false, ticketConfig }: HistoryListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (services.length === 0) {
    return (
      <p className="py-8 text-center border-y border-[#2a2b2e] text-[#9a9da3] text-sm">
        No hay registros de mantenimientos anteriores.
      </p>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section aria-labelledby="history-title">
      <div className="flex items-baseline justify-between gap-3 pb-3 border-b-2 border-[#f2f2ef]">
        <h2 id="history-title" className="font-display text-lg sm:text-xl text-[#f2f2ef]">
          Servicios anteriores
        </h2>
        <span className="figure text-sm font-bold text-[#9a9da3]">{services.length}</span>
      </div>

      <ol>
        {services.map((item) => {
          const isExpanded = expandedId === item.id;
          const panelId = `history-panel-${item.id}`;

          return (
            <li key={item.id} className="border-b border-[#2a2b2e]">
              <button
                type="button"
                onClick={() => toggleExpand(item.id)}
                aria-expanded={isExpanded}
                aria-controls={panelId}
                className={`group py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[104px_1fr_auto] items-start gap-x-4 gap-y-2 text-left transition-colors hover:bg-[#161719] min-h-[56px] -mx-2 px-2 w-[calc(100%+1rem)] ${
                  isExpanded ? 'bg-[#161719]' : ''
                }`}
              >
                <span className="col-span-2 sm:col-span-1 flex sm:flex-col items-baseline sm:items-start gap-x-2 gap-y-0.5 figure text-sm font-semibold text-[#f2f2ef] sm:pt-1">
                  {formatDateBA(item.fecha_hora, { short: true })}
                  {item.numero !== undefined && (
                    <span className="text-xs font-normal text-[#9a9da3]">{formatTicketNumber(item.numero)}</span>
                  )}
                </span>

                <span className="min-w-0 space-y-1.5">
                  <span className="flex items-center gap-2 flex-wrap">
                    <ServiceBadge tipo={item.tipo} />
                    {item.editado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#c8cad0]">
                        <FileEdit className="w-3 h-3 text-[#9a9da3]" aria-hidden="true" />
                        Editado
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-[#c8cad0] truncate">{item.descripcion}</span>
                </span>

                <span className="flex items-start gap-3 shrink-0">
                  <span className="text-right space-y-0.5">
                    {!hidePrices && item.precio !== null && item.precio !== undefined && (
                      <span className="block figure text-[15px] font-bold text-[#f2f2ef]">
                        {formatCurrencyARS(item.precio)}
                      </span>
                    )}
                    {item.kilometraje !== null && item.kilometraje !== undefined && (
                      <span className="block figure text-xs text-[#9a9da3]">
                        {formatKilometers(item.kilometraje)}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-5 h-5 mt-0.5 text-[#9a9da3] group-hover:text-[#f2f2ef] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isExpanded ? 'rotate-180 text-[#d31a24]' : ''
                    }`}
                  />
                </span>
              </button>

              {/* Ticket completo desplegable */}
              {isExpanded && (
                <div id={panelId} className="border-t border-[#2a2b2e] bg-[#161719] -mx-2 px-0 sm:px-2 mb-4 animate-in">
                  <TicketDetails service={item} hidePrices={hidePrices} ticketConfig={ticketConfig} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
