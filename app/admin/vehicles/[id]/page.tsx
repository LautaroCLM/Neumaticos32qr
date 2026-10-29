import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { notFound, redirect } from 'next/navigation';
import { VehicleDetailClientView } from './VehicleDetailClientView';

export default async function AdminVehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  const { id } = await params;
  const supabase = await createClient();

  // Obtener vehículo respetando RLS del taller
  const { data: vehicle, error: vehErr } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (vehErr || !vehicle) {
    notFound();
  }

  // Obtener todos los servicios de este vehículo
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('vehicle_id', id)
    .is('deleted_at', null)
    .order('fecha_hora', { ascending: false });

  return (
    <VehicleDetailClientView
      vehicle={vehicle}
      services={services || []}
      staffUser={{
        nombre: staffData.staff.nombre,
        rol: staffData.staff.rol,
      }}
      shopName={staffData.shop?.nombre || 'Neumáticos el 32'}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}
    />
  );
}
