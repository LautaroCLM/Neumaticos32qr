'use client';

import { Plate } from '@/components/public/Plate';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  regenerateVehicleTokenAction,
  revokeVehicleTokenAction,
} from '@/lib/actions/vehicles';
import { anularServiceAction } from '@/lib/actions/services';
import { VehicleEditModal } from '@/components/admin/VehicleEditModal';
import { VehicleOwnerModal } from '@/components/admin/VehicleOwnerModal';
import { ServiceBadge } from '@/components/public/ServiceBadge';
import {
  formatDateBA,
  formatCurrencyARS,
  formatKilometers,
  formatPhoneDisplay,
  formatTicketNumber,
} from '@/lib/utils/formatters';
import {
  Car,
  Link2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Ban,
  Plus,
  Calendar,
  FileEdit,
  User,
  Phone,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ShieldAlert,
  Loader2,
  Pencil,
  MessageCircle,
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface VehicleDetailClientViewProps {
  vehicle: any;
  services: any[];
  customers: Array<{ id: string; nombre: string; telefono: string | null }>;
  staffUser: {
    nombre: string;
    rol: 'admin' | 'operario';
  };
  shopName: string;
  siteUrl: string;
}

export function VehicleDetailClientView({
  vehicle,
  services,
  customers,
  staffUser,
  shopName,
  siteUrl,
}: VehicleDetailClientViewProps) {
  const router = useRouter();

  // Enlace del historial
  const [copied, setCopied] = useState(false);

  // Vehicle data and owner modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  // Token management modals
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Anular service modal
  const [anulandoServiceId, setAnulandoServiceId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  const isTokenRevoked = !!vehicle.token_revoked_at;
  const publicUrl = `${siteUrl}/v/${vehicle.public_token}`;
  const whatsappMessage = encodeURIComponent(
    `Hola${vehicle.cliente_nombre ? ` ${vehicle.cliente_nombre}` : ''}! Este es el historial de tu ${vehicle.marca} ${vehicle.modelo} en ${shopName}: ${publicUrl}`
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateToken = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await regenerateVehicleTokenAction(vehicle.id);
      if (!res.success) {
        setActionError(res.error || 'No se pudo regenerar el token.');
        setActionLoading(false);
        return;
      }
      setShowRegenerateModal(false);
      router.refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Error inesperado al regenerar token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeToken = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await revokeVehicleTokenAction(vehicle.id);
      if (!res.success) {
        setActionError(res.error || 'No se pudo revocar el token.');
        setActionLoading(false);
        return;
      }
      setShowRevokeModal(false);
      router.refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Error inesperado al revocar token.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnularService = async () => {
    if (!anulandoServiceId || !motivoAnulacion.trim()) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await anularServiceAction(anulandoServiceId, motivoAnulacion);
      if (!res.success) {
        setActionError(res.error || 'No se pudo anular el servicio.');
        setActionLoading(false);
        return;
      }
      setAnulandoServiceId(null);
      setMotivoAnulacion('');
      router.refresh();
    } catch (err: any) {
      setActionError(err?.message || 'Error al anular servicio.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Botón Volver */}
      <div>
        <Link
          href="/admin/vehicles"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#f04d55] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Vehículos</span>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-sm bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header del Vehículo */}
      <div className="bg-[#161719] border border-[#2a2b2e] rounded-sm p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Plate patente={vehicle.patente} size="md" />

              {isTokenRevoked ? (
                <span className="px-2.5 py-1 rounded-sm bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  Acceso Revocado
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-sm bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5" />
                  Historial Público Activo
                </span>
              )}

              {vehicle.ocultar_precios && (
                <span className="px-2.5 py-1 rounded-sm bg-zinc-800 text-zinc-400 text-xs font-semibold">
                  Precios Ocultos al Cliente
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              {vehicle.marca} {vehicle.modelo} {vehicle.anio ? `(${vehicle.anio})` : ''}
            </h1>

            {/* Datos del Propietario */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <User className="w-3.5 h-3.5 text-zinc-500" />
                {vehicle.cliente_nombre || 'Sin propietario asignado'}
              </span>
              {vehicle.cliente_telefono && (
                <a
                  href={`https://wa.me/${vehicle.cliente_telefono}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-emerald-400 hover:underline font-mono"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {formatPhoneDisplay(vehicle.cliente_telefono)}
                </a>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer min-h-[40px]"
              >
                <Pencil className="w-3.5 h-3.5 text-[#f04d55]" />
                <span>Editar Vehículo</span>
              </button>
              <button
                onClick={() => setIsOwnerModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors cursor-pointer min-h-[40px]"
              >
                <UserCog className="w-3.5 h-3.5 text-[#f04d55]" />
                <span>{vehicle.cliente_id ? 'Cambiar Propietario' : 'Asignar Propietario'}</span>
              </button>
            </div>
          </div>

          {/* Botón "+ Nuevo Servicio" */}
          <div className="shrink-0">
            <Link
              href={`/admin/services/new?vehicle_id=${vehicle.id}`}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white text-xs font-black uppercase tracking-wider transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Servicio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Enlace público del historial (lo usa la búsqueda por patente y se puede enviar al cliente) */}
      <div className="bg-[#161719] border border-[#2a2b2e] rounded-sm p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#2a2b2e] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[#f04d55]">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-zinc-200">
                Enlace del Historial
              </h2>
              <p className="text-[11px] text-zinc-400">
                Para mandarle al cliente su historial sin que tenga que buscar la patente
              </p>
            </div>
          </div>
        </div>

        {isTokenRevoked ? (
          <div className="p-6 rounded-sm bg-red-500/10 border border-red-500/30 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-red-300">El acceso público al historial fue revocado</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Nadie puede ver el historial de este vehículo, ni con el enlace ni buscando la patente. Podés generar un enlace nuevo cuando lo desees.
            </p>
            <button
              onClick={() => setShowRegenerateModal(true)}
              className="px-4 py-2 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white font-black text-xs uppercase tracking-wider transition-colors cursor-pointer min-h-[44px]"
            >
              Generar Nuevo Enlace
            </button>
          </div>
        ) : (
          <div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Enlace Público Directo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 px-3.5 py-2.5 rounded-sm bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                  <a
                    href={publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                    title="Abrir como cliente"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {vehicle.cliente_telefono && (
                <a
                  href={`https://wa.me/${vehicle.cliente_telefono}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Historial por WhatsApp</span>
                </a>
              )}

              {/* Acciones de Seguridad del Token */}
              <div className="pt-3 border-t border-[#2a2b2e] flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#f04d55]" />
                  <span>Regenerar Enlace</span>
                </button>

                {staffUser.rol === 'admin' && (
                  <button
                    onClick={() => setShowRevokeModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-sm bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 text-xs font-bold transition-colors cursor-pointer min-h-[40px]"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Revocar Acceso</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Mantenimientos del Vehículo */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black uppercase tracking-tight text-zinc-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f04d55]" />
              Historial de Servicios ({services.length})
            </h2>
          </div>

          <Link
            href={`/admin/services/new?vehicle_id=${vehicle.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white text-xs font-bold transition-all min-h-[36px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Servicio</span>
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="p-12 rounded-sm bg-[#161719] border border-[#2a2b2e] text-center space-y-3">
            <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300">Sin servicios registrados</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Este vehículo todavía no tiene ningún mantenimiento cargado en el sistema.
            </p>
            <Link
              href={`/admin/services/new?vehicle_id=${vehicle.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-sm bg-[#d31a24] text-white text-xs font-black uppercase tracking-wider min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Cargar Primer Servicio</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((srv) => {
              const effectivePrice =
                srv.total_manual !== null && srv.total_manual !== undefined
                  ? srv.total_manual
                  : srv.precio;

              return (
                <div
                  key={srv.id}
                  className={cn(
                    'p-5 rounded-sm border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                    srv.anulado
                      ? 'bg-zinc-950/60 border-red-500/20 opacity-70'
                      : 'bg-[#161719] border-[#2a2b2e]'
                  )}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ServiceBadge tipo={srv.tipo} />
                      <span className="text-xs text-zinc-300 font-mono font-bold">
                        {formatTicketNumber(srv.numero)}
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatKilometers(srv.kilometraje)}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {formatDateBA(srv.fecha_hora, { includeTime: true })}
                      </span>
                      {srv.editado && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-red-400 text-[9px] font-bold">
                          Editado
                        </span>
                      )}
                      {srv.anulado && (
                        <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold border border-red-500/30">
                          Anulado
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-300">{srv.descripcion}</p>
                    {srv.notas_internas && (
                      <p className="text-[11px] text-red-400/90 font-mono italic">
                        🔒 Interno: {srv.notas_internas}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#2a2b2e] shrink-0">
                    <span className="text-sm font-mono font-bold text-zinc-100">
                      {formatCurrencyARS(effectivePrice)}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/services/${srv.id}/edit`}
                        className="p-2 rounded-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        title="Editar"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </Link>

                      {staffUser.rol === 'admin' && !srv.anulado && (
                        <button
                          onClick={() => setAnulandoServiceId(srv.id)}
                          className="p-2 rounded-sm bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Anular Servicio"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <VehicleEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        canEditPriceVisibility={staffUser.rol === 'admin'}
        vehicle={vehicle}
      />

      <VehicleOwnerModal
        isOpen={isOwnerModalOpen}
        onClose={() => setIsOwnerModalOpen(false)}
        vehicleId={vehicle.id}
        currentCustomerId={vehicle.cliente_id}
        customers={customers}
      />

      {/* Modal Confirmación Regenerar Token */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 animate-fade-in">
          <div className="w-full max-w-md bg-[#161719] border border-[#2a2b2e] rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#f04d55]">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight text-white">¿Regenerar el Enlace?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              <strong className="text-zinc-100">El enlace anterior dejará de funcionar.</strong> Si se lo habías enviado al cliente,
              mandale el nuevo. La búsqueda por patente sigue funcionando igual.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-sm text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-sm bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar y Regenerar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Revocar Token */}
      {showRevokeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">¿Revocar Acceso al Historial?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              El cliente no podrá ver este historial, ni con el enlace ni buscando la patente, hasta que generes un enlace nuevo.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-sm text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevokeToken}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-sm bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Revocación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anular Servicio */}
      {anulandoServiceId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">Anular Servicio</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Ingresá el motivo por el cual se anula este servicio. La anulación quedará registrada en la auditoría inmutable.
            </p>
            <textarea
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              rows={3}
              placeholder="Motivo de anulación..."
              className="w-full px-3 py-2 rounded-sm bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
            />
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAnulandoServiceId(null)}
                className="px-4 py-2 rounded-sm text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnularService}
                disabled={actionLoading || !motivoAnulacion.trim()}
                className="px-5 py-2 rounded-sm bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
