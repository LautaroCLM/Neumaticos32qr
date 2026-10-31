import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { VEHICLE_OWNERS_SELECT, withCurrentOwner } from '@/lib/data/vehicles';
import { DashboardClientView } from './DashboardClientView';

export default async function AdminDashboardPage() {
  const staffData = await getCurrentStaff();
  if (!staffData) {
    redirect('/admin/login');
  }

  const supabase = await createClient();

  // Obtener los últimos 50 servicios del taller
  const { data: services, error: srvErr } = await supabase
    .from('services')
    .select(`
      id,
      fecha_hora,
      kilometraje,
      tipo,
      descripcion,
      precio,
      total_manual,
      anulado,
      editado,
      created_at,
      vehicles (
        id,
        patente,
        marca,
        modelo,
        anio,
        public_token,
        ${VEHICLE_OWNERS_SELECT}
      )
    `)
    .order('fecha_hora', { ascending: false })
    .limit(50);

  // Obtener lista rápida de vehículos del taller para el buscador
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select(`id, patente, marca, modelo, anio, public_token, ${VEHICLE_OWNERS_SELECT}`)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <DashboardClientView
      initialServices={((services as any[]) || []).map((srv) => ({
        ...srv,
        vehicles: srv.vehicles ? withCurrentOwner(srv.vehicles) : null,
      }))}
      vehicles={((vehicles as any[]) || []).map(withCurrentOwner)}
      staffUser={{
        nombre: staffData.staff.nombre,
        rol: staffData.staff.rol,
      }}
      shopName={staffData.shop?.nombre || 'Neumáticos el 32'}
    />
  );
}
