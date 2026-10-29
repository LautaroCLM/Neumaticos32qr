-- ==============================================================================
-- Migración Inicial: "Neumáticos el 32"
-- Modelo de datos robusto, seguro, con Soft-Delete, RLS y Timezone BA
-- ==============================================================================

-- Extensión para generación de UUIDs y bytes criptográficos en el esquema extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ------------------------------------------------------------------------------
-- 1. Tabla: shops (Talleres / Sucursales centrales y configuración)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL DEFAULT 'Neumáticos el 32',
    slug VARCHAR(50) UNIQUE NOT NULL DEFAULT 'el-32',
    logo_url TEXT,
    color_primario VARCHAR(20) NOT NULL DEFAULT '#f59e0b',
    color_fondo VARCHAR(20) NOT NULL DEFAULT '#09090b',
    telefono VARCHAR(30),
    whatsapp VARCHAR(30) NOT NULL DEFAULT '+5491132003200',
    direccion TEXT NOT NULL DEFAULT 'Av. Mitre 3200, Quilmes, Buenos Aires',
    horarios TEXT NOT NULL DEFAULT 'Lunes a Viernes de 8:00 a 18:30 | Sábados de 8:00 a 13:00',
    ocultar_precios BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

-- ------------------------------------------------------------------------------
-- 2. Tabla: vehicles (Vehículos registrados)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    public_token VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(extensions.gen_random_bytes(24), 'base64'),
    token_created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    token_revoked_at TIMESTAMPTZ,
    patente VARCHAR(15) NOT NULL,
    marca VARCHAR(50) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    anio INT,
    cliente_nombre VARCHAR(100),
    cliente_telefono VARCHAR(30),
    ocultar_precios BOOLEAN DEFAULT NULL,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicles_shop_patente_active 
ON public.vehicles(shop_id, patente) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicles_token ON public.vehicles(public_token) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_patente ON public.vehicles(patente) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_shop ON public.vehicles(shop_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 3. Tabla: services (Historial de Mantenimientos)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    fecha_hora TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    kilometraje INT NOT NULL CHECK (kilometraje >= 0),
    tipo TEXT NOT NULL CHECK (tipo IN (
        'neumaticos',
        'alineacion_balanceo',
        'aceite_filtros',
        'frenos',
        'suspension',
        'mecanica_general',
        'otro'
    )),
    descripcion TEXT NOT NULL,
    productos TEXT,
    precio NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio >= 0),
    proximo_servicio_km INT CHECK (proximo_servicio_km >= 0),
    proximo_servicio_fecha DATE,
    sucursal VARCHAR(100) NOT NULL DEFAULT 'Casa Central',
    anulado BOOLEAN NOT NULL DEFAULT FALSE,
    anulado_at TIMESTAMPTZ,
    anulado_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    anulado_motivo TEXT,
    deleted_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_services_vehicle_history 
ON public.services(vehicle_id, fecha_hora DESC) 
WHERE deleted_at IS NULL AND anulado = FALSE;

CREATE INDEX IF NOT EXISTS idx_services_shop_history 
ON public.services(shop_id, fecha_hora DESC) 
WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 4. Tabla: staff_users (Personal y Permisos del Taller)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'operario')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_staff_users_shop ON public.staff_users(shop_id) WHERE is_active = TRUE;

-- ------------------------------------------------------------------------------
-- 5. Tabla: rate_limit_attempts (Almacén compartido de rate-limiting)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
    id BIGSERIAL PRIMARY KEY,
    ip_address TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'plate_search',
    target_key TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_window 
