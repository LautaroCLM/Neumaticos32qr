import { getWhatsAppDigits } from '@/lib/utils/formatters';
import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  whatsappNumber?: string | null;
  patente: string;
  vehiculoInfo: string;
}

export function WhatsAppButton({ whatsappNumber, patente, vehiculoInfo }: WhatsAppButtonProps) {
  const cleanNumber = getWhatsAppDigits(whatsappNumber);
  if (!cleanNumber) return null;

  const message = encodeURIComponent(
    `Hola Neumáticos el 32! Tengo una consulta sobre el vehículo ${vehiculoInfo} (Patente ${patente}).`
  );
  const waUrl = `https://wa.me/${cleanNumber}?text=${message}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 min-h-[48px] px-3 rounded-xs whitespace-nowrap bg-[#1a7a42] hover:bg-[#166a39] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      <MessageCircle className="w-4 h-4" aria-hidden="true" />
      <span>Consultar al taller</span>
    </a>
  );
}
