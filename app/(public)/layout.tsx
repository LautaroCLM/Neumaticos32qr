import { Header } from '@/components/public/Header';
import { MapPin, Clock, Phone, MessageCircle } from 'lucide-react';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
              <p className="font-bold text-zinc-200 text-sm">Neumáticos el 32</p>
              <p className="text-zinc-500">Gomería, Tren Delantero y Mecánica Ligera</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://wa.me/5491132003200"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp Oficial
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-900 text-zinc-400">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <span>Av. Mitre 3200, Quilmes, Prov. de Buenos Aires</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
              <span>Lun a Vie 8:00 a 18:30 | Sáb 8:00 a 13:00</span>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 text-center pt-4">
            © {new Date().getFullYear()} Neumáticos el 32. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
