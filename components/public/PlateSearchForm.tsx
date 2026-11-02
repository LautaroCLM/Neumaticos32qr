'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, AlertCircle } from 'lucide-react';
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
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="patente-input" className="block label-caps text-[#9a9da3] mb-2">
            Patente
          </label>
          {/* Placa estilo Mercosur: banda país a la izquierda, fondo claro */}
          <div className="flex h-16 lg:h-20 rounded-md overflow-hidden bg-[#f2f2ef] border-2 border-[#f2f2ef] focus-within:border-[#d31a24] transition-colors">
            <span
              aria-hidden="true"
              className="w-9 lg:w-10 shrink-0 bg-[#0d0d0e] text-[#f2f2ef] flex items-end justify-center pb-2 text-[10px] font-extrabold tracking-[0.08em] select-none"
            >
              RA
            </span>
            <input
              type="text"
              id="patente-input"
              value={patenteInput}
              onChange={(e) => {
                setPatenteInput(e.target.value.toUpperCase());
                setErrorMessage(null);
              }}
              placeholder="AE 123 CD"
              maxLength={10}
              autoCapitalize="characters"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              aria-describedby="patente-hint"
              className="flex-1 min-w-0 bg-transparent px-3.5 text-[#0d0d0e] text-[26px] lg:text-[32px] figure font-extrabold uppercase tracking-[0.08em] placeholder:text-[#6f7176] focus:outline-none"
              style={{ fontStretch: '125%' }}
            />
          </div>
          <p id="patente-hint" className="mt-2 text-xs text-[#9a9da3]">
            Formato nuevo (AE 123 CD) o anterior (ABC 123).
          </p>
        </div>

        <div>
          <label htmlFor="digitos-input" className="block label-caps text-[#9a9da3] mb-2">
            Últimos 4 dígitos del teléfono
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
            placeholder="7788"
            aria-describedby="digitos-hint"
            className="w-full h-14 px-3.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] hover:border-[#5f6166] focus:border-[#d31a24] focus:outline-none text-[#f2f2ef] text-2xl figure font-bold tracking-[0.3em] placeholder:text-[#7c7e83] transition-colors"
            style={{ fontStretch: '125%' }}
          />
          <p id="digitos-hint" className="mt-2 text-xs text-[#9a9da3]">
            Del teléfono que dejaste en el taller.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !patenteInput.trim() || digitosInput.length !== 4}
          className="group w-full h-[58px] px-4 rounded-xs bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] disabled:bg-[#d31a24]/45 disabled:text-white/75 disabled:cursor-not-allowed text-white font-display text-base tracking-[0.1em] flex items-center justify-center gap-2.5 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span>Buscando historial</span>
            </>
          ) : (
            <>
              <span>Ver mi historial</span>
              <ArrowRight
                className="w-5 h-5 transition-transform duration-200 ease-out group-enabled:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <div role="alert" className="mt-5 pt-4 border-t-2 border-[#d31a24] flex items-start gap-3 text-sm animate-in">
          <AlertCircle className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-[#f2f2ef]">{errorMessage}</p>
            <p className="text-xs text-[#c8cad0] mt-1 leading-relaxed">
              Si no dejaste tu teléfono o cambió, pedí el enlace de tu vehículo en el taller.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
