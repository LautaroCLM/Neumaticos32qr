-- ==============================================================================
-- Migración: Personalización de Tickets, Plantillas, Auditoría y Visibilidad
-- Archivo: 20261028000001_ticket_customization.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Ampliación de la tabla `shops`
-- texto_pie arranca vacío por defecto; lo define el taller desde Configuración.
-- ------------------------------------------------------------------------------
ALTER TABLE public.shops 
ADD COLUMN IF NOT EXISTS ticket_config JSONB NOT NULL DEFAULT jsonb_build_object(
    'titulo_ticket', 'Ticket de Servicio',
    'texto_pie', '',
    'etiqueta_proximo_service', 'Próximo control recomendado',
    'colores_personalizados', jsonb_build_object()
);

-- ------------------------------------------------------------------------------
-- 2. Función de Validación de Visibilidad (Cada clave presente DEBE ser boolean)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_visibilidad_jsonb(v JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT jsonb_typeof(v) = 'object'
      AND (NOT v ? 'mostrar_km' OR jsonb_typeof(v->'mostrar_km') = 'boolean')
      AND (NOT v ? 'mostrar_productos' OR jsonb_typeof(v->'mostrar_productos') = 'boolean')
      AND (NOT v ? 'mostrar_precio' OR jsonb_typeof(v->'mostrar_precio') = 'boolean')
      AND (NOT v ? 'mostrar_proximo_servicio' OR jsonb_typeof(v->'mostrar_proximo_servicio') = 'boolean')
      AND (NOT v ? 'mostrar_sucursal' OR jsonb_typeof(v->'mostrar_sucursal') = 'boolean')
      AND (NOT v ? 'mostrar_notas' OR jsonb_typeof(v->'mostrar_notas') = 'boolean');
$$;

-- ------------------------------------------------------------------------------
-- 3. Ampliación y Restricciones CHECK en la tabla `services`
-- - Separación estricta de notas_internas y notas_cliente.
-- - Unificación de mostrar_notas por defecto en false.
-- - Restricciones de longitud, cantidad y formato de visibilidad.
-- ------------------------------------------------------------------------------
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_manual NUMERIC(12, 2) DEFAULT NULL CHECK (total_manual IS NULL OR total_manual >= 0),
ADD COLUMN IF NOT EXISTS notas_internas TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notas_cliente TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS campos_extra JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS visibilidad JSONB NOT NULL DEFAULT jsonb_build_object(
    'mostrar_km', true,
    'mostrar_productos', true,
    'mostrar_precio', true,
    'mostrar_proximo_servicio', true,
    'mostrar_sucursal', true,
    'mostrar_notas', false
),
ADD COLUMN IF NOT EXISTS editado BOOLEAN NOT NULL DEFAULT FALSE;

-- Restricciones de integridad
ALTER TABLE public.services
ADD CONSTRAINT chk_services_items_len CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 30),
ADD CONSTRAINT chk_services_extra_len CHECK (jsonb_typeof(campos_extra) = 'array' AND jsonb_array_length(campos_extra) <= 10),
ADD CONSTRAINT chk_services_desc_len CHECK (length(descripcion) <= 2000),
ADD CONSTRAINT chk_services_notas_int_len CHECK (notas_internas IS NULL OR length(notas_internas) <= 2000),
ADD CONSTRAINT chk_services_notas_cli_len CHECK (notas_cliente IS NULL OR length(notas_cliente) <= 1000),
ADD CONSTRAINT chk_services_visibilidad CHECK (public.validate_visibilidad_jsonb(visibilidad));

-- ------------------------------------------------------------------------------
-- 4. Trigger en `services`: Validación profunda y recálculo en servidor
-- Se ejecuta BEFORE INSERT OR UPDATE.
-- Valida items (concepto <= 200, cantidad >= 0, precio_unitario >= 0).
-- Valida campos_extra (titulo <= 60, valor <= 200).
-- El precio jamás se lee de un input de precio del cliente.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_services_recalc_total_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_calculated_subtotal NUMERIC(12, 2) := 0.00;
    v_item JSONB;
    v_campo JSONB;