ON public.rate_limit_attempts(ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_target_window 
ON public.rate_limit_attempts(target_key, attempted_at DESC);

-- ==============================================================================
-- 6. Funciones de Seguridad y Limpieza
-- ==============================================================================

-- A. Limpieza periódica de intentos mayores a 24 horas
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM public.rate_limit_attempts
    WHERE attempted_at < (NOW() - INTERVAL '24 hours');
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- B. Verificación de Rate Limit
CREATE OR REPLACE FUNCTION public.check_and_record_rate_limit(
    p_ip TEXT,
    p_patente TEXT,
    p_success BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_ip_count INT;
    v_target_fails INT;
    v_is_blocked BOOLEAN := FALSE;
    v_reason TEXT := NULL;
    v_clean_patente TEXT;
BEGIN
    v_clean_patente := UPPER(REGEXP_REPLACE(p_patente, '[^a-zA-Z0-9]', '', 'g'));

    -- 1. Bloqueo por IP: más de 20 intentos en los últimos 60 segundos
    SELECT COUNT(*) INTO v_ip_count
    FROM public.rate_limit_attempts
    WHERE ip_address = p_ip
      AND attempted_at > (NOW() - INTERVAL '60 seconds');

    IF v_ip_count >= 20 THEN
        v_is_blocked := TRUE;
        v_reason := 'Límite de solicitudes excedido para tu dirección IP. Aguardá 1 minuto.';
    END IF;

    -- 2. Bloqueo por Patente: 5 o más fallos en los últimos 15 minutos
    IF NOT v_is_blocked AND v_clean_patente <> '' THEN
        SELECT COUNT(*) INTO v_target_fails
        FROM public.rate_limit_attempts
        WHERE target_key = v_clean_patente
          AND success = FALSE
          AND attempted_at > (NOW() - INTERVAL '15 minutes');

        IF v_target_fails >= 5 THEN
            v_is_blocked := TRUE;
            v_reason := 'Demasiados intentos fallidos para esta patente. Por seguridad está bloqueada temporalmente por 15 minutos.';
        END IF;
    END IF;

    -- Registrar intento actual
    INSERT INTO public.rate_limit_attempts(ip_address, target_type, target_key, success, attempted_at)
    VALUES (p_ip, 'plate_search', COALESCE(v_clean_patente, 'UNKNOWN'), p_success, NOW());

    -- Ejecutar limpieza periódica cada ~20 solicitudes
    IF (RANDOM() < 0.05) THEN
        PERFORM public.cleanup_old_rate_limits();
    END IF;

    RETURN jsonb_build_object(
        'allowed', NOT v_is_blocked,
        'reason', v_reason
    );
END;
$$;

-- C. Búsqueda pública por patente (SOLO invocable por service_role desde /api/search-plate)
CREATE OR REPLACE FUNCTION public.search_vehicle_public(
    p_patente TEXT,
    p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_clean_patente TEXT;
    v_rate_check JSONB;
    v_vehicle RECORD;
    v_last_service RECORD;
    v_next_service RECORD;
BEGIN
    v_clean_patente := UPPER(REGEXP_REPLACE(p_patente, '[^a-zA-Z0-9]', '', 'g'));

    IF v_clean_patente = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Patente inválida');
    END IF;

    -- Verificar rate limiting preliminar
    v_rate_check := public.check_and_record_rate_limit(p_ip, v_clean_patente, FALSE);
    IF (v_rate_check->>'allowed')::BOOLEAN = FALSE THEN
        RETURN jsonb_build_object(
            'success', false,
            'blocked', true,
            'error', v_rate_check->>'reason'
        );
    END IF;

    -- Buscar vehículo activo
    SELECT id, patente, marca, modelo, anio, token_revoked_at
    INTO v_vehicle
    FROM public.vehicles
    WHERE patente = v_clean_patente
      AND deleted_at IS NULL
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'not_found', true, 'error', 'No encontramos esa patente');
    END IF;

    -- Marcar intento exitoso
    UPDATE public.rate_limit_attempts 
    SET success = TRUE 
    WHERE id = (
        SELECT id FROM public.rate_limit_attempts 
        WHERE ip_address = p_ip AND target_key = v_clean_patente 
        ORDER BY attempted_at DESC LIMIT 1
    );

    -- Fecha del último servicio activo
    SELECT fecha_hora
    INTO v_last_service
    FROM public.services
    WHERE vehicle_id = v_vehicle.id
      AND deleted_at IS NULL
      AND anulado = FALSE
    ORDER BY fecha_hora DESC
    LIMIT 1;

    -- Próximo servicio programado
    SELECT proximo_servicio_km, proximo_servicio_fecha
    INTO v_next_service
    FROM public.services
    WHERE vehicle_id = v_vehicle.id
      AND deleted_at IS NULL
      AND anulado = FALSE
      AND (proximo_servicio_km IS NOT NULL OR proximo_servicio_fecha IS NOT NULL)
    ORDER BY fecha_hora DESC
    LIMIT 1;

    -- Retorna ÚNICAMENTE datos públicos no sensibles
    RETURN jsonb_build_object(
        'success', true,
        'data', jsonb_build_object(
            'patente', v_vehicle.patente,
            'marca', v_vehicle.marca,
            'modelo', v_vehicle.modelo,
            'anio', v_vehicle.anio,
            'fecha_ultimo_servicio', v_last_service.fecha_hora,
            'proximo_servicio_km', v_next_service.proximo_servicio_km,
            'proximo_servicio_fecha', v_next_service.proximo_servicio_fecha,
            'has_qr_access', (v_vehicle.token_revoked_at IS NULL)
        )
    );
END;
$$;

-- D. Regeneración de Token QR (Validación estricta de auth.uid() en staff_users y shop)
CREATE OR REPLACE FUNCTION public.regenerate_vehicle_token(
    p_vehicle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_staff RECORD;
    v_vehicle RECORD;
    v_new_token TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debe iniciar sesión.';
    END IF;

    SELECT shop_id, rol, is_active INTO v_staff
    FROM public.staff_users
    WHERE id = v_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acceso denegado: el usuario no pertenece al personal activo de ningún taller.';
    END IF;

    SELECT id, shop_id INTO v_vehicle
    FROM public.vehicles
    WHERE id = p_vehicle_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehículo no encontrado o ha sido eliminado.';
    END IF;

    IF v_vehicle.shop_id <> v_staff.shop_id THEN
        RAISE EXCEPTION 'No tiene permiso para regenerar el token de un vehículo perteneciente a otro taller.';
    END IF;

    -- Generar nuevo token con extensions.gen_random_bytes
    v_new_token := encode(extensions.gen_random_bytes(24), 'hex');

    -- Habilitar mutación de tokens en la sesión actual
    PERFORM set_config('app.allow_token_mutation', 'on', true);

    UPDATE public.vehicles
    SET public_token = v_new_token,
        token_created_at = (NOW() AT TIME ZONE 'utc'),
        token_revoked_at = NULL,
        updated_at = (NOW() AT TIME ZONE 'utc')
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_token', v_new_token
    );
END;
$$;

-- E. Revocación de Token QR (Validación estricta de auth.uid() en staff_users y shop)
CREATE OR REPLACE FUNCTION public.revoke_vehicle_token(
    p_vehicle_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_staff RECORD;
    v_vehicle RECORD;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debe iniciar sesión.';
    END IF;

    SELECT shop_id INTO v_staff
    FROM public.staff_users
    WHERE id = v_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acceso denegado: usuario sin rol de personal activo.';
    END IF;

    SELECT id, shop_id INTO v_vehicle
    FROM public.vehicles
    WHERE id = p_vehicle_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehículo no encontrado o eliminado.';
    END IF;

    IF v_vehicle.shop_id <> v_staff.shop_id THEN
        RAISE EXCEPTION 'No tiene permiso para revocar el token de un vehículo perteneciente a otro taller.';
    END IF;

    -- Habilitar mutación de tokens en la sesión actual
    PERFORM set_config('app.allow_token_mutation', 'on', true);

    UPDATE public.vehicles
    SET token_revoked_at = (NOW() AT TIME ZONE 'utc'),
        updated_at = (NOW() AT TIME ZONE 'utc')
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- F. Trigger de Protección de Tokens en Vehicles (Bloquea UPDATE directo de tokens)
CREATE OR REPLACE FUNCTION public.trg_protect_vehicle_tokens_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF (OLD.public_token IS DISTINCT FROM NEW.public_token)
       OR (OLD.token_created_at IS DISTINCT FROM NEW.token_created_at)
       OR (OLD.token_revoked_at IS DISTINCT FROM NEW.token_revoked_at) THEN
        IF COALESCE(current_setting('app.allow_token_mutation', true), 'off') <> 'on' THEN
            RAISE EXCEPTION 'No se permite modificar los tokens de acceso del vehículo directamente. Utilice regenerate_vehicle_token o revoke_vehicle_token.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_vehicle_tokens ON public.vehicles;
CREATE TRIGGER trg_protect_vehicle_tokens
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.trg_protect_vehicle_tokens_fn();

-- G. Trigger de Generación Segura de Tokens en Vehicles (BEFORE INSERT)
-- Garantiza que el token SIEMPRE se genere en el servidor con gen_random_bytes,
-- ignorando cualquier valor provisto por el cliente/operario.
CREATE OR REPLACE FUNCTION public.trg_vehicles_before_insert_token_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.public_token := encode(extensions.gen_random_bytes(24), 'base64');
    NEW.token_created_at := (NOW() AT TIME ZONE 'utc');
    NEW.token_revoked_at := NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vehicles_before_insert_token ON public.vehicles;
CREATE TRIGGER trg_vehicles_before_insert_token
BEFORE INSERT ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.trg_vehicles_before_insert_token_fn();

-- ==============================================================================
-- 7. Funciones Auxiliares de Seguridad y Row Level Security (RLS)
-- ==============================================================================

-- Funciones STABLE SECURITY DEFINER para obtener el shop_id y rol del usuario actual
-- sin causar recursión infinita en las políticas RLS sobre staff_users.
CREATE OR REPLACE FUNCTION public.get_auth_shop_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT shop_id FROM public.staff_users WHERE id = auth.uid() AND is_active = TRUE LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT rol FROM public.staff_users WHERE id = auth.uid() AND is_active = TRUE LIMIT 1;
$$;

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Políticas RLS sobre SHOPS
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view their own shop"
ON public.shops FOR SELECT
TO authenticated
USING (
    id = public.get_auth_shop_id()
);

CREATE POLICY "Admin can update their own shop"
ON public.shops FOR UPDATE
TO authenticated
USING (
    id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin'
)
WITH CHECK (
    id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin'
);

-- ------------------------------------------------------------------------------
-- Políticas RLS sobre VEHICLES (Aislamiento total por shop)
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can SELECT vehicles from their own shop"
ON public.vehicles FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Staff can INSERT vehicles in their own shop"
ON public.vehicles FOR INSERT
TO authenticated
WITH CHECK (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Staff can UPDATE vehicles in their own shop"
ON public.vehicles FOR UPDATE
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
)
WITH CHECK (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Physical DELETE disabled for vehicles"
ON public.vehicles FOR DELETE
TO authenticated
USING (FALSE);

-- ------------------------------------------------------------------------------
-- Políticas RLS sobre SERVICES (Aislamiento total por shop)
-- REGLA CRÍTICA:
-- 1. INSERT valida que vehicle_id pertenezca al mismo shop_id.
-- 2. NO EXISTE POLÍTICA DE UPDATE para authenticated. Todo cambio pasa por update_service_with_audit.
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can SELECT services from their own shop"
ON public.services FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Staff can INSERT services in their own shop"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (
    shop_id = public.get_auth_shop_id()
    AND vehicle_id IN (SELECT v.id FROM public.vehicles v WHERE v.shop_id = public.get_auth_shop_id() AND v.deleted_at IS NULL)
);

CREATE POLICY "Physical DELETE disabled for services"
ON public.services FOR DELETE
TO authenticated
USING (FALSE);

-- ------------------------------------------------------------------------------
-- Políticas RLS sobre STAFF_USERS
-- ------------------------------------------------------------------------------
CREATE POLICY "Staff can view peer members in same shop"
ON public.staff_users FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

-- ------------------------------------------------------------------------------
-- Políticas RLS sobre RATE_LIMIT_ATTEMPTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Deny all direct client access on rate_limit_attempts"
ON public.rate_limit_attempts FOR ALL
TO anon, authenticated
USING (FALSE)
WITH CHECK (FALSE);

-- ==============================================================================
-- 8. Permisos Explícitos de Ejecución
-- ==============================================================================

REVOKE ALL ON FUNCTION public.get_auth_shop_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_auth_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cleanup_old_rate_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_record_rate_limit(TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.search_vehicle_public(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_vehicle_token(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_vehicle_token(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_auth_shop_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_vehicle_public(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.regenerate_vehicle_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_vehicle_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_rate_limits() TO service_role;
