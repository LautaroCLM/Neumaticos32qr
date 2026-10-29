'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { VehicleQuickCreateModal } from '@/components/admin/VehicleQuickCreateModal';
import { QRPrintModal } from '@/components/admin/QRPrintModal';
import { formatPatenteDisplay, normalizePatente } from '@/lib/utils/formatters';
import { Car, Search, Plus, QrCode, ArrowRight, Phone, User, Calendar, Wrench } from 'lucide-react';

interface VehiclesListViewProps {
  vehicles: any[];
  shopName: string;
}

export function VehiclesListView({ vehicles, shopName }: VehiclesListViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [selectedQRVehicle, setSelectedQRVehicle] = useState<any | null>(null);

  const normalized = normalizePatente(searchTerm);
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return vehicles;
    return vehicles.filter(
      (v) =>
        normalizePatente(v.patente).includes(normalized) ||
        v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vehicles, searchTerm, normalized]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-amber-500" />
            Parque de Vehículos ({vehicles.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Gestioná los coches registrados, generá etiquetas QR o cargá mantenimientos
          </p>
        </div>

        <button
          onClick={() => setIsQuickCreateOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Vehículo</span>
        </button>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por patente, marca, modelo o cliente..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Grid de Vehículos */}
      {filtered.length === 0 ? (
        <div className="p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
          <Car className="w-8 h-8 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-zinc-300">No encontramos ningún vehículo</h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Verificá el texto ingresado o creá un nuevo vehículo desde el botón superior.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((veh) => {
            const srvCount = veh.services?.length || 0;

            return (
              <div
                key={veh.id}
                className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono font-bold text-sm text-amber-400">
                      {formatPatenteDisplay(veh.patente)}
                    </span>
                    <button
                      onClick={() => setSelectedQRVehicle(veh)}
                      title="Generar o Imprimir QR"
                      className="p-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-black text-zinc-100 mt-2">
                    {veh.marca} {veh.modelo}
                  </h3>
                  {veh.anio && (
                    <span className="text-[11px] text-zinc-500 font-mono">Año {veh.anio}</span>
                  )}

                  {/* Datos del Cliente */}
                  {(veh.cliente_nombre || veh.cliente_telefono) && (
                    <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1 text-xs">
                      {veh.cliente_nombre && (
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <User className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{veh.cliente_nombre}</span>
                        </div>
                      )}
                      {veh.cliente_telefono && (
                        <div className="flex items-center gap-1.5 text-zinc-400 font-mono">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{veh.cliente_telefono}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer de Tarjeta */}
                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-500/80" />
                    <strong className="text-zinc-300">{srvCount}</strong> {srvCount === 1 ? 'servicio' : 'servicios'}
                  </span>

                  <Link
                    href={`/admin/vehicles/${veh.id}`}
                    className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold group"
                  >
                    <span>Ficha y QR</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Alta Rápida */}
      <VehicleQuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
      />

      {/* Modal QR */}
      {selectedQRVehicle && (
        <QRPrintModal
          isOpen={true}
          onClose={() => setSelectedQRVehicle(null)}
          token={selectedQRVehicle.public_token}
          patente={selectedQRVehicle.patente}
          marca={selectedQRVehicle.marca}
          modelo={selectedQRVehicle.modelo}
          shopName={shopName}
        />
      )}
    </div>
  );
}
