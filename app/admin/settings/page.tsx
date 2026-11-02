import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { SettingsClientView } from './SettingsClientView';
import { env } from '@/lib/env';

export default async function AdminSettingsPage() {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  // Solo administradores pueden ingresar a la configuración (operarios son redirigidos al dashboard)
  if (staffData.staff.rol !== 'admin') {
    redirect('/admin/dashboard');
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
      siteUrl={env.NEXT_PUBLIC_SITE_URL}
    />
  );
}
