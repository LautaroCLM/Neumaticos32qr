/**
 * Utilidades para formateo con zona horaria Argentina (America/Argentina/Buenos_Aires),
 * normalización de patentes vehiculares y moneda argentina.
 */

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

// Argentina no aplica horario de verano: el desfase respecto de UTC es fijo.
const ARGENTINA_UTC_OFFSET = '-03:00';

/**
 * Normaliza una patente: quita espacios, guiones y caracteres no alfanuméricos, convirtiendo a mayúsculas.
 * Ej: "ae 123 cd" -> "AE123CD", "abc-123" -> "ABC123"
 */
export function normalizePatente(patente: string): string {
  if (!patente) return '';
  return patente.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().trim();
}

/**
 * Valida si una patente tiene un formato argentino válido (Mercosur o tradicional)
 * Mercosur autos: 2 letras, 3 números, 2 letras (AA 000 AA)
 * Mercosur motos: 1 letra, 3 números, 3 letras (A 000 AAA)
 * Tradicional: 3 letras, 3 números (AAA 000)
 */
export function isValidPatente(patente: string): boolean {
  const clean = normalizePatente(patente);
  // Mercosur autos (7 caracteres: 2L-3N-2L)
  const isMercosurAuto = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean);
  // Tradicional (6 caracteres: 3L-3N)
  const isTradicional = /^[A-Z]{3}[0-9]{3}$/.test(clean);
  // Mercosur moto (7 caracteres: 1L-3N-3L)
  const isMercosurMoto = /^[A-Z]{1}[0-9]{3}[A-Z]{3}$/.test(clean);

  return isMercosurAuto || isTradicional || isMercosurMoto;
}

/**
 * Formatea visualmente una patente limpia para presentarla en pantalla:
 * 'AE123CD' -> 'AE 123 CD'
 * 'ABC123'  -> 'ABC 123'
 */
export function formatPatenteDisplay(patente: string): string {
  const clean = normalizePatente(patente);
  if (/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(clean)) {
    return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 7)}`;
  }
  if (/^[A-Z]{3}[0-9]{3}$/.test(clean)) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`;
  }
  if (/^[A-Z]{1}[0-9]{3}[A-Z]{3}$/.test(clean)) {
    return `${clean.slice(0, 1)} ${clean.slice(1, 4)} ${clean.slice(4, 7)}`;
  }
  return clean;
}

/**
 * Formatea una fecha/hora siempre en la zona horaria de Buenos Aires
 */
export function formatDateBA(
  dateInput: string | Date | null | undefined,
  options?: { includeTime?: boolean; short?: boolean }
): string {
  if (!dateInput) return '—';

  // Las columnas DATE llegan como 'YYYY-MM-DD'; new Date() las leería como medianoche UTC
  // y en Buenos Aires se mostrarían un día antes.
  const isDateOnly = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput);
  const date =
    typeof dateInput === 'string'
      ? new Date(isDateOnly ? `${dateInput}T12:00:00${ARGENTINA_UTC_OFFSET}` : dateInput)
      : dateInput;
  if (isNaN(date.getTime())) return '—';

  if (options?.short) {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: ARGENTINA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  // Se arma a mano porque el servidor y el navegador unen fecha y hora distinto (", " o " a las "),
  // y esa diferencia rompe la hidratación de React.
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  const formatted = `${get('day')} de ${get('month')} de ${get('year')}`;
  return options?.includeTime ? `${formatted}, ${get('hour')}:${get('minute')} hs` : formatted;
}

/**
 * Convierte una fecha al valor de un input datetime-local, en hora de Buenos Aires.
 * Ej: '2026-10-31T17:00:00Z' -> '2026-10-31T14:00'
 */
export function toDateTimeInputBA(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * Interpreta el valor de un input datetime-local como hora de Buenos Aires y lo pasa a ISO (UTC).
 * Devuelve null si el campo está vacío o incompleto.
 * Ej: '2026-10-31T14:00' -> '2026-10-31T17:00:00.000Z'
 */
export function fromDateTimeInputBA(value: string): string | null {
  // Se valida el formato antes: new Date() acepta textos incompletos y los convierte en fechas inventadas.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;
  const date = new Date(`${value.slice(0, 16)}:00${ARGENTINA_UTC_OFFSET}`);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Indica si un dato del taller está vacío o sigue con el texto "COMPLETAR" del bootstrap.
 */
export function isConfigPlaceholder(value?: string | null): boolean {
  return !value || !value.trim() || value.toUpperCase().includes('COMPLETAR');
}

/**
 * Devuelve los dígitos de un número de WhatsApp o null si no es un número utilizable (E.164: 8 a 15 dígitos).
 */
export function getWhatsAppDigits(value?: string | null): string | null {
  if (isConfigPlaceholder(value)) return null;
  const digits = value!.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * Normaliza un teléfono al formato internacional en dígitos que usa WhatsApp.
 * Los números argentinos se completan con 549 y pierden el 0 y el 15.
 * Ej: '011 15 3456-7890' -> '5491134567890'. Devuelve null si no es un número válido.
 */
export function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  let digits = trimmed.replace(/\D/g, '');

  // Número con prefijo internacional de otro país: se conserva tal cual
  if (trimmed.startsWith('+') && !digits.startsWith('54')) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }

  digits = digits.replace(/^54/, '').replace(/^9/, '').replace(/^0/, '');

  if (digits.length === 12) {
    // El 15 va después del código de área, que tiene de 2 a 4 dígitos
    for (const areaLength of [2, 3, 4]) {
      if (digits.slice(areaLength, areaLength + 2) === '15') {
        digits = digits.slice(0, areaLength) + digits.slice(areaLength + 2);
        break;
      }
    }
  }

  return digits.length === 10 ? `549${digits}` : null;
}

/**
 * Formatea un teléfono normalizado para mostrarlo: '5491134567890' -> '+54 9 11 3456-7890'
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return '—';
  if (/^549\d{10}$/.test(phone)) {
    const national = phone.slice(3);
    return `+54 9 ${national.slice(0, 2)} ${national.slice(2, 6)}-${national.slice(6)}`;
  }
  return `+${phone}`;
}

/**
 * Formatea el número de ticket: 12 -> 'N.º 000012'
 */
export function formatTicketNumber(numero: number): string {
  return `N.º ${String(numero).padStart(6, '0')}`;
}

/**
 * Formatea montos en Pesos Argentinos (ARS)
 */
export function formatCurrencyARS(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea kilometrajes: 68500 -> '68.500 km'
 */
export function formatKilometers(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${new Intl.NumberFormat('es-AR').format(km)} km`;
}
