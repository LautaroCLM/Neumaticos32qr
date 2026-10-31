'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import { normalizePatente } from '@/lib/utils/formatters';

export function PlateSearchForm() {
  const [patenteInput, setPatenteInput] = useState('');
  const [digitosInput, setDigitosInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = normalizePatente(patenteInput);
    if (!clean || digitosInput.length !== 4) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/vehicle-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patente: clean, ultimos_digitos: digitosInput }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || 'Ocurrió un error al buscar el historial.');
        setLoading(false);
        return;
      }

      window.location.assign(`/v/${data.token}`);
    } catch {
      setErrorMessage('No pudimos conectar con el servidor. Revisá tu conexión a internet.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative flex items-center">
          {/* Argentine Plate Visual Indicator */}
          <div className="absolute left-3.5 flex items-center gap-1.5 pointer-events-none select-none text-zinc-500">
            <span className="text-[10px] font-bold tracking-widest px-1 py-0.5 rounded bg-zinc-800 text-zinc-300">
              RA
            </span>
          </div>

          <input
            type="text"
            id="patente-input"
            aria-label="Número de patente del vehículo"
            value={patenteInput}
            onChange={(e) => {
              setPatenteInput(e.target.value.toUpperCase());
              setErrorMessage(null);
            }}
            placeholder="EJ: AE 123 CD ó ABC 123"
            maxLength={10}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck="false"
            className="w-full pl-16 pr-4 py-4 rounded-xl bg-[#0a0b0d] border-2 border-[#262a33] focus:border-[#d31a24] focus:outline-none text-white text-lg font-mono font-bold tracking-wider placeholder:text-zinc-500 placeholder:font-sans placeholder:font-normal placeholder:text-sm transition-colors shadow-inner min-h-[48px]"
          />
        </div>

        <div>
          <label htmlFor="digitos-input" className="block text-xs font-semibold text-[#c8cdd5] mb-1.5">
            Últimos 4 dígitos del teléfono que dejaste en el taller
          </label>
          <input
            type="text"
            id="digitos-input"
            inputMode="numeric"
            autoComplete="off"
            value={digitosInput}
            onChange={(e) => {
              setDigitosInput(e.target.value.replace(/\D/g, '').slice(0, 4));
              setErrorMessage(null);
            }}
            placeholder="EJ: 7788"
            className="w-full px-4 py-4 rounded-xl bg-[#0a0b0d] border-2 border-[#262a33] focus:border-[#d31a24] focus:outline-none text-white text-lg font-mono font-bold tracking-widest placeholder:text-zinc-500 placeholder:font-sans placeholder:font-normal placeholder:text-sm placeholder:tracking-normal transition-colors shadow-inner min-h-[48px]"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !patenteInput.trim() || digitosInput.length !== 4}
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

      {errorMessage && (
        <div className="mt-4 p-4 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start gap-3 text-red-200 text-sm">
          <AlertCircle className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{errorMessage}</p>
            <p className="text-xs text-zinc-400 mt-1">
              Si no dejaste tu teléfono o cambió, pedí el enlace de tu vehículo en el taller.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