BEGIN
    -- 1. Validar ítems
    IF NEW.items IS NOT NULL THEN
        IF jsonb_typeof(NEW.items) <> 'array' THEN
            RAISE EXCEPTION 'El campo items debe ser un array JSONB.';
        END IF;

        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            IF NOT (v_item ? 'concepto') OR v_item->>'concepto' IS NULL OR length(trim(v_item->>'concepto')) = 0 THEN
                RAISE EXCEPTION 'Cada ítem debe tener un concepto no vacío.';
            END IF;
            IF length(v_item->>'concepto') > 200 THEN
                RAISE EXCEPTION 'El concepto del ítem supera el límite máximo de 200 caracteres.';
            END IF;

            IF NOT (v_item ? 'cantidad') OR (v_item->>'cantidad')::numeric < 0 THEN
                RAISE EXCEPTION 'La cantidad de cada ítem debe ser un valor numérico mayor o igual a 0.';
            END IF;

            IF NOT (v_item ? 'precio_unitario') OR (v_item->>'precio_unitario')::numeric < 0 THEN
                RAISE EXCEPTION 'El precio unitario de cada ítem debe ser un valor numérico mayor o igual a 0.';
            END IF;
        END LOOP;
    END IF;

    -- 2. Validar campos_extra
    IF NEW.campos_extra IS NOT NULL THEN
        IF jsonb_typeof(NEW.campos_extra) <> 'array' THEN
            RAISE EXCEPTION 'El campo campos_extra debe ser un array JSONB.';
        END IF;

        FOR v_campo IN SELECT * FROM jsonb_array_elements(NEW.campos_extra)
        LOOP
            IF NOT (v_campo ? 'titulo') OR v_campo->>'titulo' IS NULL OR length(trim(v_campo->>'titulo')) = 0 THEN
                RAISE EXCEPTION 'Cada campo extra debe tener un título no vacío.';
            END IF;
            IF length(v_campo->>'titulo') > 60 THEN
                RAISE EXCEPTION 'El título del campo extra supera el límite máximo de 60 caracteres.';
            END IF;

            IF (v_campo ? 'valor') AND length(COALESCE(v_campo->>'valor', '')) > 200 THEN
                RAISE EXCEPTION 'El valor del campo extra supera el límite máximo de 200 caracteres.';
            END IF;
        END LOOP;
    END IF;

    -- 3. Asignar precio: Si existe total_manual prevalece; de lo contrario calcula la suma de ítems
    IF NEW.total_manual IS NOT NULL THEN
        IF NEW.total_manual < 0 THEN
            RAISE EXCEPTION 'El total manual no puede ser negativo.';
        END IF;
        NEW.precio := NEW.total_manual;
    ELSIF NEW.items IS NOT NULL AND jsonb_typeof(NEW.items) = 'array' AND jsonb_array_length(NEW.items) > 0 THEN
        SELECT COALESCE(SUM(
            ((it->>'cantidad')::numeric) * ((it->>'precio_unitario')::numeric)
        ), 0.00)
        INTO v_calculated_subtotal
        FROM jsonb_array_elements(NEW.items) it;

        NEW.precio := v_calculated_subtotal;
    ELSE
        -- Si no hay total manual ni ítems, el precio es 0.00, ignorando lo que haya enviado el cliente
        NEW.precio := 0.00;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_services_recalc_total ON public.services;
CREATE TRIGGER trg_services_recalc_total
BEFORE INSERT OR UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.trg_services_recalc_total_fn();

-- ------------------------------------------------------------------------------
-- 5. Tabla: service_templates (Plantillas de Servicios)
-- Solo rol 'admin' puede crear o modificar plantillas. Operario solo SELECT.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN (
        'neumaticos',
        'alineacion_balanceo',
        'aceite_filtros',
        'frenos',
        'suspension',
        'mecanica_general',
        'otro'
    )),
    descripcion_base TEXT NOT NULL DEFAULT '',
    items_base JSONB NOT NULL DEFAULT '[]'::jsonb,
    campos_extra_base JSONB NOT NULL DEFAULT '[]'::jsonb,
    visibilidad_base JSONB NOT NULL DEFAULT jsonb_build_object(
        'mostrar_km', true,
        'mostrar_productos', true,
        'mostrar_precio', true,
        'mostrar_proximo_servicio', true,
        'mostrar_sucursal', true,
        'mostrar_notas', false
    ),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    CONSTRAINT chk_templates_visibilidad CHECK (public.validate_visibilidad_jsonb(visibilidad_base))
);

CREATE INDEX IF NOT EXISTS idx_service_templates_shop 
ON public.service_templates(shop_id) 
WHERE activo = TRUE;

ALTER TABLE public.service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can SELECT templates from their shop"
ON public.service_templates FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Admin can INSERT templates in their shop"
ON public.service_templates FOR INSERT
TO authenticated
WITH CHECK (
    shop_id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin'
);

CREATE POLICY "Admin can UPDATE templates in their shop"
ON public.service_templates FOR UPDATE
TO authenticated
USING (
    shop_id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin'
)
WITH CHECK (
    shop_id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin'
);

