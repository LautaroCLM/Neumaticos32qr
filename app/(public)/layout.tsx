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
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-zinc-800/80 bg-zinc-950 py-8 px-4 text-xs text-zinc-400">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="font-bold text-zinc-200 text-sm">{shopNombre}</p>
              <p className="text-zinc-500">Gomería, Tren Delantero y Mecánica Ligera</p>
            </div>
            {whatsappDigits && (
              <div className="flex items-center gap-3">
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-500 hover:text-red-400 flex items-center gap-1 font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp Oficial
                </a>
              </div>
            )}
          </div>

          {(hasDireccion || hasHorarios) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-zinc-400">
              {hasDireccion && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{shop!.direccion}</span>
                </div>
              )}
              {hasHorarios && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <span>{shop!.horarios}</span>
                </div>
              )}
            </div>
          )}

          <p className="text-[11px] text-zinc-400 text-center pt-4">
            © {new Date().getFullYear()} {shopNombre}. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
