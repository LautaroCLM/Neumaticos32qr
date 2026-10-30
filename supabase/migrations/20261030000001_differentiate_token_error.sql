-- ==============================================================================
-- Migración: Diferenciación de errores en get_vehicle_by_token
-- Permite a la vista pública distinguir claramente entre token inexistente y token revocado.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_vehicle_by_token(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_vehicle RECORD;
    v_shop RECORD;
    v_services JSONB;
    v_effective_hide_prices BOOLEAN;
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de acceso inválido o incompleto');
    END IF;

    -- 1. Buscar vehículo por token (incluso si está revocado para poder diferenciar el motivo)
    SELECT v.id, v.shop_id, v.public_token, v.patente, v.marca, v.modelo, v.anio, 
           v.ocultar_precios AS vehicle_hide_prices, v.token_revoked_at
    INTO v_vehicle
    FROM public.vehicles v
    WHERE v.public_token = p_token
      AND v.deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'El enlace del vehículo no existe.');
    END IF;

    IF v_vehicle.token_revoked_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'El enlace del vehículo ha sido revocado por el taller.');
    END IF;

    -- 2. Datos del taller y configuración del ticket
    SELECT s.id, s.nombre, s.logo_url, s.color_primario, s.color_fondo, s.telefono, 
           s.whatsapp, s.direccion, s.horarios, s.ticket_config,
           s.ocultar_precios AS shop_hide_prices
    INTO v_shop
    FROM public.shops s
    WHERE s.id = v_vehicle.shop_id
      AND s.deleted_at IS NULL;

    v_effective_hide_prices := COALESCE(v_vehicle.vehicle_hide_prices, v_shop.shop_hide_prices, FALSE);

    -- 3. Historial de servicios: Cast seguro de visibilidad y purga estricta en servidor
    SELECT COALESCE(jsonb_agg(
        jsonb_strip_nulls(
            jsonb_build_object(
                'id', s.id,
                'fecha_hora', s.fecha_hora,
                'tipo', s.tipo,
                'descripcion', s.descripcion,
                'editado', s.editado,

                -- Kilometraje: seguro ante tipos corruptos
                'kilometraje', 
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_km') = 'boolean' AND (s.visibilidad->>'mostrar_km')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_km')
                    THEN s.kilometraje 
                    ELSE NULL 
                END,

                -- Sucursal
                'sucursal', 
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_sucursal') = 'boolean' AND (s.visibilidad->>'mostrar_sucursal')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_sucursal')
                    THEN s.sucursal 
                    ELSE NULL 
                END,

                -- Productos resumen
                'productos', 
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_productos') = 'boolean' AND (s.visibilidad->>'mostrar_productos')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_productos')
                    THEN s.productos 
                    ELSE NULL 
                END,

                -- Ítems desglosados (si precio está oculto, purga los importes unitarios)
                'items',
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_productos') = 'boolean' AND (s.visibilidad->>'mostrar_productos')::boolean = false)
                    THEN NULL
                    WHEN v_effective_hide_prices OR (jsonb_typeof(s.visibilidad->'mostrar_precio') = 'boolean' AND (s.visibilidad->>'mostrar_precio')::boolean = false)
                    THEN (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'concepto', it->>'concepto',
                                'cantidad', it->'cantidad'
                            )
                        ) FROM jsonb_array_elements(s.items) it
                    )
                    ELSE s.items
                END,

                -- Precio Final
                'precio',
                CASE 
                    WHEN v_effective_hide_prices OR (jsonb_typeof(s.visibilidad->'mostrar_precio') = 'boolean' AND (s.visibilidad->>'mostrar_precio')::boolean = false)
                    THEN NULL
                    ELSE s.precio
                END,

                -- Próximo servicio
                'proximo_servicio_km',
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_proximo_servicio') = 'boolean' AND (s.visibilidad->>'mostrar_proximo_servicio')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_proximo_servicio')
                    THEN s.proximo_servicio_km
                    ELSE NULL
                END,

                'proximo_servicio_fecha',
                CASE 
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_proximo_servicio') = 'boolean' AND (s.visibilidad->>'mostrar_proximo_servicio')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_proximo_servicio')
                    THEN s.proximo_servicio_fecha
                    ELSE NULL
                END,

                -- NOTAS: Solo notas_cliente si mostrar_notas = true. notas_internas NUNCA viaja.
                'notas_cliente',
                CASE 
                    WHEN jsonb_typeof(s.visibilidad->'mostrar_notas') = 'boolean' AND (s.visibilidad->>'mostrar_notas')::boolean = true
                    THEN s.notas_cliente
                    ELSE NULL
                END,

                -- Campos extra personalizados
                'campos_extra', s.campos_extra
            )
        ) ORDER BY s.fecha_hora DESC
    ), '[]'::jsonb)
    INTO v_services
    FROM public.services s
    WHERE s.vehicle_id = v_vehicle.id
      AND s.anulado = FALSE
      AND s.deleted_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'hide_prices', v_effective_hide_prices,
        'vehicle', jsonb_build_object(
            'patente', v_vehicle.patente,
            'marca', v_vehicle.marca,
            'modelo', v_vehicle.modelo,
            'anio', v_vehicle.anio,
            'token', v_vehicle.public_token
        ),
        'shop', jsonb_build_object(
            'nombre', v_shop.nombre,
            'logo_url', v_shop.logo_url,
            'color_primario', v_shop.color_primario,
            'color_fondo', v_shop.color_fondo,
            'telefono', v_shop.telefono,
            'whatsapp', v_shop.whatsapp,
            'direccion', v_shop.direccion,
            'horarios', v_shop.horarios,
            'ticket_config', v_shop.ticket_config
        ),
        'services', v_services
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vehicle_by_token(TEXT) TO anon, authenticated, service_role;
