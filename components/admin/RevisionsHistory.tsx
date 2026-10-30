'use client';

import { formatDateBA, formatCurrencyARS } from '@/lib/utils/formatters';
import { History, Clock, FileEdit, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ServiceRevision {
  id: string;
  editado_en: string;
  motivo_edicion?: string | null;
  cambios: Record<string, any>;
  editado_por?: string | null;
}

interface RevisionsHistoryProps {
  revisions: ServiceRevision[];
}

export function RevisionsHistory({ revisions }: RevisionsHistoryProps) {
  if (!revisions || revisions.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
        <History className="w-5 h-5 text-zinc-600 mx-auto mb-1.5" />
        <p className="text-xs text-zinc-500 font-medium">Este servicio no registra modificaciones posteriores a su creación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-[#D31A24]" />
        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">
          Historial de Revisiones ({revisions.length})
        </h4>
      </div>

      <div className="space-y-3">
        {revisions.map((rev, index) => {
          const isAnulacion = rev.cambios?.anulado === true;

          return (
            <div
              key={rev.id || index}
              className="p-4 rounded-2xl bg-[#14161b] border border-[#262a33] space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D31A24]" />
                  <span className="font-bold text-zinc-200">
                    {isAnulacion ? 'Anulación de servicio' : 'Modificación de datos'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-mono">
                  <Clock className="w-3 h-3" />
                  <span>{formatDateBA(rev.editado_en, { includeTime: true })}</span>
                </div>
              </div>

              {rev.motivo_edicion && (
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Motivo:</span>
                  <p className="text-zinc-300 italic">"{rev.motivo_edicion}"</p>
                </div>
              )}

              {/* Detalle de cambios registrados */}
              <div className="text-[11px] space-y-1 pt-1 border-t border-zinc-900">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Campos impactados:</span>
                <div className="flex flex-wrap gap-1.5">
                  {Object.keys(rev.cambios || {}).map((key) => (
                    <span
                      key={key}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-zinc-400 text-[10px]"
                    >
                      {key}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
