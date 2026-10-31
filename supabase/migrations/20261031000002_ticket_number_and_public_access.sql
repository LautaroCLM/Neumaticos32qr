-- ==============================================================================
-- Migración: Número de Ticket y Acceso Público
-- - Numeración única de tickets.
-- - La vista pública respeta los cambios de dueño y permite ocultar campos extra.
-- - La búsqueda por patente deja de mostrar datos: pide patente y últimos 4 dígitos
--   del teléfono del propietario, y solo entonces entrega el enlace al historial.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Número de ticket
-- ------------------------------------------------------------------------------
ALTER TABLE public.services
ADD COLUMN numero BIGINT GENERATED ALWAYS AS IDENTITY;

ALTER TABLE public.services
ADD CONSTRAINT uq_services_numero UNIQUE (numero);

-- ------------------------------------------------------------------------------
-- 2. Visibilidad de campos extra
-- Los tickets ya cargados, sin esta clave, los siguen mostrando.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_visibilidad_jsonb(v JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
    SELECT jsonb_typeof(v) = 'object'
      AND (NOT v ? 'mostrar_km' OR jsonb_typeof(v->'mostrar_km') = 'boolean')
      AND (NOT v ? 'mostrar_productos' OR jsonb_typeof(v->'mostrar_productos') = 'boolean')
      AND (NOT v ? 'mostrar_precio' OR jsonb_typeof(v->'mostrar_precio') = 'boolean')
      AND (NOT v ? 'mostrar_proximo_servicio' OR jsonb_typeof(v->'mostrar_proximo_servicio') = 'boolean')
      AND (NOT v ? 'mostrar_sucursal' OR jsonb_typeof(v->'mostrar_sucursal') = 'boolean')
      AND (NOT v ? 'mostrar_notas' OR jsonb_typeof(v->'mostrar_notas') = 'boolean')
      AND (NOT v ? 'mostrar_campos_extra' OR jsonb_typeof(v->'mostrar_campos_extra') = 'boolean');
$$;

ALTER TABLE public.services
ALTER COLUMN visibilidad SET DEFAULT jsonb_build_object(
    'mostrar_km', true,
    'mostrar_productos', true,
    'mostrar_precio', true,
    'mostrar_proximo_servicio', true,
    'mostrar_sucursal', true,
    'mostrar_notas', false,
    'mostrar_campos_extra', true
);

ALTER TABLE public.service_templates
ALTER COLUMN visibilidad_base SET DEFAULT jsonb_build_object(
    'mostrar_km', true,
    'mostrar_productos', true,
    'mostrar_precio', true,
    'mostrar_proximo_servicio', true,
    'mostrar_sucursal', true,
    'mostrar_notas', false,
    'mostrar_campos_extra', true
);

-- ------------------------------------------------------------------------------
-- 3. Función: get_vehicle_by_token
-- Tras un cambio de dueño, los tickets anteriores conservan el detalle técnico
-- pero no muestran precios ni notas dirigidas al dueño anterior.
-- ------------------------------------------------------------------------------
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
    v_inicio_propietario TIMESTAMPTZ;
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

    -- Fecha del último cambio de dueño; NULL si el vehículo nunca lo tuvo
    SELECT MAX(o.hasta) INTO v_inicio_propietario
    FROM public.vehicle_owners o
    WHERE o.vehicle_id = v_vehicle.id;

    -- 3. Historial de servicios: Cast seguro de visibilidad y purga estricta en servidor
    SELECT COALESCE(jsonb_agg(
        jsonb_strip_nulls(
            jsonb_build_object(
                'id', s.id,
                'numero', s.numero,
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
                    WHEN v_effective_hide_prices
                         OR s.fecha_hora < v_inicio_propietario
                         OR (jsonb_typeof(s.visibilidad->'mostrar_precio') = 'boolean' AND (s.visibilidad->>'mostrar_precio')::boolean = false)
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
                    WHEN v_effective_hide_prices
                         OR s.fecha_hora < v_inicio_propietario
                         OR (jsonb_typeof(s.visibilidad->'mostrar_precio') = 'boolean' AND (s.visibilidad->>'mostrar_precio')::boolean = false)
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
                    WHEN s.fecha_hora >= COALESCE(v_inicio_propietario, '-infinity'::timestamptz)
                         AND jsonb_typeof(s.visibilidad->'mostrar_notas') = 'boolean'
                         AND (s.visibilidad->>'mostrar_notas')::boolean = true
                    THEN s.notas_cliente
                    ELSE NULL
                END,

                -- Campos extra personalizados
                'campos_extra',
                CASE
                    WHEN (jsonb_typeof(s.visibilidad->'mostrar_campos_extra') = 'boolean' AND (s.visibilidad->>'mostrar_campos_extra')::boolean = true)
                         OR (s.visibilidad IS NULL OR NOT s.visibilidad ? 'mostrar_campos_extra')
                    THEN s.campos_extra
                    ELSE NULL
                END
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

-- ------------------------------------------------------------------------------
-- 4. Función: request_vehicle_access (reemplaza a search_vehicle_public)
-- No revela si la patente existe: cualquier dato incorrecto da la misma respuesta.
-- Bloqueos: 20 intentos por minuto por IP; 5 fallos en 15 minutos o 20 en 24 horas por
-- patente, para que no se puedan probar las 10.000 combinaciones de 4 dígitos.
-- SOLO invocable por service_role desde /api/vehicle-access.
-- ------------------------------------------------------------------------------
DROP FUNCTION public.search_vehicle_public(TEXT, TEXT);
DROP FUNCTION public.check_and_record_rate_limit(TEXT, TEXT, BOOLEAN);

CREATE OR REPLACE FUNCTION public.request_vehicle_access(
    p_patente TEXT,
    p_ultimos_digitos TEXT,
    p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_patente TEXT;
    v_token TEXT;
    v_intentos_ip INT;
    v_fallos_15m INT;
    v_fallos_24h INT;
BEGIN
    v_patente := UPPER(REGEXP_REPLACE(COALESCE(p_patente, ''), '[^a-zA-Z0-9]', '', 'g'));

    IF v_patente = '' OR COALESCE(p_ultimos_digitos, '') !~ '^[0-9]{4}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Revisá la patente y los últimos 4 dígitos del teléfono.');
    END IF;

    SELECT COUNT(*) INTO v_intentos_ip
    FROM public.rate_limit_attempts
    WHERE ip_address = p_ip
      AND attempted_at > (NOW() - INTERVAL '60 seconds');

    IF v_intentos_ip >= 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'blocked', true,
            'error', 'Demasiados intentos desde tu conexión. Aguardá 1 minuto.'
        );
    END IF;

    SELECT COUNT(*) FILTER (WHERE attempted_at > (NOW() - INTERVAL '15 minutes')),
           COUNT(*)
    INTO v_fallos_15m, v_fallos_24h
    FROM public.rate_limit_attempts
    WHERE target_key = v_patente
      AND success = FALSE
      AND attempted_at > (NOW() - INTERVAL '24 hours');

    IF v_fallos_15m >= 5 OR v_fallos_24h >= 20 THEN
        RETURN jsonb_build_object(
            'success', false,
            'blocked', true,
            'error', 'Demasiados intentos para esta patente. Probá más tarde o pedí el enlace en el taller.'
        );
    END IF;

    SELECT v.public_token INTO v_token
    FROM public.vehicles v
    JOIN public.vehicle_owners o ON o.vehicle_id = v.id AND o.hasta IS NULL
    JOIN public.customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
    WHERE v.patente = v_patente
      AND v.deleted_at IS NULL
      AND v.token_revoked_at IS NULL
      AND right(c.telefono, 4) = p_ultimos_digitos
    LIMIT 1;

    INSERT INTO public.rate_limit_attempts (ip_address, target_type, target_key, success, attempted_at)
    VALUES (p_ip, 'vehicle_access', v_patente, v_token IS NOT NULL, NOW());

    IF (RANDOM() < 0.05) THEN
        PERFORM public.cleanup_old_rate_limits();
    END IF;

    IF v_token IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Los datos no coinciden con ningún vehículo registrado.');
    END IF;

    RETURN jsonb_build_object('success', true, 'token', v_token);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Función: get_public_shop (Datos de contacto para el pie de la web pública)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_shop()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT jsonb_build_object(
        'nombre', s.nombre,
        'whatsapp', s.whatsapp,
        'direccion', s.direccion,
        'horarios', s.horarios
    )
    FROM public.shops s
    WHERE s.deleted_at IS NULL
    ORDER BY s.created_at ASC
    LIMIT 1;
$$;

-- ------------------------------------------------------------------------------
-- 6. Datos del taller opcionales y sin valores inventados por defecto
-- ------------------------------------------------------------------------------
ALTER TABLE public.shops
ALTER COLUMN whatsapp DROP NOT NULL,
ALTER COLUMN whatsapp DROP DEFAULT,
ALTER COLUMN direccion DROP NOT NULL,
ALTER COLUMN direccion DROP DEFAULT,
ALTER COLUMN horarios DROP NOT NULL,
ALTER COLUMN horarios DROP DEFAULT;

-- ------------------------------------------------------------------------------
-- 7. Plantillas sin nombres repetidos dentro de un taller
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX uq_service_templates_shop_nombre
ON public.service_templates(shop_id, nombre);
