import { getCurrentStaff } from '@/lib/actions/auth';
import { AdminHeader } from '@/components/admin/AdminHeader';

export const metadata = {
  title: 'Panel de Taller | Neumáticos el 32',
  description: 'Gestión interna de servicios y tickets digitales para Neumáticos el 32',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staffData = await getCurrentStaff();

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-zinc-100 flex flex-col font-sans selection:bg-[#D31A24] selection:text-white">
      {staffData && (
        <AdminHeader
          staffUser={{
            nombre: staffData.staff.nombre,
            rol: staffData.staff.rol,
          }}
          shopName={staffData.shop?.nombre || 'Neumáticos el 32'}
        />
      )}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
