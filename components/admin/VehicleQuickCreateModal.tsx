'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createVehicleAction } from '@/lib/actions/vehicles';
import { normalizePatente, isValidPatente, formatPatenteDisplay } from '@/lib/utils/formatters';
import { Plus, X, Car, AlertCircle, Loader2 } from 'lucide-react';

interface VehicleQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (vehicleId: string) => void;
  initialPatente?: string;
}

export function VehicleQuickCreateModal({
  isOpen,
  onClose,
  onSuccess,
  initialPatente = '',
}: VehicleQuickCreateModalProps) {
  const router = useRouter();
  const [patente, setPatente] = useState(initialPatente);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState<string>('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [ocultarPrecios, setOcultarPrecios] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const cleanPat = normalizePatente(patente);
  const isPatenteValid = cleanPat.length >= 6 && isValidPatente(cleanPat);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPatenteValid) {
      setError('Ingresá una patente argentina válida (Mercosur: AA123BB o Clásica: AAA123).');
      return;
    }
    if (!marca.trim() || !modelo.trim()) {
      setError('Marca y Modelo son obligatorios.');
      return;
    }

    setLoading(true);
    try {
      const res = await createVehicleAction({
        patente: cleanPat,
        marca: marca.trim(),
        modelo: modelo.trim(),
        anio: anio ? parseInt(anio, 10) : null,
        cliente_nombre: clienteNombre.trim() || null,
        cliente_telefono: clienteTelefono.trim() || null,
        ocultar_precios: ocultarPrecios,
      });

      if (!res.success) {
        setError(res.error || 'Error al crear vehículo.');
        setLoading(false);
        return;
      }

      onClose();
      if (onSuccess && res.vehicleId) {
        onSuccess(res.vehicleId);
      } else if (res.vehicleId) {
        router.push(`/admin/vehicles/${res.vehicleId}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al registrar el vehículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#880e14]/20 border border-[#d31a24]/30 flex items-center justify-center text-[#d31a24]">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight">
                Alta Rápida de Vehículo
              </h2>
              <p className="text-[11px] text-zinc-400">El token y QR se generan automáticamente en el servidor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Patente con preview */}
          <div>
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Patente *
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                value={patente}
                onChange={(e) => setPatente(e.target.value.toUpperCase())}
                placeholder="AA 123 BB o ABC 123"
                maxLength={10}
                required
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 font-mono text-base font-bold uppercase tracking-wider focus:outline-none focus:border-[#d31a24]"
              />
              {cleanPat && (
                <div className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-[#d31a24]">
                  {formatPatenteDisplay(cleanPat)}
                </div>
              )}
            </div>
          </div>

          {/* Marca y Modelo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Marca *
              </label>
              <input
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej. Volkswagen"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Modelo *
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej. Amarok 2.0"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]"
              />
            </div>
          </div>

          {/* Año y Dueño */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Año
              </label>
              <input
                type="number"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                placeholder="2023"
                min="1950"
                max={new Date().getFullYear() + 2}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24] font-mono"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Nombre del Cliente
              </label>
              <input
                type="text"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                placeholder="Ej. Carlos Rossi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]"
              />
            </div>
          </div>

          {/* Teléfono y Ocultar Precios */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Teléfono / WhatsApp del Cliente
              </label>
              <input
                type="text"
                value={clienteTelefono}
                onChange={(e) => setClienteTelefono(e.target.value)}
                placeholder="Ej. 11 3456-7890"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]"
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Si el teléfono ya está cargado, el vehículo se asocia a ese cliente. Con sus últimos 4 dígitos, el cliente puede ver su historial desde la web.
              </p>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 cursor-pointer hover:border-zinc-700 transition-colors">
              <input
                type="checkbox"
                checked={ocultarPrecios}
                onChange={(e) => setOcultarPrecios(e.target.checked)}
                className="w-4 h-4 rounded text-[#d31a24] bg-zinc-900 border-zinc-700 focus:ring-[#d31a24]"
              />
              <span className="text-xs text-zinc-300">
                Ocultar precios por defecto en el ticket público de este vehículo
              </span>
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#d31a24] hover:bg-[#e52530] text-white shadow-lg shadow-[#d31a24]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Registrar Vehículo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
