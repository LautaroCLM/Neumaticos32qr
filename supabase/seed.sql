-- ==============================================================================
-- Seed Data: "Neumáticos el 32"
-- DATOS EXCLUSIVOS DE EJEMPLO / DEMOSTRACIÓN LOCAL
-- ADVERTENCIA: La dirección, horarios, sucursales y patentes son ficticios.
-- Los datos definitivos y reales del taller se configuran desde el Panel Admin.
-- ==============================================================================

-- 1. Taller principal (Datos de demostración inicial)
INSERT INTO public.shops (
    id,
    nombre,
    slug,
    logo_url,
    color_primario,
    color_fondo,
    telefono,
    whatsapp,
    direccion,
    horarios,
    ocultar_precios,
    ticket_config
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Neumáticos el 32 (Ejemplo)',
    'el-32',
    NULL,
    '#f59e0b',
    '#09090b',
    '011 4253-3232',
    '+5491132003200',
    'Av. Mitre 3200, Quilmes, Prov. de Buenos Aires (Dirección de Ejemplo)',
    'Lunes a Viernes de 8:00 a 18:30 hs | Sábados de 8:00 a 13:00 hs (Horario de Ejemplo)',
    FALSE,
    '{"titulo_ticket": "Ticket de Servicio (Demo)", "texto_pie": "", "etiqueta_proximo_service": "Próximo control recomendado", "colores_personalizados": {}}'::jsonb
) ON CONFLICT (id) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    ticket_config = EXCLUDED.ticket_config;

-- 2. Vehículos de demostración
-- Vehículo 1: Volkswagen Amarok (Patente de Ejemplo: AE123CD)
INSERT INTO public.vehicles (
    id,
    shop_id,
    public_token,
    patente,
    marca,
    modelo,
    anio,
    cliente_nombre,
    cliente_telefono,
    ocultar_precios
) VALUES (
    '11111111-1111-4111-a111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'demo-token-amarok-ae123cd-el32',
    'AE123CD',
    'Volkswagen',
    'Amarok 2.0 TDI Highline 4x4 (Demo)',
    2022,
    'Martín Gómez (Ficticio)',
    '11 5566-7788',
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Vehículo 2: Toyota Hilux (Patente de Ejemplo: AC456XY)
INSERT INTO public.vehicles (
    id,
    shop_id,
    public_token,
    patente,
    marca,
    modelo,
    anio,
    cliente_nombre,
    cliente_telefono,
    ocultar_precios
) VALUES (
    '22222222-2222-4222-a222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'demo-token-hilux-ac456xy-el32',
    'AC456XY',
    'Toyota',
    'Hilux 2.8 SRV 4x2 (Demo)',
    2019,
    'Claudio Fernández (Ficticio)',
    '11 4433-2211',
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Fijar tokens determinísticos para URLs de prueba en entorno local
-- (El trigger BEFORE INSERT genera tokens aleatorios, aquí se restauran los fijos usando app.allow_token_mutation)
SELECT set_config('app.allow_token_mutation', 'on', true);

UPDATE public.vehicles
SET public_token = 'demo-token-amarok-ae123cd-el32'
WHERE id = '11111111-1111-4111-a111-111111111111';

UPDATE public.vehicles
SET public_token = 'demo-token-hilux-ac456xy-el32'
WHERE id = '22222222-2222-4222-a222-222222222222';

SELECT set_config('app.allow_token_mutation', 'off', true);

-- 3. Historial de Servicios de Demostración para Vehículo 1 (Amarok AE123CD)
INSERT INTO public.services (
    id,
    vehicle_id,
    shop_id,
    fecha_hora,
    kilometraje,
    tipo,
    descripcion,
    productos,
    items,
    total_manual,
    precio,
    proximo_servicio_km,
    proximo_servicio_fecha,
    sucursal,
    notas_internas,
    notas_cliente,
    visibilidad,
    anulado
) VALUES (
    'a1111111-1111-4111-a111-111111111111',
    '11111111-1111-4111-a111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '7 days',
    68500,
    'neumaticos',
    'Reemplazo de tren delantero y trasero completo de neumáticos. Montaje, válvulas nuevas de alta presión y alineación láser computarizada en 3D con balanceo dinámico en las 4 ruedas.',
    '4x Bridgestone Dueler A/T 265/65 R17 112T, 4x Válvulas cromadas TR413',
    '[{"concepto": "Neumático Bridgestone Dueler 265/65 R17", "cantidad": 4, "precio_unitario": 240000}, {"concepto": "Válvulas cromadas TR413", "cantidad": 4, "precio_unitario": 5000}]'::jsonb,
    980000.00,
    980000.00,
    78500,
    (CURRENT_DATE + INTERVAL '6 months')::DATE,
    'Sucursal Centro (Ejemplo)',
    'Cliente solicitó revisar presión a los 500 km (Nota Interna Confidencial)',
    'Alineación y balanceo con garantía de 3 meses en nuestras sucursales.',
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": true, "mostrar_sucursal": true, "mostrar_notas": true}'::jsonb,
    FALSE
) ON CONFLICT (id) DO NOTHING;
