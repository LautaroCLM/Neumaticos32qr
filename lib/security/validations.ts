import { z } from 'zod';
import { isValidPatente, normalizePatente, normalizePhone } from '../utils/formatters';

const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .optional()
  .nullable()
  .transform((val, ctx) => {
    if (!val) return null;
    const normalized = normalizePhone(val);
    if (!normalized) {
      ctx.addIssue({
        code: 'custom',
        message: 'Teléfono inválido (ej. 11 3456-7890, o con + si es de otro país).',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const serviceTypeSchema = z.enum([
  'neumaticos',
  'alineacion_balanceo',
  'aceite_filtros',
  'frenos',
  'suspension',
  'mecanica_general',
  'otro',
]);

export const serviceItemSchema = z.object({
  concepto: z.string().trim().min(1, 'El concepto es obligatorio').max(150, 'Máximo 150 caracteres'),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0').max(9999, 'Cantidad inválida'),
  precio_unitario: z.number().min(0, 'El precio no puede ser negativo').max(999999999, 'Importe fuera de rango'),
});

export const serviceExtraFieldSchema = z.object({
  titulo: z.string().trim().min(1, 'Título obligatorio').max(50, 'Máximo 50 caracteres'),
  valor: z.string().trim().min(1, 'Valor obligatorio').max(150, 'Máximo 150 caracteres'),
});

export const serviceVisibilitySchema = z.object({
  mostrar_km: z.boolean().default(true),
  mostrar_productos: z.boolean().default(true),
  mostrar_precio: z.boolean().default(true),
  mostrar_proximo_servicio: z.boolean().default(true),
  mostrar_sucursal: z.boolean().default(true),
  mostrar_notas: z.boolean().default(false), // Unificado en false por defecto
  mostrar_campos_extra: z.boolean().default(true),
});

export const serviceFormSchema = z.object({
  vehicle_id: z.string().uuid('ID de vehículo inválido'),
  fecha_hora: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)),
  kilometraje: z.number().int().min(0, 'El kilometraje no puede ser negativo').max(3000000),
  tipo: serviceTypeSchema,
  descripcion: z.string().trim().min(3, 'La descripción debe tener al menos 3 caracteres').max(2000, 'Máximo 2000 caracteres'),
  productos: z.string().trim().max(1000).optional().nullable(),
  items: z.array(serviceItemSchema).max(30, 'Máximo 30 ítems por servicio').default([]),
  total_manual: z.number().min(0, 'El total no puede ser negativo').optional().nullable(),
  proximo_servicio_km: z.number().int().min(0).max(3000000).optional().nullable(),
  proximo_servicio_fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  sucursal: z.string().trim().min(2).max(100).default('Casa Central'),
  notas_internas: z.string().trim().max(2000).optional().nullable(), // Confidencial de taller
  notas_cliente: z.string().trim().max(1000).optional().nullable(),  // Para el cliente
  campos_extra: z.array(serviceExtraFieldSchema).max(10, 'Máximo 10 campos personalizados').default([]),
  visibilidad: serviceVisibilitySchema.default({
    mostrar_km: true,
    mostrar_productos: true,
    mostrar_precio: true,
    mostrar_proximo_servicio: true,
    mostrar_sucursal: true,
    mostrar_notas: false,
    mostrar_campos_extra: true,
  }),
});

export const vehicleCreateSchema = z.object({
  patente: z.string().trim().refine((val) => isValidPatente(normalizePatente(val)), {
    message: 'Patente inválida (formato argentino Mercosur o tradicional)',
  }),
  marca: z.string().trim().min(2, 'Marca requerida').max(50),
  modelo: z.string().trim().min(1, 'Modelo requerido').max(50),
  anio: z.number().int().min(1950).max(new Date().getFullYear() + 2).optional().nullable(),
  cliente_nombre: z.string().trim().max(100).optional().nullable(),
  cliente_telefono: phoneSchema,
  ocultar_precios: z.boolean().optional().nullable(),
});

export const vehicleUpdateSchema = vehicleCreateSchema.omit({
  cliente_nombre: true,
  cliente_telefono: true,
});

export const customerSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  telefono: phoneSchema,
  email: z.union([z.string().trim().email('Email inválido').max(254), z.literal('')]).optional().nullable(),
  notas_internas: z.string().trim().max(2000).optional().nullable(),
});

export type ServiceFormValues = z.infer<typeof serviceFormSchema>;
export type VehicleCreateValues = z.input<typeof vehicleCreateSchema>;
export type VehicleUpdateValues = z.input<typeof vehicleUpdateSchema>;
export type CustomerValues = z.input<typeof customerSchema>;
