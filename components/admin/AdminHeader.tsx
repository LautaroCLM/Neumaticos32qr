'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions/auth';
import { LayoutDashboard, Car, PlusCircle, Settings, LogOut, ShieldCheck, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AdminHeaderProps {
  staffUser: {
    nombre: string;
    rol: 'admin' | 'operario';
  };
  shopName: string;
}

export function AdminHeader({ staffUser, shopName }: AdminHeaderProps) {
  const pathname = usePathname();

  const navItems: { href: string; label: string; shortLabel?: string; icon: typeof LayoutDashboard }[] = [
    { href: '/admin/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/admin/services/new', label: 'Nuevo Servicio', shortLabel: 'Nuevo', icon: PlusCircle },
    { href: '/admin/vehicles', label: 'Vehículos', icon: Car },
    { href: '/admin/customers', label: 'Clientes', icon: Users },
    ...(staffUser.rol === 'admin'
      ? [{ href: '/admin/settings', label: 'Configuración', shortLabel: 'Ajustes', icon: Settings }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0d0d0e] border-b border-[#2a2b2e]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre del Taller */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 shrink-0">
              <Image
                src="/logo.webp"
                alt="Logo Neumáticos el 32"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-display text-[13px] sm:text-sm leading-[1.05] text-[#f2f2ef] block max-w-[56vw] sm:max-w-none">
                {shopName || 'Neumáticos el 32'}
              </span>
              <span className="hidden sm:block text-[10px] text-[#9a9da3] font-bold uppercase tracking-[0.16em] mt-1">
                Panel de Taller
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-stretch self-stretch gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 text-[13px] font-semibold border-b-2 transition-colors min-h-[44px]',
                    isActive
                      ? 'border-[#d31a24] text-[#f2f2ef]'
                      : 'border-transparent text-[#c8cad0] hover:text-[#f2f2ef] hover:border-[#3a3b3f]'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Usuario y Cierre de Sesión */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[#161719] border border-[#2a2b2e]">
              <div className="w-6 h-6 rounded-sm bg-[#0d0d0e] flex items-center justify-center text-zinc-400">
                {staffUser.rol === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#f04d55]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-zinc-300" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{staffUser.nombre}</p>
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-wider',
                  staffUser.rol === 'admin' ? 'text-[#f04d55]' : 'text-zinc-400'
                )}>
                  {staffUser.rol === 'admin' ? 'Administrador' : 'Operario'}
                </span>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-2 rounded-sm text-xs font-semibold bg-[#161719] hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-[#2a2b2e] hover:border-red-500/40 transition-all cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Barra de navegación inferior móvil con touch target >= 44px */}
      <nav className="md:hidden border-t border-[#2a2b2e] bg-[#0d0d0e] flex items-stretch justify-around" aria-label="Navegación del panel">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 border-t-2 -mt-px text-[10px] font-bold transition-colors min-h-[52px] min-w-[48px]',
                isActive ? 'border-[#d31a24] text-[#f2f2ef]' : 'border-transparent text-zinc-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="whitespace-nowrap">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
