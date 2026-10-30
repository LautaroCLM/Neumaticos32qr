'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VehicleQuickCreateModal } from '@/components/admin/VehicleQuickCreateModal';
import { formatPatenteDisplay, normalizePatente } from '@/lib/utils/formatters';
import { Car, Search, Plus, ArrowRight, ArrowLeft } from 'lucide-react';

interface VehicleOption {
  id: string;
  patente: string;
  marca: string;
  modelo: string;
  anio?: number | null;
  cliente_nombre?: string | null;
}

export function ServiceNewVehicleSelector({ vehicles }: { vehicles: VehicleOption[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  const cleanSearch = normalizePatente(searchTerm);
  const filtered = vehicles.filter(
    (v) =>
      normalizePatente(v.patente).includes(cleanSearch) ||
      v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#D31A24] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al inicio</span>
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tight text-zinc-100">
          Nuevo Servicio: Seleccioná el Vehículo
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Para cargar un ticket digital, primero seleccioná el vehículo o registralo en el momento.
        </p>
      </div>

      {/* Input Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscá por patente (ej. AA123BB), modelo o cliente..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#0A0B0D] border border-[#262a33] text-zinc-100 text-sm focus:outline-none focus:border-[#D31A24] min-h-[48px]"
          autoFocus
        />
      </div>

      {/* Botón Alta de Vehículo */}
      <div className="p-4 rounded-2xl bg-[#D31A24]/10 border border-[#D31A24]/30 flex items-center justify-between gap-3">
        <div className="text-xs">
          <p className="font-bold text-[#D31A24] uppercase tracking-wider">¿El vehículo no está registrado?</p>
          <p className="text-zinc-300">Dalo de alta en 10 segundos con solo patente, marca y modelo.</p>
        </div>
        <button
          onClick={() => setIsQuickCreateOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D31A24] hover:bg-[#b0141c] text-white text-xs font-black uppercase tracking-wider shadow-md shadow-red-900/30 cursor-pointer shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span>Alta Rápida</span>
        </button>
      </div>

      {/* Lista de Vehículos */}
      <div className="space-y-2">
        {filtered.map((veh) => (
          <Link
            key={veh.id}
            href={`/admin/services/new?vehicle_id=${veh.id}`}
            className="p-4 rounded-2xl bg-[#14161b] hover:bg-[#1a1d24] border border-[#262a33] hover:border-red-500/40 flex items-center justify-between gap-3 transition-all group min-h-[48px]"
          >
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-[#0A0B0D] border border-[#262a33] font-mono font-bold text-xs text-white">
                {formatPatenteDisplay(veh.patente)}
              </span>
              <div>
                <h4 className="text-xs font-bold text-zinc-200">
                  {veh.marca} {veh.modelo} {veh.anio ? `(${veh.anio})` : ''}
                </h4>
                {veh.cliente_nombre && (
                  <p className="text-[11px] text-zinc-400">{veh.cliente_nombre}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-[#D31A24] group-hover:translate-x-1 transition-transform">
              <span>Elegir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        ))}
      </div>

      <VehicleQuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        initialPatente={searchTerm}
        onSuccess={(newId) => router.push(`/admin/services/new?vehicle_id=${newId}`)}
      />
    </div>
  );
}
