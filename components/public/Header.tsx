import Link from 'next/link';
import Image from 'next/image';
import { User, ShieldCheck } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262a33] bg-[#0a0b0d]/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 shrink-0 group-hover:scale-105 transition-transform">
            <Image
              src="/logo.webp"
              alt="Logo Neumáticos el 32"
              width={44}
              height={44}
              className="object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-zinc-100 tracking-tight font-sans">
                Neumáticos el 32
              </span>
            </div>
            <p className="text-[11px] text-[#c8cdd5] flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#d31a24] inline" />
              Historial y Tickets Digitales
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/login"
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-[#14161b] hover:bg-[#1c1f26] border border-[#262a33] transition-colors flex items-center gap-1.5 min-h-[44px]"
            title="Acceso Taller"
          >
            <User className="w-4 h-4 text-[#d31a24]" />
            <span>Acceso Taller</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
