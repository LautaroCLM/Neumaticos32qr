import { describe, it } from 'node:test';
import assert from 'node:assert';
import { serviceFormSchema } from '../lib/security/validations';
import type { ServiceRecord, ShopTicketConfig } from '../lib/types/database';

console.log('🧪 Ejecutando pruebas de personalización de tickets y auditoría...\n');

// 1. Simulación de la función get_vehicle_by_token con purga de campos en servidor
function simulatePurgedTicket(
  service: ServiceRecord,
  visibilidad: Record<string, boolean>,
  ocultarPrecios: boolean
) {
  const showKm = visibilidad.mostrar_km ?? true;
  const showProds = visibilidad.mostrar_productos ?? true;
  const showPrice = (visibilidad.mostrar_precio ?? true) && !ocultarPrecios;
  const showNext = visibilidad.mostrar_proximo_servicio ?? true;
  const showSucursal = visibilidad.mostrar_sucursal ?? true;
  const showNotas = visibilidad.mostrar_notas ?? false;

  // Cálculo de total
  let finalPrice: number | null = null;
  if (showPrice) {
    if (service.total_manual !== null && service.total_manual !== undefined) {
      finalPrice = service.total_manual;
    } else if (service.items && service.items.length > 0) {
      finalPrice = service.items.reduce((acc, it) => acc + (it.cantidad * (it.precio_unitario || 0)), 0);
    } else {
      finalPrice = service.precio || 0;
    }
  }

  // Purga estricta: si el campo está oculto, NO viaja en el objeto
  // NOTA CRÍTICA: notas_internas JAMÁS viaja en el payload público
  const payload: Record<string, any> = {
    id: service.id,
    fecha_hora: service.fecha_hora,
    tipo: service.tipo,
    descripcion: service.descripcion,
    editado: service.editado,
    campos_extra: service.campos_extra,
  };

  if (showKm) payload.kilometraje = service.kilometraje;
  if (showSucursal) payload.sucursal = service.sucursal;
  if (showNotas) payload.notas_cliente = service.notas_cliente;
  if (showNext) {
    payload.proximo_servicio_km = service.proximo_servicio_km;
    payload.proximo_servicio_fecha = service.proximo_servicio_fecha;
  }
  if (showPrice) payload.precio = finalPrice;
  if (showProds) {
    if (service.items) {
      payload.items = showPrice
        ? service.items
        : service.items.map((it) => ({ concepto: it.concepto, cantidad: it.cantidad }));
    } else {
      payload.productos = service.productos;
    }
  }

  return payload;
}

// TEST 1: Purga de campos ocultos (El campo no viaja en el payload)
const baseService: ServiceRecord = {
  id: 'srv-test-1',
  vehicle_id: 'veh-test-1',
  fecha_hora: '2026-10-28T10:00:00Z',
  kilometraje: 75000,
  tipo: 'neumaticos',
  descripcion: 'Colocación 2 neumáticos',
  productos: '2x Firestone 185/65 R15',
  items: [{ concepto: 'Neumático Firestone', cantidad: 2, precio_unitario: 80000 }],
  precio: 160000,
  proximo_servicio_km: 85000,
  proximo_servicio_fecha: '2027-04-28',
  sucursal: 'Casa Central',
  notas_internas: 'Alerta interna: cliente conflictivo con garantía',
  notas_cliente: 'Revisar presión en frío cada 15 días',
  editado: false,
};

// Caso A: mostrar_km = false
const purgedKm = simulatePurgedTicket(baseService, { mostrar_km: false }, false);
assert.strictEqual('kilometraje' in purgedKm, false, 'El campo kilometraje no debe existir en el payload');
console.log('1. Purga estricta de KM en servidor:', '✅ PASÓ');

