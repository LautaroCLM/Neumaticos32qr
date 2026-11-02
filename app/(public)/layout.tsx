import { Header } from '@/components/public/Header';
import { getPublicShop } from '@/lib/supabase/public-shop';
import { getWhatsAppDigits, isConfigPlaceholder } from '@/lib/utils/formatters';
import { MapPin, Clock, MessageCircle } from 'lucide-react';

// Si la base no responde durante el build, la portada no queda sin datos de contacto hasta el próximo deploy.
export const revalidate = 300;

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shop = await getPublicShop();
  const shopNombre = !isConfigPlaceholder(shop?.nombre) ? shop!.nombre : 'Neumáticos el 32';
  const whatsappDigits = getWhatsAppDigits(shop?.whatsapp);
  const hasDireccion = !isConfigPlaceholder(shop?.direccion);
  const hasHorarios = !isConfigPlaceholder(shop?.horarios);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-7 sm:py-10">
        {children}
      </main>

      <footer className="mt-auto border-t border-[#2a2b2e] py-8 px-4 sm:px-6 text-xs text-[#9a9da3]">
        <div className="max-w-5xl mx-auto space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="font-display text-sm text-[#f2f2ef]">{shopNombre}</p>
              <p className="mt-1 text-[#9a9da3]">Gomería, Tren Delantero y Mecánica Ligera</p>
            </div>
            {whatsappDigits && (
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[44px] font-semibold text-[#f2f2ef] hover:text-[#d31a24] transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden="true" />
                WhatsApp Oficial
              </a>
            )}
          </div>

          {(hasDireccion || hasHorarios) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-[#2a2b2e] text-[#c8cad0]">
              {hasDireccion && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#9a9da3] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{shop!.direccion}</span>
                </div>
              )}
              {hasHorarios && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#9a9da3] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{shop!.horarios}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-[#9a9da3]">
            © {new Date().getFullYear()} {shopNombre}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
