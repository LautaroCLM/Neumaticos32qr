import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { VEHICLE_OWNERS_SELECT, withCurrentOwner } from '@/lib/data/vehicles';
import { ServiceNewVehicleSelector } from './ServiceNewVehicleSelector';

export default async function AdminNewServicePage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle_id?: string }>;
}) {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  const { vehicle_id } = await searchParams;
  const supabase = await createClient();

  // Si no se pasó vehicle_id, mostrar selector rápido de vehículos
  if (!vehicle_id) {
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select(`id, patente, marca, modelo, anio, ${VEHICLE_OWNERS_SELECT}`)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    return <ServiceNewVehicleSelector vehicles={((vehicles as any[]) || []).map(withCurrentOwner) as any[]} />;
  }

  // Obtener vehículo seleccionado
  const { data: vehicle, error: vehErr } = await supabase
    .from('vehicles')
    .select('id, patente, marca, modelo, anio, shop_id')
    .eq('id', vehicle_id)
    .is('deleted_at', null)
    .single();

  if (vehErr || !vehicle) {
    redirect('/admin/services/new');
  }

  // Obtener plantillas activas de este taller
  const { data: templates } = await supabase
    .from('service_templates')
    .select('id, nombre, tipo, descripcion_base, items_base, campos_extra_base, visibilidad_base')
    .eq('activo', true)
    .order('nombre');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-[28px] leading-[0.95] text-[#f2f2ef]">
          Registrar Nuevo Servicio
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Completá los datos del mantenimiento realizado. Podés previsualizar el ticket en tiempo real.
        </p>
      </div>

      <ServiceForm
        vehicle={vehicle}
        templates={templates || []}
        shopTicketConfig={staffData.shop?.ticket_config}
        currentUserRole={staffData.staff.rol}
        isEditing={false}
      />
    </div>
  );
}
