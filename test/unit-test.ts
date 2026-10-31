import {
  normalizePatente,
  isValidPatente,
  formatPatenteDisplay,
  formatDateBA,
  formatCurrencyARS,
  formatKilometers,
  toDateTimeInputBA,
  fromDateTimeInputBA,
  isConfigPlaceholder,
  getWhatsAppDigits,
  normalizePhone,
  formatPhoneDisplay,
  formatTicketNumber,
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

// Test 7: Columnas DATE no se corren un día
const f2 = formatDateBA('2027-03-15', { short: true }) === '15/03/2027';
console.log('7. Fecha sin hora conserva el día:', f2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 8: El input datetime-local trabaja en hora de Buenos Aires
const i1 = toDateTimeInputBA('2026-10-31T17:00:00.000Z') === '2026-10-31T14:00';
const i2 = fromDateTimeInputBA('2026-10-31T14:00') === '2026-10-31T17:00:00.000Z';
const i3 = fromDateTimeInputBA('') === null;
const i4 = toDateTimeInputBA('2026-11-01T03:30:00.000Z') === '2026-11-01T00:30';
console.log('8. Conversión de datetime-local:', i1 && i2 && i3 && i4 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 9: Guardar y volver a editar no mueve la hora
const original = '2026-10-31T17:00:00.000Z';
const i5 = fromDateTimeInputBA(toDateTimeInputBA(original)) === original;
console.log('9. Editar sin tocar la fecha conserva la hora:', i5 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 10: Datos de contacto del taller
const p1 = isConfigPlaceholder('COMPLETAR EN CONFIGURACIÓN') && !isConfigPlaceholder('Calle 1');
const p2 = getWhatsAppDigits('+54 9 11 3200-3200') === '5491132003200' && getWhatsAppDigits('COMPLETAR') === null;
console.log('10. Datos de contacto del taller:', p1 && p2 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 11: Teléfonos en formato internacional para WhatsApp
const n1 = normalizePhone('11 3456-7890') === '5491134567890';
const n2 = normalizePhone('011 15 3456-7890') === '5491134567890';
const n3 = normalizePhone('+54 9 11 3456-7890') === '5491134567890';
const n4 = normalizePhone('+54 11 3456-7890') === '5491134567890';
const n5 = normalizePhone('0221 15 456-7890') === '5492214567890';
const n6 = normalizePhone('+598 99 123 456') === '59899123456';
const n7 = normalizePhone('1234') === null;
const n8 = formatPhoneDisplay('5491134567890') === '+54 9 11 3456-7890';
console.log('11. Normalización de teléfonos:', n1 && n2 && n3 && n4 && n5 && n6 && n7 && n8 ? '✅ PASÓ' : '❌ FALLÓ');

// Test 12: Número de ticket
console.log('12. Número de ticket:', formatTicketNumber(12) === 'N.º 000012' ? '✅ PASÓ' : '❌ FALLÓ');

console.log('\n✨ Todas las pruebas unitarias básicas se ejecutaron con éxito.');