CREATE POLICY "Physical DELETE disabled for templates"
ON public.service_templates FOR DELETE
TO authenticated
USING (FALSE);

-- ------------------------------------------------------------------------------
-- 6. Tabla: service_revisions (Auditoría Inmutable)
-- Trigger bloquea UPDATE y DELETE estrictamente.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    editado_por UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    editado_en TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    motivo_edicion TEXT,
    cambios JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_revisions_service 
ON public.service_revisions(service_id, editado_en DESC);

CREATE OR REPLACE FUNCTION public.trg_prevent_service_revisions_mutation_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'service_revisions es una tabla de auditoría inmutable. No se permite modificar ni eliminar registros.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_service_revisions_mutation ON public.service_revisions;
CREATE TRIGGER trg_prevent_service_revisions_mutation
BEFORE UPDATE OR DELETE ON public.service_revisions
FOR EACH ROW
EXECUTE FUNCTION public.trg_prevent_service_revisions_mutation_fn();

ALTER TABLE public.service_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can SELECT revisions of their shop services"
ON public.service_revisions FOR SELECT
TO authenticated
USING (
    service_id IN (
        SELECT s.id FROM public.services s
        WHERE s.shop_id = public.get_auth_shop_id()
    )
);

-- ------------------------------------------------------------------------------
-- 7. Función Completa: get_vehicle_by_token
-- Cast seguro de visibilidad: un valor corrupto jamás romperá la respuesta pública.
-- notas_internas jamás se incluye.
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
BEGIN
    IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token de acceso inválido o incompleto');
    END IF;

    -- 1. Buscar vehículo activo por token
    SELECT v.id, v.shop_id, v.public_token, v.patente, v.marca, v.modelo, v.anio, 
           v.ocultar_precios AS vehicle_hide_prices
    INTO v_vehicle
    FROM public.vehicles v
    WHERE v.public_token = p_token
      AND v.token_revoked_at IS NULL
      AND v.deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'El enlace del vehículo no existe o ha sido revocado.');
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

