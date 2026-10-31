'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateVehicleAction } from '@/lib/actions/vehicles';
import { AlertCircle, Car, Loader2, Save, X } from 'lucide-react';

interface VehicleEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio?: number | null;
    ocultar_precios?: boolean | null;
  };
}

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]';

export function VehicleEditModal({ isOpen, onClose, vehicle }: VehicleEditModalProps) {
  const router = useRouter();
  const [patente, setPatente] = useState(vehicle.patente);
  const [marca, setMarca] = useState(vehicle.marca);
  const [modelo, setModelo] = useState(vehicle.modelo);
  const [anio, setAnio] = useState(vehicle.anio?.toString() || '');
  const [ocultarPrecios, setOcultarPrecios] = useState(Boolean(vehicle.ocultar_precios));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await updateVehicleAction(vehicle.id, {
        patente,
        marca,
        modelo,
        anio: anio ? parseInt(anio, 10) : null,
        ocultar_precios: ocultarPrecios,
      });

      if (!res.success) {
        setError(res.error || 'No se pudo guardar el vehículo.');
        return;
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al guardar el vehículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            <Car className="w-4 h-4 text-[#d31a24]" />
            Editar Vehículo
          </h2>
          <button
            onClick={onClose}
            title="Cerrar"
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
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
          <div>
            <label htmlFor="edit-patente" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Patente *
            </label>
            <input
              id="edit-patente"
              type="text"
              value={patente}
              onChange={(e) => setPatente(e.target.value.toUpperCase())}
              maxLength={10}
              required
              className={`${INPUT_CLASS} font-mono font-bold uppercase tracking-wider`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-marca" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Marca *
              </label>
              <input
                id="edit-marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="edit-modelo" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Modelo *
              </label>
              <input
                id="edit-modelo"
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-anio" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Año
            </label>
            <input
              id="edit-anio"
              type="number"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              min="1950"
              max={new Date().getFullYear() + 2}
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 cursor-pointer">
            <input
              type="checkbox"
              checked={ocultarPrecios}
              onChange={(e) => setOcultarPrecios(e.target.checked)}
              className="w-4 h-4 rounded text-[#d31a24] bg-zinc-900 border-zinc-700"
            />
            <span className="text-xs text-zinc-300">
              Ocultar precios en el ticket público de este vehículo
            </span>
          </label>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#d31a24] hover:bg-[#e52530] text-white cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
