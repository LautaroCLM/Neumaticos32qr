import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { VehiclesListView } from './VehiclesListView';

export default async function AdminVehiclesPage() {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`
      id,
      patente,
      marca,
      modelo,
      anio,
      cliente_nombre,
      cliente_telefono,
      public_token,
      ocultar_precios,
      created_at,
      services (id)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <VehiclesListView
      vehicles={(vehicles as any[]) || []}
      shopName={staffData.shop?.nombre || 'Neumáticos el 32'}
    />
  );
}
