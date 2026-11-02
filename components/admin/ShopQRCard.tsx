'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, ExternalLink, Printer, Share2 } from 'lucide-react';
import { escapeHtml } from '@/lib/utils/formatters';

interface ShopQRCardProps {
  siteUrl: string;
  shopName: string;
}

// Una hoja A4 entra en 3 columnas por 4 filas de stickers de 64 × 68 mm
const STICKERS_PER_SHEET = 12;

/**
 * QR único del taller: lleva a la página principal, donde cada cliente busca su
 * vehículo con la patente y los últimos 4 dígitos del teléfono. Al no depender del
 * vehículo se puede imprimir por adelantado y entregar a cualquier cliente.
 */
export function ShopQRCard({ siteUrl, shopName }: ShopQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const homeUrl = `${siteUrl.replace(/\/+$/, '')}/`;
  const displayUrl = homeUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  useEffect(() => {
    QRCode.toDataURL(homeUrl, {
      width: 1200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    })
      .then(setQrDataUrl)
      .catch((err) => console.error('Error generando QR:', err));
  }, [homeUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(homeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Comparte la imagen del QR (WhatsApp, Instagram, etc.) o, si el navegador no puede, el enlace
  const handleShare = async () => {
    const text = `Consultá el historial de tu vehículo en ${shopName}`;
    try {
      if (qrDataUrl && navigator.canShare) {
        const blob = await (await fetch(qrDataUrl)).blob();
        const file = new File([blob], 'QR-neumaticos-el-32.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: shopName, text: `${text}: ${homeUrl}` });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({ title: shopName, text, url: homeUrl });
        return;
      }
    } catch (err) {
      // Si la persona cancela el diálogo de compartir no hay nada que hacer
      if (err instanceof DOMException && err.name === 'AbortError') return;
    }
    handleCopy();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'QR-neumaticos-el-32.png';
    link.click();
  };

  // La ventana de impresión comparte el origen del panel: todo valor dinámico va escapado
  const openPrintWindow = (layout: 'sheet' | 'poster') => {
    if (!qrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=820,height=1000');
    if (!printWindow) {
      alert('Por favor habilitá las ventanas emergentes para imprimir el QR.');
      return;
    }

    const logo = `${escapeHtml(window.location.origin)}/logo.png`;
    const qr = escapeHtml(qrDataUrl);
    const name = escapeHtml(shopName);
    const url = escapeHtml(displayUrl);

    const sticker = `
      <div class="sticker">
        <img src="${logo}" class="logo" alt="${name}" />
        <img src="${qr}" class="qr" alt="QR" />
        <p class="title">Escaneá y consultá el historial de tu vehículo</p>
        <p class="hint">Con tu patente y los últimos 4 dígitos de tu teléfono</p>
        <p class="url">${url}</p>
      </div>`;

    const body =
      layout === 'sheet'
        ? `<main class="sheet">${sticker.repeat(STICKERS_PER_SHEET)}</main>`
        : `<main class="poster">
            <img src="${logo}" class="logo" alt="${name}" />
            <h1>Historial de servicios</h1>
            <img src="${qr}" class="qr" alt="QR" />
            <p class="title">Escaneá con la cámara del celular</p>
            <p class="hint">Ingresá tu patente y los últimos 4 dígitos de tu teléfono para ver los trabajos, los costos y el próximo control de tu vehículo.</p>
            <p class="url">${url}</p>
          </main>`;

    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>QR ${name}</title>
          <style>
            @page { size: A4; margin: ${layout === 'sheet' ? '8mm' : '15mm'}; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #000; background: #fff; text-align: center;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
            p { margin: 0; }
            .sheet { display: grid; grid-template-columns: repeat(3, 64mm); grid-auto-rows: 68mm; justify-content: center; }
            .sticker { display: flex; flex-direction: column; align-items: center; justify-content: center;
              padding: 3mm; border: 0.2mm dashed #bbb; }
            .sticker .logo { height: 9mm; max-width: 40mm; object-fit: contain; }
            .sticker .qr { width: 38mm; height: 38mm; margin: 1.5mm 0; }
            .sticker .title { font-size: 8.5pt; font-weight: 800; line-height: 1.15; }
            .sticker .hint { font-size: 6.5pt; color: #333; margin-top: 0.8mm; line-height: 1.2; }
            .sticker .url { font-size: 7pt; font-weight: 700; margin-top: 1mm; }
            .poster { min-height: 260mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6mm; }
            .poster .logo { height: 32mm; object-fit: contain; }
            .poster h1 { margin: 0; font-size: 30pt; font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; }
            .poster .qr { width: 120mm; height: 120mm; }
            .poster .title { font-size: 18pt; font-weight: 800; }
            .poster .hint { font-size: 12pt; max-width: 140mm; line-height: 1.35; }
            .poster .url { font-size: 14pt; font-weight: 700; }
          </style>
        </head>
        <body>
          ${body}
          <script>
            window.onload = function () {
              window.print();
              setTimeout(function () { window.close(); }, 500);
            };
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-start">
      <div className="bg-white p-4 rounded-sm w-full max-w-[240px] mx-auto md:mx-0">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Código QR del taller" className="w-full h-auto" />
        ) : (
          <div className="aspect-square bg-zinc-100 animate-pulse" />
        )}
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <h2 className="font-display text-xl leading-none text-[#f2f2ef]">Un solo QR para todos</h2>
          <p className="text-sm text-zinc-400 leading-relaxed max-w-[60ch]">
            Lleva a la página principal. Cada cliente ingresa su patente y los últimos 4 dígitos del teléfono
            para ver su historial, así que podés imprimirlo por adelantado y entregarlo a cualquiera. Para que
            un cliente pueda consultar, su vehículo tiene que tener cargado el teléfono del propietario.
          </p>
        </div>

        <div>
          <label className="block label-caps text-[#9a9da3] mb-1.5">Dirección del QR</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={homeUrl}
              className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xs bg-[#0d0d0e] border border-[#3a3b3f] text-sm text-zinc-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-zinc-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <a
              href={homeUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir la página"
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-zinc-300 transition-colors shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => openPrintWindow('sheet')}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 px-4 min-h-[44px] rounded-xs bg-[#d31a24] hover:bg-[#e3262f] active:bg-[#b5161f] text-white text-xs font-black uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir hoja de {STICKERS_PER_SHEET} stickers</span>
          </button>
          <button
            type="button"
            onClick={() => openPrintWindow('poster')}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 px-4 min-h-[44px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir cartel A4</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 px-4 min-h-[44px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir</span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!qrDataUrl}
            className="flex items-center gap-2 px-4 min-h-[44px] rounded-xs border border-[#3a3b3f] hover:border-[#9a9da3] text-zinc-200 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Descargar PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
