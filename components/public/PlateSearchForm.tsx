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
              className="w-full pl-16 pr-4 py-4 rounded-xl bg-[#0a0b0d] border-2 border-[#262a33] focus:border-[#d31a24] focus:outline-none text-white text-lg font-mono font-bold tracking-wider placeholder:text-zinc-500 placeholder:font-sans placeholder:font-normal placeholder:text-sm transition-colors shadow-inner min-h-[48px]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !patenteInput.trim()}
          className="w-full py-4 px-4 rounded-xl bg-[#d31a24] hover:bg-[#e52530] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#d31a24]/20 min-h-[52px]"
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
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-200 text-sm animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-xs text-zinc-400 mt-1">
              Verificá haber escrito la patente completa sin caracteres especiales. Si acabás de retirar el vehículo, puede demorar unos minutos en impactar.
            </p>
          </div>
        </div>
      )}

      {/* Resultado Sanitizado de Búsqueda Pública */}
      {result?.data && (
        <div className="mt-6 p-5 rounded-2xl bg-[#14161b] border border-[#262a33] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-[#262a33] pb-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-[#d31a24] uppercase">
                Vehículo Registrado
              </span>
              <h3 className="text-xl font-bold text-white font-mono tracking-tight">
                {formatPatenteDisplay(result.data.patente)}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold text-white">
                {result.data.marca}
              </span>
              <p className="text-xs text-[#c8cdd5]">
                {result.data.modelo} {result.data.anio ? `(${result.data.anio})` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-xl bg-[#0a0b0d] border border-[#262a33] flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-[#262a33] flex items-center justify-center text-[#c8cdd5] shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#8b929e] font-medium">Último Mantenimiento</p>
                <p className="text-sm font-bold text-white">
                  {formatDateBA(result.data.fecha_ultimo_servicio, { short: true })}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0a0b0d] border border-[#880e14]/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#880e14]/20 border border-[#d31a24]/30 flex items-center justify-center text-[#d31a24] shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-[#d31a24] font-bold">Próximo Service</p>
                <p className="text-sm font-bold text-white">
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
          <div className="p-4 rounded-xl bg-[#0a0b0d] border border-[#d31a24]/30 flex items-start gap-3">
            <QrCode className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 space-y-1">
              <p className="font-bold text-white">
                ¿Querés ver el detalle completo, repuestos y precios?
              </p>
              <p className="text-[#c8cdd5] leading-relaxed">
                Por protección de tus datos y privacidad, los importes y comprobantes completos solo son accesibles escaneando el <strong>código QR</strong> del sticker colocado en tu vehículo o entregado en el taller.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
