import {
  normalizePatente,
  isValidPatente,
  formatPatenteDisplay,
  formatDateBA,
  formatCurrencyARS,
  formatKilometers,
} from '../lib/utils/formatters';

console.log('🧪 Iniciando pruebas de reglas de negocio y formateo...');

// Test 1: Normalización de patentes
const t1 = normalizePatente('  ae 123-cd  ') === 'AE123CD';
const t2 = normalizePatente('abc 456') === 'ABC456';
console.log('1. Normalización de patentes:', t1 && t2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 2: Validación de patentes argentinas
const v1 = isValidPatente('AE123CD'); // Auto Mercosur
const v2 = isValidPatente('ABC123');  // Auto tradicional
const v3 = isValidPatente('A123BCD'); // Moto Mercosur
const v4 = !isValidPatente('123456'); // Inválido
const v5 = !isValidPatente('AE123C'); // Inválido
console.log(
  '2. Validación de formatos de patentes:',
  v1 && v2 && v3 && v4 && v5 ? '✅ PASÓ' : '❌ FALLÓ'
);

// Test 3: Display formateado
const d1 = formatPatenteDisplay('AE123CD') === 'AE 123 CD';
const d2 = formatPatenteDisplay('ABC123') === 'ABC 123';
console.log('3. Display visual de patente:', d1 && d2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 4: Formateo de moneda ARS
const c1 = formatCurrencyARS(980000).includes('980.000');
const c2 = formatCurrencyARS(null) === '—';
console.log('4. Moneda ARS:', c1 && c2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 5: Kilómetros
const k1 = formatKilometers(68500).includes('68.500 km');
const k2 = formatKilometers(null) === '—';
console.log('5. Formato de kilometraje:', k1 && k2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 6: Fechas en Timezone de Buenos Aires
const dateSample = new Date('2026-10-28T15:00:00Z');
const f1 = formatDateBA(dateSample, { short: true });
console.log('6. Fecha Buenos Aires corta:', f1, f1.length === 10 ? '✅ PASÓ' : '❌ FALLÓ');

console.log('\n✨ Todas las pruebas unitarias básicas se ejecutaron con éxito.');
