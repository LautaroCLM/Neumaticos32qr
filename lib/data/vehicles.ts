// Fragmento de select para traer los propietarios de un vehículo junto con sus datos.
export const VEHICLE_OWNERS_SELECT = 'vehicle_owners (hasta, customers (id, nombre, telefono))';

interface VehicleOwnerRow {
  hasta: string | null;
  customers: { id: string; nombre: string; telefono: string | null } | null;
}

/**
 * Reemplaza las filas de vehicle_owners por los datos del propietario actual.
 */
export function withCurrentOwner<T extends { vehicle_owners?: VehicleOwnerRow[] | null }>(vehicle: T) {
  const { vehicle_owners, ...rest } = vehicle;
  const customer = vehicle_owners?.find((owner) => owner.hasta === null)?.customers ?? null;

  return {
    ...rest,
    cliente_id: customer?.id ?? null,
    cliente_nombre: customer?.nombre ?? null,
    cliente_telefono: customer?.telefono ?? null,
  };
}
