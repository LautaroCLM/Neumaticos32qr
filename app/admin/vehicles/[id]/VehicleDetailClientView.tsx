'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  regenerateVehicleTokenAction,
  revokeVehicleTokenAction,
} from '@/lib/actions/vehicles';
import { anularServiceAction } from '@/lib/actions/services';
import { QRPrintModal } from '@/components/admin/QRPrintModal';
import { ServiceBadge } from '@/components/public/ServiceBadge';
import {
  formatDateBA,
  formatCurrencyARS,
  formatKilometers,
  formatPatenteDisplay,
} from '@/lib/utils/formatters';
import {
  Car,
  QrCode,
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
  Printer,
  Download,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface VehicleDetailClientViewProps {
  vehicle: any;
  services: any[];
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
  staffUser,
  shopName,
  siteUrl,
}: VehicleDetailClientViewProps) {
  const router = useRouter();

  // QR state
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  useEffect(() => {
    if (!vehicle.public_token || isTokenRevoked) return;

    QRCode.toDataURL(publicUrl, {
      width: 400,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Error generando QR:', err));
  }, [publicUrl, vehicle.public_token, isTokenRevoked]);

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
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a Vehículos</span>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Header del Vehículo */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 font-mono font-bold text-base text-amber-400 tracking-wider">
                {formatPatenteDisplay(vehicle.patente)}
              </span>

              {isTokenRevoked ? (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                  <Ban className="w-3.5 h-3.5" />
                  QR Revocado
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  QR Activo
                </span>
              )}

              {vehicle.ocultar_precios && (
                <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400 text-xs font-semibold">
                  Precios Ocultos al Cliente
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 uppercase tracking-tight">
              {vehicle.marca} {vehicle.modelo} {vehicle.anio ? `(${vehicle.anio})` : ''}
            </h1>

            {/* Datos del Cliente */}
            {(vehicle.cliente_nombre || vehicle.cliente_telefono) && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 pt-1">
                {vehicle.cliente_nombre && (
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <User className="w-3.5 h-3.5 text-zinc-500" />
                    {vehicle.cliente_nombre}
                  </span>
                )}
                {vehicle.cliente_telefono && (
                  <a
                    href={`https://wa.me/${vehicle.cliente_telefono.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-emerald-400 hover:underline font-mono"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {vehicle.cliente_telefono}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Botón "+ Nuevo Servicio" */}
          <div className="shrink-0">
            <Link
              href={`/admin/services/new?vehicle_id=${vehicle.id}`}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nuevo Servicio</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tarjeta de Gestión del Código QR y Acceso Digital */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight text-zinc-200">
                Ticket Digital y Código QR
              </h2>
              <p className="text-[11px] text-zinc-400">
                El cliente accede al ticket escaneando este QR (sin registrarse)
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            disabled={isTokenRevoked}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold border border-zinc-700 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>Imprimir Sticker</span>
          </button>
        </div>

        {isTokenRevoked ? (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-red-400 mx-auto" />
            <h3 className="text-sm font-bold text-red-300">El acceso público por QR fue revocado</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Nadie puede ver el ticket de este vehículo en este momento. Podés generar un nuevo token y QR cuando lo desees.
            </p>
            <button
              onClick={() => setShowRegenerateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Generar Nuevo Código QR
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Visualización del QR */}
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white max-w-[220px] mx-auto shadow-md">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Código QR" className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 bg-zinc-100 animate-pulse rounded-lg" />
              )}
              <span className="text-[11px] font-mono font-bold text-zinc-900 mt-2">
                {formatPatenteDisplay(vehicle.patente)}
              </span>
            </div>

            {/* Opciones y Enlace Directo */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Enlace Público Directo
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publicUrl}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
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
                    className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                    title="Abrir como cliente"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Acciones de Seguridad del Token */}
              <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowRegenerateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400 border border-zinc-700 hover:border-amber-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Regenerar QR</span>
                </button>

                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 hover:border-red-500/40 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Revocar Acceso</span>
                </button>
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
              <Clock className="w-4 h-4 text-amber-500" />
              Historial de Servicios ({services.length})
            </h2>
          </div>

          <Link
            href={`/admin/services/new?vehicle_id=${vehicle.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cargar Servicio</span>
          </Link>
        </div>

        {services.length === 0 ? (
          <div className="p-12 rounded-3xl bg-zinc-900/60 border border-zinc-800 text-center space-y-3">
            <Calendar className="w-8 h-8 text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-300">Sin servicios registrados</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Este vehículo todavía no tiene ningún mantenimiento cargado en el sistema.
            </p>
            <Link
              href={`/admin/services/new?vehicle_id=${vehicle.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 text-zinc-950 text-xs font-black uppercase tracking-wider"
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
                    'p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                    srv.anulado
                      ? 'bg-zinc-950/60 border-red-500/20 opacity-70'
                      : 'bg-zinc-900 border-zinc-800'
                  )}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <ServiceBadge tipo={srv.tipo} />
                      <span className="text-xs text-zinc-400 font-mono">
                        {formatKilometers(srv.kilometraje)}
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        {formatDateBA(srv.fecha_hora, { includeTime: true })}
                      </span>
                      {srv.editado && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 text-[9px] font-bold">
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
                      <p className="text-[11px] text-amber-400/90 font-mono italic">
                        🔒 Interno: {srv.notas_internas}
                      </p>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800 shrink-0">
                    <span className="text-sm font-mono font-bold text-zinc-100">
                      {formatCurrencyARS(effectivePrice)}
                    </span>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/services/${srv.id}/edit`}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        title="Editar"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                      </Link>

                      {staffUser.rol === 'admin' && !srv.anulado && (
                        <button
                          onClick={() => setAnulandoServiceId(srv.id)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
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

      {/* Modal QR Completo e Imprimir */}
      <QRPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        token={vehicle.public_token}
        patente={vehicle.patente}
        marca={vehicle.marca}
        modelo={vehicle.modelo}
        shopName={shopName}
        siteUrl={siteUrl}
      />

      {/* Modal Confirmación Regenerar Token */}
      {showRegenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">¿Regenerar Código QR?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              Al regenerar el token, <strong className="text-zinc-100">todos los stickers o códigos QR impresos anteriormente dejarán de funcionar</strong>.
              Deberás imprimir y entregarle el nuevo código al cliente.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenerateModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegenerateToken}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">¿Revocar Acceso al QR?</h3>
            </div>
            <p className="text-xs text-zinc-300">
              El cliente no podrá acceder más a este ticket público hasta que decidas regenerar un nuevo código.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevokeToken}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
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
              className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
            />
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
                onClick={handleAnularService}
                disabled={actionLoading || !motivoAnulacion.trim()}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer"
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