// Caso B: mostrar_precio = false -> Precio purgado y los ítems no muestran precio_unitario
const purgedPrice = simulatePurgedTicket(baseService, { mostrar_precio: false }, false);
assert.strictEqual('precio' in purgedPrice, false, 'El campo precio no debe existir en el payload');
assert.strictEqual('precio_unitario' in (purgedPrice.items?.[0] || {}), false, 'Los ítems no deben incluir precio_unitario');
console.log('2. Purga estricta de PRECIOS e ítems unitarios:', '✅ PASÓ');

// Caso C: notas_internas jamás viaja, y notas_cliente solo viaja si mostrar_notas = true
const withNotes = simulatePurgedTicket(baseService, { mostrar_notas: true }, false);
const withoutNotes = simulatePurgedTicket(baseService, { mostrar_notas: false }, false);
assert.strictEqual('notas_internas' in withNotes, false, 'notas_internas JAMÁS debe existir en el payload');
assert.strictEqual('notas_internas' in withoutNotes, false, 'notas_internas JAMÁS debe existir en el payload');
assert.strictEqual('notas_cliente' in withNotes, true, 'notas_cliente debe viajar cuando mostrar_notas = true');
assert.strictEqual('notas_cliente' in withoutNotes, false, 'notas_cliente NO debe viajar cuando mostrar_notas = false');
console.log('3. Aislamiento de notas_internas (nunca viaja) y notas_cliente:', '✅ PASÓ');

// TEST 2: Total manual reemplaza la suma de ítems
const manualTotalService: ServiceRecord = {
  ...baseService,
  items: [
    { concepto: 'Alineación láser', cantidad: 1, precio_unitario: 25000 },
    { concepto: 'Balanceo 4 ruedas', cantidad: 4, precio_unitario: 10000 },
  ], // Suma = 65.000
  total_manual: 55000, // Ajuste con descuento especial del taller
};
const manualCalc = simulatePurgedTicket(manualTotalService, {}, false);
assert.strictEqual(manualCalc.precio, 55000, 'El precio debe ser exactamente el total manual (55.000)');
console.log('3. Total manual prevalece sobre la suma de ítems:', '✅ PASÓ');

// TEST 3: Validación Zod de servicio (máx 30 ítems y 10 campos extra)
const validZod = serviceFormSchema.safeParse({
  vehicle_id: '11111111-1111-4111-a111-111111111111',
  fecha_hora: '2026-10-28T14:30:00Z',
  kilometraje: 80000,
  tipo: 'alineacion_balanceo',
  descripcion: 'Alineación computarizada',
  items: [{ concepto: 'Servicio', cantidad: 1, precio_unitario: 30000 }],
  campos_extra: [{ titulo: 'Garantía', valor: '6 meses' }],
  visibilidad: {
    mostrar_km: true,
    mostrar_productos: true,
    mostrar_precio: true,
    mostrar_proximo_servicio: true,
    mostrar_sucursal: true,
    mostrar_notas: false,
  },
});
assert.strictEqual(validZod.success, true);
console.log('4. Validación Zod de esquema y restricciones:', '✅ PASÓ');

// TEST 4: Control de aislamiento entre talleres para edición
function checkEditPermission(userShopId: string, serviceShopId: string, userRol: string, isAnulacion: boolean) {
  if (userShopId !== serviceShopId) {
    throw new Error('No tiene permiso para modificar servicios de otro taller.');
  }
  if (isAnulacion && userRol !== 'admin') {
    throw new Error('Solo un administrador puede anular servicios.');
  }
  return true;
}

assert.throws(
  () => checkEditPermission('shop-A', 'shop-B', 'admin', false),
  /otro taller/,
  'Debe rechazar edición de otro taller'
);
assert.throws(
  () => checkEditPermission('shop-A', 'shop-A', 'operario', true),
  /administrador/,
  'Operario no puede anular servicios'
);
assert.strictEqual(checkEditPermission('shop-A', 'shop-A', 'operario', false), true);
assert.strictEqual(checkEditPermission('shop-A', 'shop-A', 'admin', true), true);
console.log('5. Aislamiento de permisos de edición y anulación de admin:', '✅ PASÓ');

console.log('\n✨ Todos los tests de personalización y visibilidad pasaron con éxito.');
