'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomerAction, updateCustomerAction } from '@/lib/actions/customers';
import { formatPhoneDisplay } from '@/lib/utils/formatters';
import { AlertCircle, Loader2, Lock, Save, Users, X } from 'lucide-react';

const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-sm bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-[#d31a24]';

interface CustomerFormModalProps {
  onClose: () => void;
  customer?: {
    id: string;
    nombre: string;
    telefono: string | null;
    email: string | null;
    notas_internas: string | null;
  } | null;
}

export function CustomerFormModal({ onClose, customer }: CustomerFormModalProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState(customer?.nombre || '');
  const [telefono, setTelefono] = useState(customer?.telefono ? formatPhoneDisplay(customer.telefono) : '');
  const [email, setEmail] = useState(customer?.email || '');
  const [notas, setNotas] = useState(customer?.notas_internas || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const values = {
        nombre,
        telefono: telefono || null,
        email: email || null,
        notas_internas: notas || null,
      };
      const res = customer
        ? await updateCustomerAction(customer.id, values)
        : await createCustomerAction(values);

      if (!res.success) {
        setError(res.error || 'No se pudo guardar el cliente.');
        return;
      }

      onClose();
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al guardar el cliente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <h2 className="text-base font-black text-zinc-100 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-4 h-4 text-[#f04d55]" />
            {customer ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            <label htmlFor="customer-nombre" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Nombre *
            </label>
            <input
              id="customer-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="customer-telefono" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Teléfono / WhatsApp
              </label>
              <input
                id="customer-telefono"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 11 3456-7890"
                className={INPUT_CLASS}
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Con sus últimos 4 dígitos, el cliente puede ver su historial desde la web.
              </p>
            </div>
            <div>
              <label htmlFor="customer-email" className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
                Email
              </label>
              <input
                id="customer-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label htmlFor="customer-notas" className="text-xs font-bold text-[#f04d55] flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5" />
              Notas Internas (nunca las ve el cliente)
            </label>
            <textarea
              id="customer-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={INPUT_CLASS}
            />
          </div>

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
              <span>Guardar</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
