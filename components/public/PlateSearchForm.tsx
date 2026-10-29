'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle, Calendar, Wrench, Shield, QrCode } from 'lucide-react';
import { normalizePatente, formatPatenteDisplay, formatDateBA, formatKilometers } from '@/lib/utils/formatters';
import type { PublicPlateSearchResult } from '@/lib/types/database';

export function PlateSearchForm() {
  const [patenteInput, setPatenteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PublicPlateSearchResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePatente(patenteInput);
    if (!clean) return;

    setLoading(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch('/api/search-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patente: clean }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.not_found) {
          setErrorMessage('No encontramos esa patente en nuestro sistema.');
        } else if (data.blocked) {
          setErrorMessage(data.error || 'Acceso bloqueado temporalmente por seguridad.');
        } else {
          setErrorMessage(data.error || 'Ocurrió un error al buscar la patente.');
        }
        return;
      }

      setResult(data);
    } catch {
      setErrorMessage('No pudimos conectar con el servidor. Revisá tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setPatenteInput(raw);
    if (errorMessage) setErrorMessage(null);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <div className="relative flex items-center">
            {/* Argentine Plate Visual Indicator */}
            <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none select-none text-zinc-500">
              <span className="text-[10px] font-bold tracking-widest px-1 py-0.5 rounded bg-zinc-800 text-zinc-300">
                RA
              </span>
            </div>

            <input
              type="text"
              value={patenteInput}
              onChange={handleInputChange}
              placeholder="EJ: AE 123 CD ó ABC 123"
              maxLength={10}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              className="w-full pl-16 pr-4 py-4 rounded-xl bg-zinc-900 border-2 border-zinc-700 focus:border-amber-500 focus:outline-none text-zinc-100 text-lg font-mono font-bold tracking-wider placeholder:text-zinc-500 placeholder:font-sans placeholder:font-normal placeholder:text-sm transition-colors shadow-inner"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !patenteInput.trim()}
          className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-zinc-950 font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Buscando historial...</span>
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              <span>Ver mi historial</span>
            </>
          )}
        </button>
      </form>

      {/* Mensajes de Error / No Encontrado */}
      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-xs text-red-400/80 mt-1">
              Verificá haber escrito la patente completa sin caracteres especiales. Si acabás de retirar el vehículo, puede demorar unos minutos en impactar.
            </p>
          </div>
        </div>
      )}

      {/* Resultado Sanitizado de Búsqueda Pública */}
      {result?.data && (
        <div className="mt-6 p-5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-amber-400 uppercase">
                Vehículo Registrado
              </span>
              <h3 className="text-xl font-bold text-zinc-100 font-mono tracking-tight">
                {formatPatenteDisplay(result.data.patente)}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-zinc-200">
                {result.data.marca}
              </span>
              <p className="text-xs text-zinc-400">
                {result.data.modelo} {result.data.anio ? `(${result.data.anio})` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-medium">Último Mantenimiento</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {formatDateBA(result.data.fecha_ultimo_servicio, { short: true })}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-zinc-400 font-medium">Próximo Service</p>
                <p className="text-sm font-semibold text-zinc-200">
                  {result.data.proximo_servicio_km
                    ? formatKilometers(result.data.proximo_servicio_km)
                    : result.data.proximo_servicio_fecha
                    ? formatDateBA(result.data.proximo_servicio_fecha, { short: true })
                    : 'A consultar'}
                </p>
              </div>
            </div>
          </div>

          {/* Banner de Privacidad y Acceso al Historial Completo */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-start gap-3">
            <QrCode className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 space-y-1">
              <p className="font-semibold text-amber-300">
                ¿Querés ver el detalle completo, repuestos y precios?
              </p>
              <p className="text-zinc-400 leading-relaxed">
                Por protección de tus datos y privacidad, los importes y comprobantes completos solo son accesibles escaneando el <strong>código QR</strong> del sticker colocado en tu vehículo o entregado en el taller.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
