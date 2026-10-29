import Link from 'next/link';
import { Wrench, ShieldCheck, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-zinc-100 tracking-tight">
                Neumáticos el 32
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded">
                Oficial
              </span>
            </div>
            <p className="text-xs text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400 inline" />
              Historial Digital de Servicios
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/login"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors text-xs flex items-center gap-1.5"
            title="Acceso Taller"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Taller</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
