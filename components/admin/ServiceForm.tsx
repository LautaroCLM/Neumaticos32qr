'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createServiceAction, updateServiceAction, anularServiceAction } from '@/lib/actions/services';
import { TicketCard } from '@/components/public/TicketCard';
import { formatCurrencyARS, formatPatenteDisplay } from '@/lib/utils/formatters';
import { ServiceRecord, ShopTicketConfig } from '@/lib/types/database';
import {
  Wrench,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Save,
  AlertTriangle,
  Lock,
  Globe,
  Sparkles,
  HelpCircle,
  FileText,
  Ban,
  Check,
  ChevronDown,
  Car,
  Calendar,
  Layers,
  Calculator,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ServiceTemplate {
  id: string;
  nombre: string;
  tipo: string;
  descripcion_base?: string | null;
  items_base?: Array<{ concepto: string; cantidad: number; precio_unitario: number }> | null;
  campos_extra_base?: Array<{ titulo: string; valor: string }> | null;
  visibilidad_base?: Record<string, boolean> | null;
}

interface ServiceFormProps {
  vehicle: {
    id: string;
    patente: string;
    marca: string;
    modelo: string;
    anio?: number | null;
    shop_id: string;
  };
  initialService?: ServiceRecord;
  templates?: ServiceTemplate[];
  shopTicketConfig?: ShopTicketConfig;
  currentUserRole?: 'admin' | 'operario';
  isEditing?: boolean;
}

export function ServiceForm({
  vehicle,
  initialService,
  templates = [],
  shopTicketConfig,
  currentUserRole = 'operario',
  isEditing = false,
}: ServiceFormProps) {
  const router = useRouter();

  // Form Fields
  const [tipo, setTipo] = useState(initialService?.tipo || 'neumaticos');
  const [descripcion, setDescripcion] = useState(initialService?.descripcion || '');
  const [kilometraje, setKilometraje] = useState<string>(
    initialService?.kilometraje !== undefined && initialService?.kilometraje !== null
      ? initialService.kilometraje.toString()
      : '0'
  );
  const [fechaHora, setFechaHora] = useState<string>(() => {
    if (initialService?.fecha_hora) {
      return new Date(initialService.fecha_hora).toISOString().slice(0, 16);
    }
    return new Date().toISOString().slice(0, 16);
  });
  const [sucursal, setSucursal] = useState(initialService?.sucursal || 'Casa Central');
  const [proximoKm, setProximoKm] = useState<string>(
    initialService?.proximo_servicio_km?.toString() || ''
  );
  const [proximoFecha, setProximoFecha] = useState<string>(
    initialService?.proximo_servicio_fecha || ''
  );

  // Dynamic Items
  const [items, setItems] = useState<Array<{ concepto: string; cantidad: number; precio_unitario: number }>>(() => {
    if (initialService?.items && initialService.items.length > 0) {
      return initialService.items.map((it) => ({
        concepto: it.concepto,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario ?? 0,
      }));
    }
    return [{ concepto: 'Servicio / Mano de obra', cantidad: 1, precio_unitario: 0 }];
  });

  // Total Manual
  const [useTotalManual, setUseTotalManual] = useState<boolean>(
    initialService?.total_manual !== null && initialService?.total_manual !== undefined
  );
  const [totalManual, setTotalManual] = useState<string>(
    initialService?.total_manual !== null && initialService?.total_manual !== undefined
      ? initialService.total_manual.toString()
      : ''
  );

  // Custom Extra Fields
  const [camposExtra, setCamposExtra] = useState<Array<{ titulo: string; valor: string }>>(
    initialService?.campos_extra || []
  );

  // Notes
  const [notasInternas, setNotasInternas] = useState(initialService?.notas_internas || '');
  const [notasCliente, setNotasCliente] = useState(initialService?.notas_cliente || '');

  // Visibility Toggles
  const [visibilidad, setVisibilidad] = useState({
    mostrar_km: initialService?.visibilidad?.mostrar_km ?? true,
    mostrar_productos: initialService?.visibilidad?.mostrar_productos ?? true,
    mostrar_precio: initialService?.visibilidad?.mostrar_precio ?? true,
    mostrar_proximo_servicio: initialService?.visibilidad?.mostrar_proximo_servicio ?? true,
    mostrar_sucursal: initialService?.visibilidad?.mostrar_sucursal ?? true,
    mostrar_notas: initialService?.visibilidad?.mostrar_notas ?? false,
  });

  // Edit / Anular reason
  const [motivoEdicion, setMotivoEdicion] = useState('');
  const [showAnularModal, setShowAnularModal] = useState(false);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Live Math
  const itemsSubtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0), 0);
  }, [items]);

  const effectiveTotal = useMemo(() => {
    if (useTotalManual && totalManual !== '') {
      return Number(totalManual) || 0;
    }
    return itemsSubtotal;
  }, [useTotalManual, totalManual, itemsSubtotal]);

  // Construct Live Preview Record
  const previewService: ServiceRecord = useMemo(() => {
    return {
      id: initialService?.id || 'preview-mock-id',
      vehicle_id: vehicle.id,
      shop_id: vehicle.shop_id,
      fecha_hora: new Date(fechaHora).toISOString(),
      kilometraje: visibilidad.mostrar_km ? Number(kilometraje) || 0 : null,
      tipo,
      descripcion: descripcion || 'Descripción del trabajo realizado',
      productos: null,
      precio: visibilidad.mostrar_precio ? effectiveTotal : null,
      items: visibilidad.mostrar_precio ? items : [],
      total_manual: visibilidad.mostrar_precio && useTotalManual ? Number(totalManual) || 0 : null,
      proximo_servicio_km: visibilidad.mostrar_proximo_servicio && proximoKm ? Number(proximoKm) : null,
      proximo_servicio_fecha: visibilidad.mostrar_proximo_servicio && proximoFecha ? proximoFecha : null,
      sucursal: visibilidad.mostrar_sucursal ? sucursal : null,
      notas_cliente: visibilidad.mostrar_notas && notasCliente ? notasCliente : null,
      notas_internas: null, // Strictly excluded
      campos_extra: camposExtra,
      visibilidad,
      anulado: false,
      editado: isEditing,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [
    initialService,
    vehicle,
    fechaHora,
    kilometraje,
    tipo,
    descripcion,
    effectiveTotal,
    items,
    useTotalManual,
    totalManual,
    proximoKm,
    proximoFecha,
    sucursal,
    notasCliente,
    camposExtra,
    visibilidad,
    isEditing,
  ]);

  // Template Loader
  const handleApplyTemplate = (tmplId: string) => {
    const tmpl = templates.find((t) => t.id === tmplId);
    if (!tmpl) return;

    setTipo(tmpl.tipo as any);
    if (tmpl.descripcion_base) setDescripcion(tmpl.descripcion_base);
    if (tmpl.items_base && tmpl.items_base.length > 0) {
      setItems(
        tmpl.items_base.map((it) => ({
          concepto: it.concepto,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario ?? 0,
        }))
      );
    }
    if (tmpl.campos_extra_base && tmpl.campos_extra_base.length > 0) {
      setCamposExtra(tmpl.campos_extra_base);
    }
    if (tmpl.visibilidad_base) {
      setVisibilidad((prev) => ({
        ...prev,
        ...tmpl.visibilidad_base,
      }));
    }
  };

  // Items Management
  const handleAddItem = () => {
    if (items.length >= 30) return;
    setItems([...items, { concepto: '', cantidad: 1, precio_unitario: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  // Campos Extra Management
  const handleAddExtraField = () => {
    if (camposExtra.length >= 10) return;
    setCamposExtra([...camposExtra, { titulo: '', valor: '' }]);
  };

  const handleRemoveExtraField = (index: number) => {
    setCamposExtra(camposExtra.filter((_, i) => i !== index));
  };

  const handleExtraFieldChange = (index: number, field: 'titulo' | 'valor', value: string) => {
    const updated = [...camposExtra];
    updated[index][field] = value;
    setCamposExtra(updated);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!descripcion.trim()) {
      setError('Por favor completá la descripción del trabajo realizado.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        vehicle_id: vehicle.id,
        fecha_hora: new Date(fechaHora).toISOString(),
        kilometraje: parseInt(kilometraje, 10) || 0,
        tipo,
        descripcion: descripcion.trim(),
        items: items.filter((it) => it.concepto.trim().length > 0),
        total_manual: useTotalManual && totalManual !== '' ? parseFloat(totalManual) : null,
        proximo_servicio_km: proximoKm ? parseInt(proximoKm, 10) : null,
        proximo_servicio_fecha: proximoFecha || null,
        sucursal: sucursal.trim() || 'Casa Central',
        notas_internas: notasInternas.trim() || null,
        notas_cliente: notasCliente.trim() || null,
        campos_extra: camposExtra.filter((cf) => cf.titulo.trim().length > 0 && cf.valor.trim().length > 0),
        visibilidad,
      };

      if (isEditing && initialService) {
        const res = await updateServiceAction(initialService.id, payload, motivoEdicion);
        if (!res.success) {
          setError(res.error || 'Error al actualizar el servicio.');
          setLoading(false);
          return;
        }
        router.push(`/admin/vehicles/${vehicle.id}`);
      } else {
        const res = await createServiceAction(payload as any);
        if (!res.success) {
          setError(res.error || 'Error al guardar el servicio.');
          setLoading(false);
          return;
        }
        router.push(`/admin/vehicles/${vehicle.id}`);
      }
    } catch (err: any) {
      setError(err?.message || 'Error inesperado al guardar el servicio.');
    } finally {
      setLoading(false);
    }
  };

  // Anulación Handler (Admin only)
  const handleAnular = async () => {
    if (!initialService || !motivoAnulacion.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await anularServiceAction(initialService.id, motivoAnulacion);
      if (!res.success) {
        setError(res.error || 'No se pudo anular el servicio.');
        setLoading(false);
        return;
      }
      setShowAnularModal(false);
      router.push(`/admin/vehicles/${vehicle.id}`);
    } catch (err: any) {
      setError(err?.message || 'Error al anular servicio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative pb-28">
      {/* Top Warning Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-[#880e14]/20 border border-[#d31a24]/30 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#d31a24] shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-[#d31a24] uppercase tracking-wider">Aviso de Privacidad del Ticket Digital</p>
          <p className="text-zinc-300 mt-0.5">
            Los datos marcados con toggle de visibilidad activo serán visibles para el cliente al escanear el QR.
            Las <strong className="text-zinc-100">Notas Internas</strong> nunca se comparten públicamente.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Form on left/center, Live Preview on right on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Vehículo Asociado Card */}
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-[#d31a24]">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Vehículo</span>
                <h3 className="text-sm font-black text-zinc-100">
                  {vehicle.marca} {vehicle.modelo} {vehicle.anio ? `(${vehicle.anio})` : ''}
                </h3>
              </div>
            </div>
            <div className="px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 font-mono font-bold text-[#d31a24] text-xs">
              {formatPatenteDisplay(vehicle.patente)}
            </div>
          </div>

          {/* Plantillas rápidas (si hay disponibles) */}
          {templates.length > 0 && !isEditing && (
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#d31a24]" />
                Cargar desde Plantilla de Servicio
              </label>
              <select
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue=""
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-medium focus:outline-none focus:border-[#d31a24] cursor-pointer"
              >
                <option value="" disabled>
                  Seleccioná una plantilla para prellenar conceptos y visibilidad...
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Datos Principales del Trabajo */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Wrench className="w-4 h-4 text-[#d31a24]" />
              Detalles del Servicio
            </h3>

            {/* Tipo de Trabajo y Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Tipo de Servicio *</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-bold focus:outline-none focus:border-[#d31a24]"
                >
                  <option value="neumaticos">Neumáticos</option>
                  <option value="alineacion_balanceo">Alineación y Balanceo</option>
                  <option value="aceite_filtros">Aceite y Filtros</option>
                  <option value="frenos">Frenos</option>
                  <option value="suspension">Suspensión</option>
                  <option value="mecanica_general">Mecánica General</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-medium focus:outline-none focus:border-[#d31a24]"
                />
              </div>
            </div>

            {/* Kilometraje y Sucursal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Kilometraje actual *</label>
                <input
                  type="number"
                  value={kilometraje}
                  onChange={(e) => setKilometraje(e.target.value)}
                  min="0"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono font-bold focus:outline-none focus:border-[#d31a24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Sucursal</label>
                <input
                  type="text"
                  value={sucursal}
                  onChange={(e) => setSucursal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
                />
              </div>
            </div>

            {/* Descripción del Trabajo */}
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Descripción del trabajo realizado *
              </label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                placeholder="Detallá el trabajo realizado (ej. Cambio de dos cubiertas delanteras 205/55R16, válvulas nuevas y balanceo computarizado)..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
              />
            </div>
          </div>

          {/* Ítems Dinámicos y Cálculo de Precios */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#d31a24]" />
                Ítems y Precios
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#880e14]/20 hover:bg-[#880e14]/30 text-[#d31a24] border border-[#d31a24]/30 text-[11px] font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Ítem</span>
              </button>
            </div>

            {/* Lista de ítems */}
            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-12 sm:col-span-6">
                    <input
                      type="text"
                      value={item.concepto}
                      onChange={(e) => handleItemChange(idx, 'concepto', e.target.value)}
                      placeholder="Concepto / Producto / Mano de obra"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => handleItemChange(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                      min="1"
                      step="1"
                      title="Cantidad"
                      placeholder="Cant."
                      className="w-full px-2 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs text-center font-mono focus:outline-none focus:border-[#d31a24]"
                    />
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <input
                      type="number"
                      value={item.precio_unitario || ''}
                      onChange={(e) => handleItemChange(idx, 'precio_unitario', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="100"
                      title="Precio Unitario"
                      placeholder="Precio Unit."
                      className="w-full px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs text-right font-mono focus:outline-none focus:border-[#d31a24]"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Subtotal automático */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
              <span className="text-xs text-zinc-400 font-medium">Suma automática de ítems:</span>
              <span className="text-sm font-mono font-bold text-zinc-100">
                {formatCurrencyARS(itemsSubtotal)}
              </span>
            </div>

            {/* Total Manual Toggle */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useTotalManual}
                  onChange={(e) => setUseTotalManual(e.target.checked)}
                  className="w-4 h-4 rounded text-[#d31a24] bg-zinc-900 border-zinc-700"
                />
                <span className="text-xs font-bold text-zinc-300">
                  Sobrescribir con un Total Manual (reemplaza la suma de ítems)
                </span>
              </label>

              {useTotalManual && (
                <div className="pl-6">
                  <input
                    type="number"
                    value={totalManual}
                    onChange={(e) => setTotalManual(e.target.value)}
                    placeholder="Monto total convenido ($)"
                    min="0"
                    step="100"
                    className="w-full sm:w-64 px-3 py-2 rounded-xl bg-zinc-950 border border-[#d31a24]/50 text-[#d31a24] font-mono font-bold text-sm focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Este valor final será el que figure como total del ticket.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Próximo Servicio Recomendado */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Calendar className="w-4 h-4 text-[#d31a24]" />
              Próximo Service Recomendado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">A los kilómetros</label>
                <input
                  type="number"
                  value={proximoKm}
                  onChange={(e) => setProximoKm(e.target.value)}
                  placeholder="Ej. 60000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono focus:outline-none focus:border-[#d31a24]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">O en la fecha estimada</label>
                <input
                  type="date"
                  value={proximoFecha}
                  onChange={(e) => setProximoFecha(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
                />
              </div>
            </div>
          </div>

          {/* Campos Extra Personalizados */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#d31a24]" />
                Campos Personalizados ({camposExtra.length}/10)
              </h3>
              <button
                type="button"
                onClick={handleAddExtraField}
                disabled={camposExtra.length >= 10}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-30"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Campo</span>
              </button>
            </div>

            {camposExtra.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Podés agregar campos libres como "Marca de Cubiertas", "DOT", "Torque de Bulones", etc.
              </p>
            ) : (
              <div className="space-y-2">
                {camposExtra.map((field, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={field.titulo}
                      onChange={(e) => handleExtraFieldChange(idx, 'titulo', e.target.value)}
                      placeholder="Título (ej. Medida)"
                      className="w-1/3 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                    />
                    <input
                      type="text"
                      value={field.valor}
                      onChange={(e) => handleExtraFieldChange(idx, 'valor', e.target.value)}
                      placeholder="Valor (ej. 205/55 R16 91V)"
                      className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveExtraField(idx)}
                      className="p-2 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notas: Internas vs Cliente */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <FileText className="w-4 h-4 text-[#d31a24]" />
              Observaciones y Notas
            </h3>

            {/* Notas del Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  Nota para el Cliente (Visible en el Ticket si está activada)
                </label>
              </div>
              <textarea
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                rows={2}
                placeholder="Recomendaciones o aclaraciones para el cliente (ej. Revisar presión a los 1000 km)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
              />
            </div>

            {/* Notas Internas (Confidenciales) */}
            <div className="pt-2 border-t border-zinc-800/80">
              <label className="text-xs font-bold text-[#d31a24] flex items-center gap-1.5 mb-1">
                <Lock className="w-3.5 h-3.5 text-[#d31a24]" />
                Notas Internas (CONFIDENCIAL TALLER - Nunca viaja al cliente)
              </label>
              <textarea
                value={notasInternas}
                onChange={(e) => setNotasInternas(e.target.value)}
                rows={2}
                placeholder="Anotaciones de uso exclusivo del personal (ej. Cliente pidió descuento, llanta trasera con pequeño golpe)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-[#d31a24]/30 text-zinc-200 text-xs focus:outline-none focus:border-[#d31a24] font-mono"
              />
            </div>
          </div>

          {/* Toggles de Visibilidad en el QR */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Eye className="w-4 h-4 text-[#d31a24]" />
              Visibilidad de Campos en el Ticket Público (QR)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'mostrar_km', label: 'Mostrar Kilometraje' },
                { key: 'mostrar_productos', label: 'Mostrar Desglose de Productos' },
                { key: 'mostrar_precio', label: 'Mostrar Importe y Precios' },
                { key: 'mostrar_proximo_servicio', label: 'Mostrar Próximo Control' },
                { key: 'mostrar_sucursal', label: 'Mostrar Sucursal' },
                { key: 'mostrar_notas', label: 'Mostrar Notas al Cliente' },
              ].map(({ key, label }) => {
                const isChecked = (visibilidad as any)[key];
                return (
                  <label
                    key={key}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-colors',
                      isChecked
                        ? 'bg-zinc-950/80 border-[#d31a24]/40 text-zinc-200'
                        : 'bg-zinc-950/40 border-zinc-800/60 text-zinc-500'
                    )}
                  >
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        setVisibilidad({
                          ...visibilidad,
                          [key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded text-[#d31a24] bg-zinc-900 border-zinc-700 focus:ring-[#d31a24]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Motivo de Edición (Si estamos editando) */}
          {isEditing && (
            <div className="p-5 rounded-2xl bg-zinc-900 border border-[#d31a24]/30 space-y-2">
              <label className="block text-xs font-bold text-[#d31a24] uppercase tracking-wider">
                Motivo de la Edición (Opcional, queda en auditoría inmutable)
              </label>
              <input
                type="text"
                value={motivoEdicion}
                onChange={(e) => setMotivoEdicion(e.target.value)}
                placeholder="Ej. Corrección de kilometraje cargado por error..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-[#d31a24]"
              />
            </div>
          )}

          {/* Botones de acción principales para Desktop */}
          <div className="hidden lg:flex items-center justify-between pt-4 border-t border-zinc-800">
            {isEditing && currentUserRole === 'admin' ? (
              <button
                type="button"
                onClick={() => setShowAnularModal(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>Anular Servicio</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#d31a24] hover:bg-[#e52530] text-white shadow-lg shadow-[#d31a24]/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Servicio'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Live Preview Column (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#d31a24] flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              Vista Previa en Vivo del Ticket
            </h4>
            <span className="text-[10px] font-mono text-zinc-500">Actualizado en tiempo real</span>
          </div>

          <TicketCard
            service={previewService}
            ticketConfig={shopTicketConfig}
            hidePrices={!visibilidad.mostrar_precio}
            isPreview={true}
          />

          <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
            <p className="font-bold text-zinc-300">Resumen para el taller:</p>
            <div className="flex justify-between">
              <span>Total a cobrar:</span>
              <span className="font-mono font-bold text-[#d31a24]">{formatCurrencyARS(effectiveTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Visible al cliente:</span>
              <span>{visibilidad.mostrar_precio ? 'Sí (con importe)' : 'No (importe oculto)'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 p-3 flex items-center justify-between gap-2 shadow-2xl">
        <div>
          <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total Calculado</span>
          <span className="text-sm font-mono font-black text-[#d31a24]">
            {formatCurrencyARS(effectiveTotal)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && currentUserRole === 'admin' && (
            <button
              type="button"
              onClick={() => setShowAnularModal(true)}
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 cursor-pointer"
              title="Anular Servicio"
            >
              <Ban className="w-4 h-4" />
              <span>Anular</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 cursor-pointer"
          >
            <Eye className="w-4 h-4 text-[#d31a24]" />
            <span>Previsualizar</span>
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#d31a24] text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-[#d31a24]/20 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Servicio'}</span>
          </button>
        </div>
      </div>

      {/* Modal Vista Previa Móvil */}
      {showPreviewModal && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md my-auto space-y-4">
            <div className="flex items-center justify-between text-zinc-100">
              <span className="text-xs font-bold uppercase tracking-wider">Vista Previa del Ticket</span>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-3 py-1 rounded-lg bg-zinc-800 text-xs font-bold text-zinc-200"
              >
                Cerrar
              </button>
            </div>
            <TicketCard
              service={previewService}
              ticketConfig={shopTicketConfig}
              hidePrices={!visibilidad.mostrar_precio}
              isPreview={true}
            />
          </div>
        </div>
      )}

      {/* Modal de Anulación (Admin Only) */}
      {showAnularModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" />
              <h3 className="text-base font-black uppercase tracking-tight">Anular Servicio</h3>
            </div>
            <p className="text-xs text-zinc-300">
              El servicio no se eliminará físicamente para preservar la integridad contable, pero figurará como
              anulado y dejará de mostrarse en el historial público del cliente.
            </p>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">
                Motivo de anulación (Obligatorio) *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Ingresá la razón por la que se anula este servicio..."
                required
                className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAnularModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnular}
                disabled={loading || !motivoAnulacion.trim()}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'Anulando...' : 'Confirmar Anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
