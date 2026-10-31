-- ==============================================================================
-- Migración: Permisos del Operario y Límites de Autenticación
-- - Reserva al administrador las acciones que quitan datos o acceso a clientes.
-- - Registra los intentos de login y de recuperación de contraseña por cuenta e IP.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Personal: el operario solo ve su propia fila
-- ------------------------------------------------------------------------------
DROP POLICY "Staff can view peer members in same shop" ON public.staff_users;

CREATE POLICY "Staff can view own row and admin can view shop members"
ON public.staff_users FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR (shop_id = public.get_auth_shop_id() AND public.get_auth_user_role() = 'admin')
);

-- ------------------------------------------------------------------------------
-- 2. Columnas reservadas al administrador
-- RLS limita filas, no columnas. auth.uid() es NULL en service_role y en tareas
-- internas, que quedan fuera de esta restricción.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_restrict_operator_vehicle_columns_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND COALESCE(public.get_auth_user_role(), '') <> 'admin'
       AND (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
            OR OLD.ocultar_precios IS DISTINCT FROM NEW.ocultar_precios) THEN
        RAISE EXCEPTION 'Solo un administrador puede dar de baja un vehículo o cambiar la visibilidad de sus precios.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_operator_vehicle_columns
BEFORE UPDATE ON public.vehicles
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_operator_vehicle_columns_fn();

CREATE OR REPLACE FUNCTION public.trg_restrict_operator_customer_columns_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND COALESCE(public.get_auth_user_role(), '') <> 'admin'
       AND OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
        RAISE EXCEPTION 'Solo un administrador puede dar de baja un cliente.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restrict_operator_customer_columns
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.trg_restrict_operator_customer_columns_fn();

-- ------------------------------------------------------------------------------
-- 3. Revocar el QR: exclusivo del administrador
-- ------------------------------------------------------------------------------
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

    SELECT shop_id, rol INTO v_staff
    FROM public.staff_users
    WHERE id = v_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acceso denegado: usuario sin rol de personal activo.';
    END IF;

    IF v_staff.rol <> 'admin' THEN
        RAISE EXCEPTION 'Solo un administrador puede revocar el acceso al QR.' USING ERRCODE = '42501';
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

    PERFORM set_config('app.allow_token_mutation', 'on', true);

    UPDATE public.vehicles
    SET token_revoked_at = NOW(),
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Límite de intentos de autenticación
-- p_account_key es un hash del email: esta tabla no guarda direcciones.
-- El intento se registra antes de consultar Auth para frenar pruebas en paralelo, y
-- los rechazados no se registran: el bloqueo vence solo al terminar la ventana.
--
--                    Ventana    IP    Cuenta   Cuenta + IP
-- login              15 min     20    20       5
-- password_reset     60 min     10    3        3
-- ------------------------------------------------------------------------------
CREATE INDEX idx_rate_limit_type_window
ON public.rate_limit_attempts(target_type, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.register_auth_attempt(
    p_kind TEXT,
    p_account_key TEXT,
    p_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_window INTERVAL;
    v_max_ip INT;
    v_max_account INT;
    v_max_pair INT;
    v_ip_count INT;
    v_account_count INT;
    v_pair_count INT;
BEGIN
    IF p_kind = 'login' THEN
        v_window := INTERVAL '15 minutes';
        v_max_ip := 20;
        v_max_account := 20;
        v_max_pair := 5;
    ELSIF p_kind = 'password_reset' THEN
        v_window := INTERVAL '60 minutes';
        v_max_ip := 10;
        v_max_account := 3;
        v_max_pair := 3;
    ELSE
        RAISE EXCEPTION 'Tipo de intento desconocido.';
    END IF;

    IF COALESCE(p_account_key, '') = '' OR COALESCE(p_ip, '') = '' THEN
        RAISE EXCEPTION 'Faltan datos del intento.';
    END IF;

    -- Serializa los intentos a la misma cuenta para que no se salteen el conteo
    PERFORM pg_advisory_xact_lock(hashtext(p_kind || ':' || p_account_key));

    SELECT COUNT(*) FILTER (WHERE ip_address = p_ip),
           COUNT(*) FILTER (WHERE target_key = p_account_key),
           COUNT(*) FILTER (WHERE ip_address = p_ip AND target_key = p_account_key)
    INTO v_ip_count, v_account_count, v_pair_count
    FROM public.rate_limit_attempts
    WHERE target_type = p_kind
      AND success = FALSE
      AND attempted_at > (NOW() - v_window);

    IF v_ip_count >= v_max_ip OR v_account_count >= v_max_account OR v_pair_count >= v_max_pair THEN
        RETURN jsonb_build_object('allowed', false);
    END IF;

    INSERT INTO public.rate_limit_attempts (ip_address, target_type, target_key, success, attempted_at)
    VALUES (p_ip, p_kind, p_account_key, FALSE, NOW());

    RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Con la contraseña correcta se olvidan los errores de esa persona desde esa conexión.
-- Los intentos desde otras IP siguen contando hasta que venza la ventana.
CREATE OR REPLACE FUNCTION public.clear_login_attempts(
    p_account_key TEXT,
    p_ip TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    DELETE FROM public.rate_limit_attempts
    WHERE target_type = 'login'
      AND target_key = p_account_key
      AND ip_address = p_ip;
$$;

-- ------------------------------------------------------------------------------
-- 5. Permisos explícitos
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.register_auth_attempt(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_login_attempts(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_restrict_operator_vehicle_columns_fn() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_restrict_operator_customer_columns_fn() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.register_auth_attempt(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_login_attempts(TEXT, TEXT) TO service_role;
