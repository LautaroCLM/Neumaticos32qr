import { ServiceType, SERVICE_TYPE_LABELS, SERVICE_TYPE_COLORS } from '@/lib/types/database';
import { Disc3, Wrench, Fuel, ShieldAlert, Sparkles, Activity } from 'lucide-react';

interface ServiceBadgeProps {
  tipo: ServiceType;
  className?: string;
}

export function ServiceBadge({ tipo, className = '' }: ServiceBadgeProps) {
  const label = SERVICE_TYPE_LABELS[tipo] || 'Servicio';
  const colors = SERVICE_TYPE_COLORS[tipo] || SERVICE_TYPE_COLORS.otro;

  const getIcon = () => {
    switch (tipo) {
      case 'neumaticos':
        return <Disc3 className="w-3.5 h-3.5" />;
      case 'alineacion_balanceo':
        return <Activity className="w-3.5 h-3.5" />;
      case 'aceite_filtros':
        return <Fuel className="w-3.5 h-3.5" />;
      case 'frenos':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'suspension':
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <Wrench className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.badge} ${className}`}
    >
      {getIcon()}
      {label}
    </span>
  );
}
