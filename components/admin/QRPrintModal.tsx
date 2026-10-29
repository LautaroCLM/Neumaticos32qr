'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Printer, Copy, Check, X, ExternalLink } from 'lucide-react';
import { formatPatenteDisplay } from '@/lib/utils/formatters';

interface QRPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  patente: string;
  marca: string;
  modelo: string;
  shopName?: string;
  siteUrl?: string;
}

export function QRPrintModal({
  isOpen,
  onClose,
  token,
  patente,
  marca,
  modelo,
  shopName = 'Neumáticos el 32',
  siteUrl,
}: QRPrintModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const baseUrl = siteUrl || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const fullUrl = `${baseUrl}/v/${token}`;

  useEffect(() => {
    if (!isOpen || !token) return;

    QRCode.toDataURL(fullUrl, {
      width: 600,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('Error generando QR:', err));
  }, [isOpen, fullUrl, token]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPng = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `QR-${patente}-${token.slice(0, 8)}.png`;
    link.click();
  };

  const handlePrintSticker = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=600');
    if (!printWindow) {
      alert('Por favor habilitá las ventanas emergentes para imprimir el sticker.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Sticker QR - ${patente}</title>
          <style>
            @page {
              size: 70mm 55mm;
              margin: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 6mm;
              box-sizing: border-box;
              text-align: center;
              color: #000;
              background: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
            }
            .header {
              font-size: 13px;
              font-weight: 900;
              letter-spacing: -0.3px;
              text-transform: uppercase;
              margin-bottom: 2mm;
            }
            .qr-img {
              width: 32mm;
              height: 32mm;
              display: block;
              margin: 0 auto;
            }
            .patente-badge {
              display: inline-block;
              font-size: 12px;
              font-weight: 800;
              font-family: monospace;
              border: 1.5px solid #000;
              border-radius: 4px;
              padding: 1px 6px;
              margin-top: 2mm;
              letter-spacing: 0.5px;
            }
            .car-info {
              font-size: 9px;
              font-weight: 600;
              color: #333;
              margin-top: 1mm;
            }
            .scan-hint {
              font-size: 8px;
              color: #555;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-top: 1mm;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="header">${shopName}</div>
          <img src="${qrDataUrl}" class="qr-img" alt="QR" />
          <div class="patente-badge">${formatPatenteDisplay(patente)}</div>
          <div class="car-info">${marca} ${modelo}</div>
          <div class="scan-hint">Escaneá para ver el historial</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-100 p-1.5 rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <QrCode className="w-4 h-4" />
          </div>
          <h3 className="text-base font-black text-zinc-100 uppercase tracking-tight">
            Código QR del Vehículo
          </h3>
        </div>
        <p className="text-xs text-zinc-400">
          Entregáselo al cliente o pegalo en el coche para consulta directa
        </p>

        {/* Sticker Preview Container */}
        <div className="mt-5 p-5 rounded-2xl bg-white text-zinc-950 max-w-[280px] mx-auto shadow-xl border border-zinc-200">
          <p className="text-[11px] font-black uppercase tracking-wider text-zinc-900 mb-2">
            {shopName}
          </p>

          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR para patente ${patente}`}
              className="w-48 h-48 mx-auto object-contain"
            />
          ) : (
            <div className="w-48 h-48 mx-auto bg-zinc-100 animate-pulse rounded-lg" />
          )}

          <div className="mt-3">
            <span className="inline-block px-3 py-1 rounded bg-zinc-100 border border-zinc-950 text-xs font-mono font-bold tracking-wider">
              {formatPatenteDisplay(patente)}
            </span>
            <p className="text-[10px] font-semibold text-zinc-600 mt-1">
              {marca} {modelo}
            </p>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-800 mt-1">
              Escaneá para ver el historial
            </p>
          </div>
        </div>

        {/* Direct Link Info */}
        <div className="mt-5 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 flex items-center justify-between gap-2">
          <span className="text-[11px] text-zinc-400 font-mono truncate max-w-[220px]">
            {fullUrl}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
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
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
              title="Abrir como cliente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Actions Buttons */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadPng}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PNG</span>
          </button>
          <button
            onClick={handlePrintSticker}
            disabled={!qrDataUrl}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Sticker</span>
          </button>
        </div>
      </div>
    </div>
  );
}
