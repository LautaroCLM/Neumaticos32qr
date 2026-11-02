import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { notFound, redirect } from 'next/navigation';
import { ServiceForm } from '@/components/admin/ServiceForm';
import { RevisionsHistory } from '@/components/admin/RevisionsHistory';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function AdminEditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  const { id } = await params;
  const supabase = await createClient();

  // Obtener servicio existente
  const { data: service, error: srvErr } = await supabase
    .from('services')
    .select(`
      *,
      vehicles (
        id,
        patente,
        marca,
        modelo,
        anio,
        shop_id
      )
    `)
    .eq('id', id)
    .single();

  if (srvErr || !service) {
    notFound();
  }

  // Obtener historial de revisiones de este servicio
  const { data: revisions } = await supabase
    .from('service_revisions')
    .select('*')
    .eq('service_id', id)
    .order('editado_en', { ascending: false });

  // Obtener plantillas
  const { data: templates } = await supabase
    .from('service_templates')
    .select('*')
    .eq('activo', true)
    .order('nombre');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/vehicles/${service.vehicles.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-[#f04d55] transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver a la ficha del vehículo</span>
        </Link>
        <h1 className="font-display text-2xl sm:text-[28px] leading-[0.95] text-[#f2f2ef]">
          Modificar Servicio / Auditoría
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Toda edición realizada quedará guardada de forma inmutable en el historial de revisiones.
        </p>
      </div>

      <ServiceForm
        vehicle={service.vehicles}
        initialService={service}
        templates={templates || []}
        shopTicketConfig={staffData.shop?.ticket_config}
        currentUserRole={staffData.staff.rol}
        isEditing={true}
      />

      <div className="pt-6 border-t border-zinc-800">
        <RevisionsHistory revisions={revisions || []} />
      </div>
    </div>
  );
}
