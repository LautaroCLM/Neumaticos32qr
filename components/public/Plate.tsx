import { formatPatenteDisplay } from '@/lib/utils/formatters';

interface PlateProps {
  patente: string;
  size?: 'sm' | 'md';
  className?: string;
}

// Patente estilo Mercosur compacta: banda país a la izquierda, fondo claro.
export function Plate({ patente, size = 'sm', className = '' }: PlateProps) {
  const isMd = size === 'md';
  return (
    <span
      className={`inline-flex shrink-0 items-stretch overflow-hidden rounded-xs bg-[#f2f2ef] border border-[#f2f2ef] ${
        isMd ? 'h-9' : 'h-7'
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`bg-[#0d0d0e] text-[#f2f2ef] flex items-end justify-center font-extrabold tracking-[0.06em] ${
          isMd ? 'w-5 pb-1 text-[7px]' : 'w-4 pb-0.5 text-[6px]'
        }`}
      >
        RA
      </span>
      <span
        className={`flex items-center figure font-extrabold whitespace-nowrap text-[#0d0d0e] tracking-[0.06em] ${
          isMd ? 'px-2.5 text-[17px]' : 'px-2 text-[13px]'
        }`}
        style={{ fontStretch: '125%' }}
      >
        <span className="sr-only">Patente </span>
        {formatPatenteDisplay(patente)}
      </span>
    </span>
  );
}
