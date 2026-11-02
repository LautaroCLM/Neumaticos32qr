'use client';

import { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  patente: string;
}

export function ShareButton({ title, patente }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `Historial de Servicio - ${patente} | Neumáticos el 32`,
      text: `Consultá el ticket digital y el historial de mantenimiento del vehículo ${patente} en Neumáticos el 32.`,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback a copiar enlace
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignorar si clipboard falla
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex-1 min-h-[48px] px-3 rounded-xs whitespace-nowrap border border-[#3a3b3f] hover:border-[#9a9da3] text-[#f2f2ef] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          <span className="text-emerald-400" role="status">¡Enlace copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4" aria-hidden="true" />
          <span>Compartir ticket</span>
        </>
      )}
    </button>
  );
}
