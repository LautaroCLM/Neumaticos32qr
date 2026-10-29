export type ServiceType =
  | 'neumaticos'
  | 'alineacion_balanceo'
  | 'aceite_filtros'
  | 'frenos'
  | 'suspension'
  | 'mecanica_general'
  | 'otro';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  neumaticos: 'Neumáticos',
  alineacion_balanceo: 'Alineación y Balanceo',
  aceite_filtros: 'Aceite y Filtros',
  frenos: 'Frenos',
  suspension: 'Suspensión',
  mecanica_general: 'Mecánica General',
  otro: 'Otro Servicio',
};

export const SERVICE_TYPE_COLORS: Record<ServiceType, { badge: string; border: string; bg: string }> = {
  neumaticos: {
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/10',
  },
  alineacion_balanceo: {
    badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    border: 'border-l-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  aceite_filtros: {
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  frenos: {
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    border: 'border-l-rose-500',
    bg: 'bg-rose-500/10',
  },
  suspension: {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    border: 'border-l-purple-500',
    bg: 'bg-purple-500/10',
  },
  mecanica_general: {
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/10',
  },
  otro: {
    badge: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
    border: 'border-l-zinc-500',
    bg: 'bg-zinc-500/10',
  },
};

export interface ServiceItem {
  concepto: string;
  cantidad: number;
  precio_unitario?: number | null; // Puede ser null si precio está oculto
}

export interface ServiceExtraField {
  titulo: string;
  valor: string;
}

export interface ServiceVisibility {
  mostrar_km: boolean;
  mostrar_productos: boolean;
  mostrar_precio: boolean;
  mostrar_proximo_servicio: boolean;
  mostrar_sucursal: boolean;
  mostrar_notas: boolean;
}

export interface ShopTicketConfig {
  titulo_ticket: string;
  texto_pie: string;
  etiqueta_proximo_service: string;
  colores_personalizados?: Record<string, string>;
}

export interface Shop {
  id: string;
  nombre: string;
  slug: string;
  logo_url: string | null;
  color_primario: string;
  color_fondo: string;
  telefono: string | null;
  whatsapp: string;
  direccion: string;
  horarios: string;
  ocultar_precios: boolean;
  ticket_config: ShopTicketConfig;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: string;
  shop_id: string;
  public_token: string;
  token_created_at: string;
  token_revoked_at: string | null;
  patente: string;
  marca: string;
  modelo: string;
  anio: number | null;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  ocultar_precios: boolean | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecord {
  id: string;
  vehicle_id: string;
  shop_id?: string;
  fecha_hora: string;
  kilometraje?: number | null;
  tipo: ServiceType;
  descripcion: string;
  productos?: string | null;
  items?: ServiceItem[] | null;
  total_manual?: number | null;
  precio?: number | null;
  proximo_servicio_km?: number | null;
  proximo_servicio_fecha?: string | null;
  sucursal?: string | null;
  notas_internas?: string | null; // Solo visible en el panel del taller
  notas_cliente?: string | null;  // Visible al cliente si mostrar_notas = true
  campos_extra?: ServiceExtraField[] | null;
  visibilidad?: ServiceVisibility;
  editado: boolean;
  anulado?: boolean;
  anulado_at?: string | null;
  anulado_by?: string | null;
  anulado_motivo?: string | null;
  deleted_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ServiceTemplate {
  id: string;
  shop_id: string;
  nombre: string;
  tipo: ServiceType;
  descripcion_base: string;
  items_base: ServiceItem[];
  campos_extra_base: ServiceExtraField[];
  visibilidad_base: ServiceVisibility;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRevision {
  id: string;
  service_id: string;
  editado_por: string;
  editado_en: string;
  motivo_edicion?: string | null;
  cambios: Record<string, unknown>;
}

export interface StaffUser {
  id: string;
  shop_id: string;
  nombre: string;
  rol: 'admin' | 'operario';
  is_active: boolean;
  created_at: string;
}

export interface PublicPlateSearchResult {
  success: boolean;
  blocked?: boolean;
  not_found?: boolean;
  error?: string;
  data?: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    fecha_ultimo_servicio: string | null;
    proximo_servicio_km: number | null;
    proximo_servicio_fecha: string | null;
    has_qr_access: boolean;
  };
}

export interface PublicVehicleTicketResult {
  success: boolean;
  error?: string;
  hide_prices?: boolean;
  vehicle?: {
    patente: string;
    marca: string;
    modelo: string;
    anio: number | null;
    token: string;
  };
  shop?: {
    nombre: string;
    logo_url: string | null;
    color_primario: string;
    color_fondo: string;
    telefono: string | null;
    whatsapp: string;
    direccion: string;
    horarios: string;
    ticket_config: ShopTicketConfig;
  };
  services?: ServiceRecord[];
}
