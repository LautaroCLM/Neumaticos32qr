import { ServiceType, SERVICE_TYPE_LABELS } from '@/lib/types/database';
import { Disc3, Wrench, Fuel, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface ServiceBadgeProps {
  tipo: ServiceType;
  className?: string;
}

// El rubro se distingue por el ícono; la etiqueta queda en el gris del sistema.
const ICON_TONE: Record<ServiceType, string> = {
  neumaticos: 'text-[#d31a24]',
  alineacion_balanceo: 'text-cyan-400',
  aceite_filtros: 'text-amber-400',
  frenos: 'text-rose-400',
  suspension: 'text-violet-300',
  mecanica_general: 'text-sky-400',
  otro: 'text-[#9a9da3]',
};

export function ServiceBadge({ tipo, className = '' }: ServiceBadgeProps) {
  const label = SERVICE_TYPE_LABELS[tipo] || 'Servicio';
  const tone = ICON_TONE[tipo] || ICON_TONE.otro;

  const getIcon = () => {
    const iconClass = `w-3.5 h-3.5 ${tone}`;
    switch (tipo) {
      case 'neumaticos':
        return <Disc3 className={iconClass} aria-hidden="true" />;
      case 'alineacion_balanceo':
        return <Activity className={iconClass} aria-hidden="true" />;
      case 'aceite_filtros':
        return <Fuel className={iconClass} aria-hidden="true" />;
      case 'frenos':
        return <ShieldAlert className={iconClass} aria-hidden="true" />;
      case 'suspension':
        return <Sparkles className={iconClass} aria-hidden="true" />;
      default:
        return <Wrench className={iconClass} aria-hidden="true" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-7 px-2 rounded-xs border border-[#3a3b3f] text-[11px] font-bold uppercase tracking-[0.08em] text-[#f2f2ef] ${className}`}
      style={{ fontStretch: '112%' }}
    >
      {getIcon()}
      {label}
    </span>
  );
}
