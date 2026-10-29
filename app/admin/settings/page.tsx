import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsClientView } from './SettingsClientView';

export default async function AdminSettingsPage() {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  // Solo administradores pueden ingresar a la configuración
  if (staffData.staff.rol !== 'admin') {
    return (
      <div className="p-12 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-3">
        <h2 className="text-base font-black text-red-400 uppercase tracking-tight">Acceso Restringido</h2>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          Esta sección está reservada exclusivamente para administradores del taller.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  // Obtener datos del taller
  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('id', staffData.staff.shop_id)
    .single();

  // Obtener plantillas del taller
  const { data: templates } = await supabase
    .from('service_templates')
    .select('*')
    .eq('shop_id', staffData.staff.shop_id)
    .order('created_at', { ascending: true });

  return (
    <SettingsClientView
      shop={shop}
      templates={templates || []}
    />
  );
}
