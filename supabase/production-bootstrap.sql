-- ==============================================================================
-- BOOTSTRAP DE PRODUCCIÓN: "Neumáticos el 32"
-- ==============================================================================
-- Este archivo se ejecuta UNA SOLA VEZ en el proyecto de producción de Supabase
-- (a través del SQL Editor del dashboard de Supabase) inmediatamente después
-- de haber aplicado las migraciones con `supabase db push`.
--
-- CONTIENE:
-- 1. Registro inicial del taller principal (campos vacíos listos para completar
--    desde la pantalla de Configuración en /admin/settings).
-- 2. Plantillas de servicios estándar para agilizar la carga del personal.
--
-- NO CONTIENE:
-- - Vehículos de prueba ni demostración
-- - Tokens demo
-- - Registros de servicios
-- - Usuarios de prueba (el primer administrador se crea siguiendo la guía del README)
-- ==============================================================================

-- 1. Registro inicial del Taller Principal
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
    'Neumáticos el 32',
    'el-32',
    '/logo.webp',
    '#D31A24',
    '#0A0B0D',
    'COMPLETAR EN CONFIGURACIÓN',
    'COMPLETAR EN CONFIGURACIÓN',
    'COMPLETAR EN CONFIGURACIÓN',
    'COMPLETAR EN CONFIGURACIÓN',
    FALSE,
    '{
        "titulo_ticket": "Último Servicio Realizado",
        "texto_pie": "",
        "etiqueta_proximo_service": "Próximo control recomendado",
        "colores_personalizados": {}
    }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- 2. Plantillas de Servicios Estándar (Activas)
INSERT INTO public.service_templates (
    shop_id,
    nombre,
    tipo,
    descripcion_base,
    items_base,
    campos_extra_base,
    visibilidad_base,
    activo
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Cambio de Neumáticos y Balanceo',
    'neumaticos',
    'Desarme, montaje de cubiertas nuevas, reemplazo de válvulas y balanceo dinámico computarizado.',
    '[{"concepto": "Neumático nuevo", "cantidad": 2, "precio_unitario": 0}, {"concepto": "Válvula de goma", "cantidad": 2, "precio_unitario": 0}, {"concepto": "Balanceo dinámico", "cantidad": 2, "precio_unitario": 0}]'::jsonb,
    '[{"titulo": "Medida y Marca", "valor": ""}, {"titulo": "DOT de Cubiertas", "valor": ""}]'::jsonb,
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": true, "mostrar_sucursal": true, "mostrar_notas": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    'Alineación 3D y Balanceo en 4 Ruedas',
    'alineacion_balanceo',
    'Control y calibración de convergencia, comba y avance con alineadora 3D láser. Balanceo en tren delantero y trasero.',
    '[{"concepto": "Alineación láser 3D", "cantidad": 1, "precio_unitario": 0}, {"concepto": "Balanceo por rueda", "cantidad": 4, "precio_unitario": 0}]'::jsonb,
    '[{"titulo": "Estado Tren Delantero", "valor": ""}]'::jsonb,
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": true, "mostrar_sucursal": true, "mostrar_notas": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    'Reparación de Neumático / Emparche',
    'neumaticos',
    'Desmonte de cubierta, inspección interna de carcasa, vulcanizado/parche en frío y calibración de inflado con nitrógeno.',
    '[{"concepto": "Parche en frío / Reparación", "cantidad": 1, "precio_unitario": 0}]'::jsonb,
    '[{"titulo": "Ubicación de Rueda", "valor": ""}]'::jsonb,
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": false, "mostrar_sucursal": true, "mostrar_notas": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    'Rotación, Alineación y Balanceo Preventivo',
    'alineacion_balanceo',
    'Rotación de tren delantero a trasero en cruz/paralelo, balanceo de los 4 conjuntos y alineación de dirección.',
    '[{"concepto": "Servicio de rotación y balanceo (4)", "cantidad": 1, "precio_unitario": 0}, {"concepto": "Alineación de tren delantero", "cantidad": 1, "precio_unitario": 0}]'::jsonb,
    '[]'::jsonb,
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": true, "mostrar_sucursal": true, "mostrar_notas": false}'::jsonb,
    TRUE
),
(
    '00000000-0000-0000-0000-000000000001',
    'Mecánica Ligera / Frenos y Pastillas',
    'frenos',
    'Inspección y reemplazo de pastillas de freno, control de espesor de discos y purgado de circuito hidráulico.',
    '[{"concepto": "Juego de pastillas de freno", "cantidad": 1, "precio_unitario": 0}, {"concepto": "Mano de obra frenos", "cantidad": 1, "precio_unitario": 0}]'::jsonb,
    '[{"titulo": "Espesor de Discos", "valor": ""}]'::jsonb,
    '{"mostrar_km": true, "mostrar_productos": true, "mostrar_precio": true, "mostrar_proximo_servicio": true, "mostrar_sucursal": true, "mostrar_notas": false}'::jsonb,
    TRUE
)
ON CONFLICT (shop_id, nombre) DO NOTHING;
