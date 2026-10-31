import { createClient } from '@/lib/supabase/server';
import { getCurrentStaff } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';
import { CustomersListView } from './CustomersListView';

export default async function AdminCustomersPage() {
  const staffData = await getCurrentStaff();
  if (!staffData) redirect('/admin/login');

  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id,
      nombre,
      telefono,
      email,
      notas_internas,
      vehicle_owners (
        hasta,
        vehicles (id, patente, marca, modelo)
      )
    `)
    .is('deleted_at', null)
    .order('nombre');

  return <CustomersListView customers={(customers as any[]) || []} />;
}
