'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CustomerFormModal } from '@/components/admin/CustomerFormModal';
import { formatPatenteDisplay, formatPhoneDisplay } from '@/lib/utils/formatters';
import { Car, Mail, Pencil, Phone, Plus, Search, Users } from 'lucide-react';

interface CustomersListViewProps {
  customers: any[];
}

export function CustomersListView({ customers }: CustomersListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    const digits = term.replace(/\D/g, '');
    return customers.filter(
      (c) =>
        c.nombre.toLowerCase().includes(term) ||
        (digits && c.telefono?.includes(digits)) ||
        c.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const openForm = (customer: any | null) => {
    setEditing(customer);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D31A24]" />
            Clientes ({customers.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Datos de contacto y vehículos de cada cliente del taller
          </p>
        </div>

        <button
          onClick={() => openForm(null)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D31A24] hover:bg-[#b0141c] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-red-900/30 transition-all cursor-pointer min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0A0B0D] border border-[#262a33] text-zinc-100 text-sm focus:outline-none focus:border-[#D31A24] min-h-[48px]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#14161b] border border-[#262a33] text-center space-y-3">
          <Users className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-300">No encontramos ningún cliente</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Los clientes también se crean al registrar un vehículo con nombre y teléfono.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const vehicles = (customer.vehicle_owners || [])
              .filter((owner: any) => owner.hasta === null && owner.vehicles)
              .map((owner: any) => owner.vehicles);

            return (
              <div
                key={customer.id}
                className="p-5 rounded-2xl bg-[#14161b] border border-[#262a33] flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-black text-zinc-100">{customer.nombre}</h3>
                    <button
                      onClick={() => openForm(customer)}
                      title="Editar cliente"
                      className="p-2 rounded-xl bg-[#0A0B0D] hover:bg-zinc-800 text-zinc-400 hover:text-[#D31A24] border border-[#262a33] transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  {customer.telefono && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{formatPhoneDisplay(customer.telefono)}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[#262a33] space-y-1.5 text-xs">
                  {vehicles.length === 0 ? (
                    <span className="text-zinc-500">Sin vehículos a su nombre</span>
                  ) : (
                    vehicles.map((vehicle: any) => (
                      <Link
                        key={vehicle.id}
                        href={`/admin/vehicles/${vehicle.id}`}
                        className="flex items-center gap-2 text-zinc-300 hover:text-[#D31A24] transition-colors min-h-[32px]"
                      >
                        <Car className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <span className="font-mono font-bold">{formatPatenteDisplay(vehicle.patente)}</span>
                        <span className="truncate">{vehicle.marca} {vehicle.modelo}</span>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <CustomerFormModal
          key={editing?.id || 'nuevo'}
          customer={editing}
          onClose={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
