'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions/auth';
import { Wrench, LayoutDashboard, Car, PlusCircle, Settings, LogOut, ShieldCheck, User } from 'lucide-react';
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
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo y Nombre del Taller */}
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-zinc-100 uppercase block">
                {shopName || 'Neumáticos el 32'}
              </span>
              <span className="text-[10px] text-amber-500/90 font-bold uppercase tracking-widest block -mt-0.5">
                Panel de Taller
              </span>
            </div>
          </Link>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'bg-amber-500 text-zinc-950 shadow-md font-bold'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                {staffUser.rol === 'admin' ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-zinc-300" />
                )}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-zinc-200 leading-none">{staffUser.nombre}</p>
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-wider',
                  staffUser.rol === 'admin' ? 'text-amber-400' : 'text-zinc-400'
                )}>
                  {staffUser.rol === 'admin' ? 'Administrador' : 'Operario'}
                </span>
              </div>
            </div>

            <form action={logoutAction}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-500/30 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Barra de navegación inferior móvil */}
      <div className="md:hidden border-t border-zinc-900 bg-zinc-950/95 px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-colors',
                isActive ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'
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
