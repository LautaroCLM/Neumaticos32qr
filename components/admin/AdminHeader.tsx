'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions/auth';
import { LayoutDashboard, Car, PlusCircle, Settings, LogOut, ShieldCheck, User } from 'lucide-react';
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

  const navItems = [
    { href: '/admin/dashboard', label: 'Inicio', icon: LayoutDashboard },
    { href: '/admin/services/new', label: 'Nuevo Servicio', icon: PlusCircle },
    { href: '/admin/vehicles', label: 'Vehículos', icon: Car },
    ...(staffUser.rol === 'admin'
      ? [{ href: '/admin/settings', label: 'Configuración', icon: Settings }]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#0a0b0d]/90 backdrop-blur-md border-b border-[#262a33]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre del Taller */}
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 shrink-0 group-hover:scale-105 transition-transform">
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
              <span className="font-black text-sm tracking-tight text-white uppercase block">
                {shopName || 'Neumáticos el 32'}
              </span>
              <span className="text-[10px] text-[#d31a24] font-bold uppercase tracking-widest block -mt-0.5">
                Panel de Taller
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all min-h-[44px]',
                    isActive
                      ? 'bg-[#d31a24] text-white shadow-md font-bold'
                      : 'text-[#c8cdd5] hover:text-white hover:bg-[#14161b]'
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#14161b] border border-[#262a33]">
              <div className="w-6 h-6 rounded-lg bg-[#0a0b0d] flex items-center justify-center text-zinc-400">
                {staffUser.rol === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#d31a24]" />
                ) : (
                  <User className="w-3.5 h-3.5 text-zinc-300" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white leading-none">{staffUser.nombre}</p>
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-wider',
                  staffUser.rol === 'admin' ? 'text-[#d31a24]' : 'text-zinc-400'
                )}>
                  {staffUser.rol === 'admin' ? 'Administrador' : 'Operario'}
                </span>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[#14161b] hover:bg-red-950/40 text-zinc-400 hover:text-red-400 border border-[#262a33] hover:border-red-500/40 transition-all cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Barra de navegación inferior móvil con touch target >= 44px */}
      <div className="md:hidden border-t border-[#262a33] bg-[#0a0b0d]/95 px-2 py-1 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors min-h-[48px] min-w-[48px]',
                isActive ? 'text-[#d31a24]' : 'text-zinc-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
