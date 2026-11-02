'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { changeVehicleOwnerAction } from '@/lib/actions/vehicles';
import { formatPhoneDisplay } from '@/lib/utils/formatters';
import { AlertCircle, AlertTriangle, Loader2, Save, UserCog, X } from 'lucide-react';

const NEW_CUSTOMER = 'nuevo';
const NO_OWNER = 'ninguno';

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-sm bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]';

interface VehicleOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  currentCustomerId: string | null;
  customers: Array<{ id: string; nombre: string; telefono: string | null }>;
}

export function VehicleOwnerModal({
  isOpen,
  onClose,
  vehicleId,
  currentCustomerId,
  customers,
}: VehicleOwnerModalProps) {
  const router = useRouter();
  const [selection, setSelection] = useState(currentCustomerId || NEW_CUSTOMER);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [esTransferencia, setEsTransferencia] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasOwner = Boolean(currentCustomerId);
  const isTransfer = hasOwner && (esTransferencia || selection === NO_OWNER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await changeVehicleOwnerAction(vehicleId, {
        customerId: selection === NEW_CUSTOMER || selection === NO_OWNER ? null : selection,
        nuevoCliente: selection === NEW_CUSTOMER ? { nombre, telefono: telefono || null } : null,
        esTransferencia: isTransfer,
      });

      if (!res.success) {
        setError(res.error || 'No se pudo cambiar el propietario.');
        return;
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al cambiar el propietario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            <UserCog className="w-4 h-4 text-[#f04d55]" />
            Propietario del Vehículo
          </h2>
          <button
            onClick={onClose}
            title="Cerrar"
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-sm hover:bg-zinc-800 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="owner-select" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Propietario
            </label>
            <select
              id="owner-select"
              value={selection}
              onChange={(e) => setSelection(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value={NEW_CUSTOMER}>+ Cliente nuevo</option>
              {hasOwner && <option value={NO_OWNER}>Sin propietario (vehículo vendido a un tercero)</option>}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.nombre}
                  {customer.telefono ? ` · ${formatPhoneDisplay(customer.telefono)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {selection === NEW_CUSTOMER && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="owner-nombre" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Nombre *
                </label>
                <input
                  id="owner-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label htmlFor="owner-telefono" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp
                </label>
                <input
                  id="owner-telefono"
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 11 3456-7890"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          )}

          {hasOwner && selection !== NO_OWNER && (
            <fieldset className="space-y-2">
              <legend className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">Motivo</legend>
              <label className="flex items-start gap-3 p-3 rounded-sm bg-zinc-950/60 border border-zinc-800/80 cursor-pointer">
                <input
                  type="radio"
                  name="motivo"
                  checked={esTransferencia}
                  onChange={() => setEsTransferencia(true)}
                  className="mt-0.5"
                />
                <span className="text-xs text-zinc-300">
                  <strong className="text-zinc-100">El vehículo cambió de dueño.</strong> Se conserva el historial técnico.
                </span>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-sm bg-zinc-950/60 border border-zinc-800/80 cursor-pointer">
                <input
                  type="radio"
                  name="motivo"
                  checked={!esTransferencia}
                  onChange={() => setEsTransferencia(false)}
                  className="mt-0.5"
                />
                <span className="text-xs text-zinc-300">
                  <strong className="text-zinc-100">Estaba mal cargado.</strong> Solo se corrige el propietario, sin cambiar el QR.
                </span>
              </label>
            </fieldset>
          )}

          {isTransfer && (
            <div className="p-3 rounded-sm bg-[#880e14]/20 border border-[#d31a24]/30 flex items-start gap-2 text-xs text-zinc-300">
              <AlertTriangle className="w-4 h-4 text-[#f04d55] shrink-0 mt-0.5" />
              <span>
                El QR actual dejará de funcionar y habrá que imprimir uno nuevo. Desde el nuevo QR no se verán los precios ni las notas de los trabajos anteriores.
              </span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-sm text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-black uppercase tracking-wider bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Confirmar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
