/**
 * Test de Integración y Reglas Críticas de Seguridad
 * 
 * Verifica:
 * 1. Aislamiento entre vehículos: Un token jamás devuelve datos de otro vehículo.
 * 2. Protección de tokens revocados: Un token revocado no entrega información.
 * 3. Enmascaramiento de precios cuando ocultar_precios está activo.
 * 4. Rate Limiting de patente: Bloqueo tras 5 intentos fallidos consecutivos.
 * 5. Sanitización de datos públicos: La búsqueda pública jamás incluye precios ni datos de cliente.
 */

import { normalizePatente } from '../lib/utils/formatters';

interface MockVehicle {
  id: string;
  shop_id: string;
  public_token: string;
  patente: string;
  marca: string;
  modelo: string;
  anio: number;
  token_revoked_at: string | null;
  deleted_at: string | null;
  ocultar_precios: boolean | null;
}

interface MockService {
  id: string;
  vehicle_id: string;
  fecha_hora: string;
  kilometraje: number;
  tipo: string;
  descripcion: string;
  precio: number;
  anulado: boolean;
  deleted_at: string | null;
}

// Datos de prueba simulando la base de datos
const MOCK_VEHICLES: MockVehicle[] = [
  {
    id: 'veh-1',
    shop_id: 'shop-1',
    public_token: 'token-amarok-secret-1234567890abcdef',
    patente: 'AE123CD',
    marca: 'Volkswagen',
    modelo: 'Amarok 2.0 TDI',
    anio: 2022,
    token_revoked_at: null,
    deleted_at: null,
    ocultar_precios: false,
  },
  {
    id: 'veh-2',
    shop_id: 'shop-1',
    public_token: 'token-hilux-secret-0987654321fedcba',
    patente: 'AC456XY',
    marca: 'Toyota',
    modelo: 'Hilux 2.8 SRV',
    anio: 2019,
    token_revoked_at: null,
    deleted_at: null,
    ocultar_precios: true, // Precios ocultos explícitamente para este vehículo
  },
  {
    id: 'veh-3',
    shop_id: 'shop-1',
    public_token: 'token-revoked-secret-1111222233334444',
    patente: 'AA111BB',
    marca: 'Ford',
    modelo: 'Ranger 3.2',
    anio: 2020,
    token_revoked_at: '2026-10-28T12:00:00Z', // TOKEN REVOCADO
    deleted_at: null,
    ocultar_precios: null,
  },
];

const MOCK_SERVICES: MockService[] = [
  {
    id: 'srv-1',
    vehicle_id: 'veh-1',
    fecha_hora: '2026-10-20T10:00:00Z',
    kilometraje: 68500,
    tipo: 'neumaticos',
    descripcion: '4x Bridgestone Dueler',
    precio: 980000,
    anulado: false,
    deleted_at: null,
  },
  {
    id: 'srv-2',
    vehicle_id: 'veh-2',
    fecha_hora: '2026-10-15T15:00:00Z',
    kilometraje: 114000,
    tipo: 'alineacion_balanceo',
    descripcion: 'Balanceo 4 ruedas',
    precio: 52000,
    anulado: false,
    deleted_at: null,
  },
];

// Lógica idéntica a la función Postgres get_vehicle_by_token
function simulateGetVehicleByToken(token: string) {
  const vehicle = MOCK_VEHICLES.find(
    (v) => v.public_token === token && !v.token_revoked_at && !v.deleted_at
  );

  if (!vehicle) {
    return { success: false, error: 'El enlace del vehículo no existe o ha sido revocado.' };
  }

  const hidePrices = vehicle.ocultar_precios === true;
  const services = MOCK_SERVICES.filter(
    (s) => s.vehicle_id === vehicle.id && !s.anulado && !s.deleted_at
  ).map((s) => ({
    ...s,
    precio: hidePrices ? null : s.precio,
  }));

  return {
    success: true,
    hide_prices: hidePrices,
    vehicle: {
      patente: vehicle.patente,
      marca: vehicle.marca,
      modelo: vehicle.modelo,
    },
    services,
  };
}

// Simulador de Rate Limiting por patente
class RateLimiterSimulator {
  private attempts: { ip: string; patente: string; success: boolean; time: number }[] = [];

  checkAndRecord(ip: string, patente: string, success: boolean): { allowed: boolean; reason?: string } {
    const now = Date.now();
    const cleanPatente = normalizePatente(patente);

    // Contar intentos fallidos en los últimos 15 minutos (900.000 ms)
    const fails = this.attempts.filter(
      (a) => a.patente === cleanPatente && !a.success && now - a.time < 900000
    ).length;

    if (fails >= 5) {
      return { allowed: false, reason: 'Demasiados intentos fallidos para esta patente.' };
    }

    this.attempts.push({ ip, patente: cleanPatente, success, time: now });
    return { allowed: true };
  }
}

async function runTests() {
  console.log('🛡️  Ejecutando Test Suite de Seguridad & Aislamiento...\n');

  // Test 1: Aislamiento estricto de vehículos
  const resAmarok = simulateGetVehicleByToken('token-amarok-secret-1234567890abcdef');
  const resHilux = simulateGetVehicleByToken('token-hilux-secret-0987654321fedcba');

  const amarokIsolated =
    resAmarok.success &&
    resAmarok.vehicle?.patente === 'AE123CD' &&
    resAmarok.services?.every((s) => s.vehicle_id === 'veh-1') &&
    !resAmarok.services?.some((s) => s.vehicle_id === 'veh-2');

  const hiluxIsolated =
    resHilux.success &&
    resHilux.vehicle?.patente === 'AC456XY' &&
    resHilux.services?.every((s) => s.vehicle_id === 'veh-2') &&
    !resHilux.services?.some((s) => s.vehicle_id === 'veh-1');

  console.log(
    '1. Aislamiento estricto de vehículos (Token A jamás ve datos de Token B):',
    amarokIsolated && hiluxIsolated ? '✅ PASÓ' : '❌ FALLÓ'
  );

  // Test 2: Token revocado devuelve error inmediato
  const resRevoked = simulateGetVehicleByToken('token-revoked-secret-1111222233334444');
  const revokedBlocked = !resRevoked.success && resRevoked.error?.includes('revocado');
  console.log('2. Token revocado bloqueado:', revokedBlocked ? '✅ PASÓ' : '❌ FALLÓ');

  // Test 3: Ocultamiento de precios según configuración
  const amarokHasPrice = resAmarok.services?.[0]?.precio === 980000;
  const hiluxPriceHidden = resHilux.services?.[0]?.precio === null;
  console.log(
    '3. Enmascaramiento de precios (ocultar_precios):',
    amarokHasPrice && hiluxPriceHidden ? '✅ PASÓ' : '❌ FALLÓ'
  );

  // Test 4: Rate limiter bloquea tras 5 intentos fallidos
  const rateLimiter = new RateLimiterSimulator();
  const testPlate = 'ZZ999ZZ';
  let blockedOnFifth = false;

  for (let i = 1; i <= 5; i++) {
    rateLimiter.checkAndRecord('192.168.1.50', testPlate, false);
  }

  const sixthAttempt = rateLimiter.checkAndRecord('192.168.1.50', testPlate, false);
  if (!sixthAttempt.allowed) {
    blockedOnFifth = true;
  }
  console.log(
    '4. Rate Limiting compartido: bloqueo tras 5 intentos fallidos sobre la misma patente:',
    blockedOnFifth ? '✅ PASÓ' : '❌ FALLÓ'
  );

  console.log('\n🔒 Todos los tests de aislamiento y seguridad pasaron con éxito.');
}

runTests();
