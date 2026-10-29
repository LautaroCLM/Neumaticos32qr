'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VehicleQuickCreateModal } from '@/components/admin/VehicleQuickCreateModal';
import { QRPrintModal } from '@/components/admin/QRPrintModal';
import { ServiceBadge } from '@/components/public/ServiceBadge';
import { formatDateBA, formatCurrencyARS, formatPatenteDisplay, normalizePatente } from '@/lib/utils/formatters';
import { anularServiceAction } from '@/lib/actions/services';
import {
  Search,
  Plus,
  Car,
  Calendar,
  Filter,
  FileEdit,
  Ban,
  QrCode,
  ArrowRight,
  ExternalLink,
  Wrench,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface DashboardClientViewProps {
  initialServices: any[];
  vehicles: any[];
  staffUser: {
    nombre: string;
    rol: 'admin' | 'operario';
  };
  shopName: string;
}

export function DashboardClientView({
  initialServices,
  vehicles,
  staffUser,
  shopName,
}: DashboardClientViewProps) {
  const router = useRouter();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'hoy' | '7d' | '30d' | 'todos'>('todos');
  const [typeFilter, setTypeFilter] = useState<string>('todos');

  // Modals
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [selectedQRVehicle, setSelectedQRVehicle] = useState<any | null>(null);

  // Anulación state
  const [anulandoServiceId, setAnulandoServiceId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulandoLoading, setAnulandoLoading] = useState(false);
  const [anularError, setAnularError] = useState<string | null>(null);

  // Fast plate search resolution
  const normalizedSearch = normalizePatente(searchTerm);
  const matchedVehicles = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return vehicles.filter(
      (v) =>
        normalizePatente(v.patente).includes(normalizedSearch) ||
        v.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.cliente_nombre && v.cliente_nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [vehicles, searchTerm, normalizedSearch]);

  // Services filtering
  const filteredServices = useMemo(() => {
    return initialServices.filter((srv) => {
      // Filtro por tipo
      if (typeFilter !== 'todos' && srv.tipo !== typeFilter) {
        return false;
      }

      // Filtro por fecha
      if (dateFilter !== 'todos') {
        const srvDate = new Date(srv.fecha_hora);
        const now = new Date();
        const diffMs = now.getTime() - srvDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'hoy' && diffDays > 1) return false;
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }

      // Filtro por texto de búsqueda
      if (searchTerm.trim()) {
        const pat = srv.vehicles ? normalizePatente(srv.vehicles.patente) : '';
        const desc = srv.descripcion ? srv.descripcion.toLowerCase() : '';
        const client = srv.vehicles?.cliente_nombre ? srv.vehicles.cliente_nombre.toLowerCase() : '';
        const marca = srv.vehicles?.marca ? srv.vehicles.marca.toLowerCase() : '';
        const term = searchTerm.toLowerCase();

        const match =
          pat.includes(normalizedSearch) ||
          desc.includes(term) ||
          client.includes(term) ||
          marca.includes(term);

        if (!match) return false;
      }

      return true;
    });
  }, [initialServices, dateFilter, typeFilter, searchTerm, normalizedSearch]);

  const handleAnularSubmit = async () => {
    if (!anulandoServiceId || !motivoAnulacion.trim()) return;
    setAnulandoLoading(true);
    setAnularError(null);
    try {
      const res = await anularServiceAction(anulandoServiceId, motivoAnulacion);
      if (!res.success) {
        setAnularError(res.error || 'Error al anular servicio');
        setAnulandoLoading(false);
        return;
      }
      setAnulandoServiceId(null);
      setMotivoAnulacion('');
      router.refresh();
    } catch (err: any) {
      setAnularError(err?.message || 'Error al anular servicio');
    } finally {
      setAnulandoLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Barra superior con Buscador Rápido de Patente y Acciones */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-100 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-500" />
              Gestión de Servicios y Vehículos
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Buscá por patente para ver historial o registrá un vehículo nuevo
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsQuickCreateOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-all cursor-pointer"
            >
              <Car className="w-4 h-4 text-amber-400" />
              <span>+ Alta de Vehículo</span>
            </button>
            <Link
              href="/admin/services/new"
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Servicio</span>
            </Link>
          </div>
        </div>

        {/* Input de Búsqueda Rápida de Patente */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escribí una patente (ej. AA123BB), cliente o marca..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-amber-500 font-medium"
          />
        </div>

        {/* Coincidencias de vehículos rápidos si el usuario está buscando */}
        {searchTerm.trim().length >= 2 && (
          <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-bold uppercase tracking-wider px-2">
              <span>Vehículos Encontrados ({matchedVehicles.length})</span>
              <button
                onClick={() => setIsQuickCreateOpen(true)}
                className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>¿No existe? Crearlo ahora</span>
              </button>
            </div>

            {matchedVehicles.length === 0 ? (
              <div className="p-3 text-center text-xs text-zinc-500">
                No encontramos ningún vehículo con esa búsqueda.{' '}
                <button
                  onClick={() => setIsQuickCreateOpen(true)}
                  className="text-amber-400 font-bold underline cursor-pointer"
                >
                  Hacé clic acá para darlo de alta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {matchedVehicles.slice(0, 6).map((veh) => (
                  <Link
                    key={veh.id}
                    href={`/admin/vehicles/${veh.id}`}
                    className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-amber-500/40 flex items-center justify-between gap-2 transition-all group"
                  >
                    <div>
                      <span className="font-mono font-bold text-amber-400 text-xs block">
                        {formatPatenteDisplay(veh.patente)}
                      </span>
                      <p className="text-xs text-zinc-200 font-semibold truncate">
                        {veh.marca} {veh.modelo}
                      </p>
                      {veh.cliente_nombre && (
                        <p className="text-[10px] text-zinc-400 truncate">{veh.cliente_nombre}</p>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Servicios Recientes y Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black uppercase tracking-tight text-zinc-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Servicios Recientes
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 font-bold text-zinc-400">
              {filteredServices.length}
            </span>
          </div>

          {/* Filtros de Fecha y Tipo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Fecha */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-1 text-[11px] font-bold">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'hoy', label: 'Hoy' },
                { id: '7d', label: '7 días' },
                { id: '30d', label: '30 días' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as any)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg transition-colors cursor-pointer',
                    dateFilter === f.id ? 'bg-amber-500 text-zinc-950 font-black' : 'text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Filtro Tipo */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="neumaticos">Neumáticos</option>
              <option value="alineacion_balanceo">Alineación y Balanceo</option>
              <option value="aceite_filtros">Aceite y Filtros</option>
              <option value="frenos">Frenos</option>
              <option value="suspension">Suspensión</option>
              <option value="mecanica_general">Mecánica General</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>

        {/* Lista de Servicios */}
        {filteredServices.length === 0 ? (
          <div className="p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
            <Wrench className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300">No hay servicios que coincidan</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Probá cambiando los filtros de fecha o tipo, o creá un nuevo servicio para un vehículo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredServices.map((srv) => {
              const effectivePrice =
                srv.total_manual !== null && srv.total_manual !== undefined
                  ? srv.total_manual
                  : srv.precio;

              return (
                <div
                  key={srv.id}
                  className={cn(
                    'p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                    srv.anulado
                      ? 'bg-zinc-950/60 border-red-500/20 opacity-75'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                  )}
                >
                  {/* Info principal: Patente, Vehículo, Tipo, Descripción */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {srv.vehicles ? (
                        <Link
                          href={`/admin/vehicles/${srv.vehicles.id}`}
                          className="px-2.5 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 font-mono font-bold text-xs text-amber-400 hover:border-amber-500 transition-colors"
                        >
                          {formatPatenteDisplay(srv.vehicles.patente)}
                        </Link>
                      ) : (
                        <span className="font-mono text-zinc-500 text-xs">Sin vehículo</span>
                      )}

                      <ServiceBadge tipo={srv.tipo} />

                      {srv.editado && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 text-[9px] font-bold flex items-center gap-1">
                          <FileEdit className="w-2.5 h-2.5" />
                          Editado
                        </span>
                      )}

                      {srv.anulado && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold flex items-center gap-1 border border-red-500/30">
                          <Ban className="w-2.5 h-2.5" />
                          Anulado
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-500 ml-auto sm:ml-0">
                        {formatDateBA(srv.fecha_hora, { includeTime: true })}
                      </span>
                    </div>

                    <div>
                      {srv.vehicles && (
                        <p className="text-xs font-bold text-zinc-200">
                          {srv.vehicles.marca} {srv.vehicles.modelo}{' '}
                          {srv.vehicles.cliente_nombre && (
                            <span className="text-zinc-400 font-normal">
                              • {srv.vehicles.cliente_nombre}
                            </span>
                          )}
                        </p>
                      )}
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                        {srv.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Precio y Acciones */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-zinc-100">
                        {formatCurrencyARS(effectivePrice)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {srv.vehicles?.public_token && (
                        <button
                          onClick={() => setSelectedQRVehicle(srv.vehicles)}
                          title="Ver QR del Vehículo"
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      )}

                      <Link
                        href={`/admin/services/${srv.id}/edit`}
                        title="Editar Servicio"
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </Link>

                      {staffUser.rol === 'admin' && !srv.anulado && (
                        <button
                          onClick={() => setAnulandoServiceId(srv.id)}
                          title="Anular Servicio"
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {srv.vehicles && (
                        <Link
                          href={`/admin/vehicles/${srv.vehicles.id}`}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-200 text-xs font-bold transition-all"
                        >
                          <span>Historial</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Alta Rápida de Vehículo */}
      <VehicleQuickCreateModal
        isOpen={isQuickCreateOpen}
        onClose={() => setIsQuickCreateOpen(false)}
        initialPatente={searchTerm}
      />

      {/* Modal QR & Print */}
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

      {/* Modal de Anulación de Servicio */}
      {anulandoServiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">Anular Servicio</h3>
            </div>
            {anularError && (
              <div className="p-3 rounded-xl bg-red-500/10 text-red-400 text-xs">{anularError}</div>
            )}
            <p className="text-xs text-zinc-300">
              Solo un Administrador puede anular servicios. El registro quedará archivado con auditoría.
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Motivo de anulación (Obligatorio) *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Ingresá el motivo claro de la anulación..."
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnulandoServiceId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnularSubmit}
                disabled={anulandoLoading || !motivoAnulacion.trim()}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {anulandoLoading ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
