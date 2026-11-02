import Link from 'next/link';
import Image from 'next/image';
import { LockKeyhole } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2a2b2e] bg-[#0d0d0e]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-h-[44px] min-w-0" aria-label="Neumáticos el 32, inicio">
          <Image
            src="/logo.webp"
            alt=""
            width={44}
            height={44}
            className="w-11 h-11 object-contain shrink-0"
            priority
          />
          <span className="font-display text-[14px] sm:text-[15px] leading-none whitespace-nowrap text-[#f2f2ef]">
            Neumáticos <span className="text-[#d31a24]">el 32</span>
          </span>
        </Link>

        <Link
          href="/admin/login"
          aria-label="Acceso taller"
          className="shrink-0 inline-flex items-center gap-2 px-3 min-h-[44px] rounded-xs border border-[#3a3b3f] text-[13px] font-semibold text-[#c8cad0] hover:text-[#f2f2ef] hover:border-[#9a9da3] transition-colors"
        >
          <LockKeyhole className="w-4 h-4" aria-hidden="true" />
          <span className="whitespace-nowrap min-[400px]:hidden">Taller</span>
          <span className="whitespace-nowrap hidden min-[400px]:inline">Acceso taller</span>
        </Link>
      </div>
    </header>
  );
}
