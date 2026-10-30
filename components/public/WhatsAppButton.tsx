import { MessageCircle } from 'lucide-react';

interface WhatsAppButtonProps {
  whatsappNumber: string;
  patente: string;
  vehiculoInfo: string;
}

export function WhatsAppButton({ whatsappNumber, patente, vehiculoInfo }: WhatsAppButtonProps) {
  // Limpiar número (remover espacios, guiones, signos)
  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, '');
  const message = encodeURIComponent(
    `Hola Neumáticos el 32! Tengo una consulta sobre el vehículo ${vehiculoInfo} (Patente ${patente}).`
  );
  const waUrl = `https://wa.me/${cleanNumber}?text=${message}`;

  return (
    <a
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40 min-h-[48px]"
    >
      <MessageCircle className="w-4 h-4 fill-white" />
      <span>Consultar al taller</span>
    </a>
  );
}