-- ------------------------------------------------------------------------------
-- 8. Función Completa: update_service_with_audit
-- Edición controlada, preservación de total_manual, bloqueo de anulados.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_service_with_audit(
    p_service_id UUID,
    p_datos JSONB,
    p_motivo TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_staff RECORD;
    v_old_service RECORD;
    v_new_total_manual NUMERIC(12, 2);
    v_items_to_use JSONB;
    v_campos_to_use JSONB;
    v_calculo_total NUMERIC(12, 2) := 0.00;
BEGIN
    -- 1. Validar autenticación
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debe iniciar sesión.';
    END IF;

    -- 2. Validar pertenencia a staff activo
    SELECT shop_id, rol, is_active INTO v_staff
    FROM public.staff_users
    WHERE id = v_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acceso denegado: usuario no pertenece al personal activo de ningún taller.';
    END IF;

    -- 3. Obtener servicio existente y validar shop
    SELECT * INTO v_old_service
    FROM public.services
    WHERE id = p_service_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Servicio no encontrado o ha sido eliminado.';
    END IF;

    IF v_old_service.shop_id <> v_staff.shop_id THEN
        RAISE EXCEPTION 'No tiene permiso para modificar servicios de otro taller.';
    END IF;

    -- 4. Bloquear edición si el servicio ya fue anulado
    IF v_old_service.anulado THEN
        RAISE EXCEPTION 'No se puede modificar un servicio que ha sido anulado.';
    END IF;

    -- 5. Anulación: EXCLUSIVO rol admin
    IF (p_datos->>'anulado')::BOOLEAN = TRUE AND v_old_service.anulado = FALSE THEN
        IF v_staff.rol <> 'admin' THEN
            RAISE EXCEPTION 'Solo un usuario con rol administrador puede anular servicios.';
        END IF;

        UPDATE public.services
        SET anulado = TRUE,
            anulado_at = (NOW() AT TIME ZONE 'utc'),
            anulado_by = v_user_id,
            anulado_motivo = COALESCE(p_motivo, p_datos->>'anulado_motivo', 'Anulado por administración'),
            updated_at = (NOW() AT TIME ZONE 'utc')
        WHERE id = p_service_id;

        -- Registrar revisión inmutable de anulación
        INSERT INTO public.service_revisions (
            service_id, editado_por, editado_en, motivo_edicion, cambios
        ) VALUES (
            p_service_id, v_user_id, (NOW() AT TIME ZONE 'utc'),
            COALESCE(p_motivo, 'Anulación de servicio'),
            jsonb_build_object('anulado', true, 'estado_anterior', to_jsonb(v_old_service))
        );

        RETURN jsonb_build_object('success', true, 'anulado', true);
    END IF;

    -- 6. Preservar o actualizar total_manual
    IF p_datos ? 'total_manual' THEN
        IF p_datos->>'total_manual' IS NULL OR p_datos->>'total_manual' = '' THEN
            v_new_total_manual := NULL;
        ELSE
            v_new_total_manual := (p_datos->>'total_manual')::NUMERIC;
            IF v_new_total_manual < 0 THEN
                RAISE EXCEPTION 'El total manual no puede ser negativo.';
            END IF;
        END IF;
    ELSE
        -- Conserva valor existente si no se envía la clave
        v_new_total_manual := v_old_service.total_manual;
    END IF;

    -- 7. Determinar ítems y campos_extra a utilizar
    IF p_datos ? 'items' THEN
        v_items_to_use := p_datos->'items';
    ELSE
        v_items_to_use := v_old_service.items;
    END IF;

    IF p_datos ? 'campos_extra' THEN
        v_campos_to_use := p_datos->'campos_extra';
    ELSE
        v_campos_to_use := v_old_service.campos_extra;
    END IF;

    -- 8. Recalcular precio exclusivamente desde total_manual o suma de ítems (nunca de p_datos->>'precio')
    IF v_new_total_manual IS NOT NULL THEN
        v_calculo_total := v_new_total_manual;
    ELSIF v_items_to_use IS NOT NULL AND jsonb_typeof(v_items_to_use) = 'array' AND jsonb_array_length(v_items_to_use) > 0 THEN
        SELECT COALESCE(SUM(
            ((it->>'cantidad')::numeric) * ((it->>'precio_unitario')::numeric)
        ), 0.00)
        INTO v_calculo_total
        FROM jsonb_array_elements(v_items_to_use) it;
    ELSE
        v_calculo_total := 0.00;
    END IF;

    -- 9. Insertar snapshot inmutable en service_revisions
    INSERT INTO public.service_revisions (
        service_id,
        editado_por,
        editado_en,
        motivo_edicion,
        cambios
    ) VALUES (
        p_service_id,
        v_user_id,
        (NOW() AT TIME ZONE 'utc'),
        p_motivo,
        jsonb_build_object(
            'anterior', to_jsonb(v_old_service),
            'nuevo', p_datos
        )
    );

    -- 10. Actualizar servicio (el trigger trg_services_recalc_total validará tipos y longitudes)
    UPDATE public.services
    SET fecha_hora = COALESCE((p_datos->>'fecha_hora')::timestamptz, fecha_hora),
        kilometraje = COALESCE((p_datos->>'kilometraje')::int, kilometraje),
        tipo = COALESCE(p_datos->>'tipo', tipo),
        descripcion = COALESCE(p_datos->>'descripcion', descripcion),
        productos = COALESCE(p_datos->>'productos', productos),
        items = v_items_to_use,
        total_manual = v_new_total_manual,
        precio = v_calculo_total,
        proximo_servicio_km = CASE 
            WHEN p_datos ? 'proximo_servicio_km' 
            THEN (p_datos->>'proximo_servicio_km')::int 
            ELSE proximo_servicio_km 
        END,
        proximo_servicio_fecha = CASE 
            WHEN p_datos ? 'proximo_servicio_fecha' 
            THEN (p_datos->>'proximo_servicio_fecha')::date 
            ELSE proximo_servicio_fecha 
        END,
        sucursal = COALESCE(p_datos->>'sucursal', sucursal),
        notas_internas = CASE 
            WHEN p_datos ? 'notas_internas' 
            THEN p_datos->>'notas_internas' 
            ELSE notas_internas 
        END,
        notas_cliente = CASE 
            WHEN p_datos ? 'notas_cliente' 
            THEN p_datos->>'notas_cliente' 
            ELSE notas_cliente 
        END,
        campos_extra = v_campos_to_use,
        visibilidad = COALESCE(p_datos->'visibilidad', visibilidad),
        editado = TRUE,
        updated_at = (NOW() AT TIME ZONE 'utc')
    WHERE id = p_service_id;

    RETURN jsonb_build_object('success', true, 'editado', true);
END;
$$;

-- Permisos explícitos de ejecución
REVOKE ALL ON FUNCTION public.get_vehicle_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_by_token(TEXT) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_service_with_audit(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_service_with_audit(UUID, JSONB, TEXT) TO authenticated;
