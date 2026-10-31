import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { VEHICLE_OWNERS_SELECT, withCurrentOwner } from '@/lib/data/vehicles';
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
      public_token,
      ocultar_precios,
      created_at,
      services (id),
      ${VEHICLE_OWNERS_SELECT}
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <VehiclesListView
      vehicles={((vehicles as any[]) || []).map(withCurrentOwner)}
      shopName={staffData.shop?.nombre || 'Neumáticos el 32'}
    />
  );
}
