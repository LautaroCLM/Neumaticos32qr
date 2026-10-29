/**
 * Utilidades para formateo con zona horaria Argentina (America/Argentina/Buenos_Aires),
 * normalización de patentes vehiculares y moneda argentina.
 */

export const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

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

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  if (options?.short) {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: ARGENTINA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  const formatter = new Intl.DateTimeFormat('es-AR', {
    timeZone: ARGENTINA_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(options?.includeTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  });

  const formatted = formatter.format(date);
  return options?.includeTime ? `${formatted} hs` : formatted;
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
