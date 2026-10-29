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
      className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] border border-zinc-800 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400 font-bold">¡Enlace copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 text-amber-400" />
          <span>Compartir ticket</span>
        </>
      )}
    </button>
  );
}
