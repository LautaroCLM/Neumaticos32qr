-- ==============================================================================
-- Migración: Clientes y Propietarios de Vehículos
-- El historial de servicios sigue perteneciendo al vehículo. El propietario es un
-- dato aparte, con fechas, para poder registrar cambios de dueño sin perder historial.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Tabla: customers (Clientes del taller)
-- telefono se guarda solo con dígitos, en formato internacional (ej. 5491134567890).
-- ------------------------------------------------------------------------------
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    telefono VARCHAR(15),
    email VARCHAR(254),
    notas_internas TEXT,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_customers_id_shop UNIQUE (id, shop_id),
    CONSTRAINT chk_customers_nombre CHECK (length(trim(nombre)) >= 2),
    CONSTRAINT chk_customers_telefono CHECK (telefono IS NULL OR telefono ~ '^[0-9]{8,15}$'),
    CONSTRAINT chk_customers_notas_len CHECK (notas_internas IS NULL OR length(notas_internas) <= 2000)
);

-- Un mismo teléfono no puede dar lugar a dos clientes activos del taller
CREATE UNIQUE INDEX uq_customers_shop_telefono
ON public.customers(shop_id, telefono)
WHERE telefono IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_customers_shop ON public.customers(shop_id) WHERE deleted_at IS NULL;

-- ------------------------------------------------------------------------------
-- 2. Tabla: vehicle_owners (Propietarios de cada vehículo a lo largo del tiempo)
-- Las claves compuestas garantizan que vehículo y cliente sean del mismo taller.
-- hasta = NULL indica el propietario actual.
-- ------------------------------------------------------------------------------
ALTER TABLE public.vehicles
ADD CONSTRAINT uq_vehicles_id_shop UNIQUE (id, shop_id);

CREATE TABLE public.vehicle_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL,
    vehicle_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    desde TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    hasta TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_owners_vehicle FOREIGN KEY (vehicle_id, shop_id)
        REFERENCES public.vehicles(id, shop_id) ON DELETE RESTRICT,
    CONSTRAINT fk_vehicle_owners_customer FOREIGN KEY (customer_id, shop_id)
        REFERENCES public.customers(id, shop_id) ON DELETE RESTRICT,
    CONSTRAINT chk_vehicle_owners_fechas CHECK (hasta IS NULL OR hasta >= desde)
);

CREATE UNIQUE INDEX uq_vehicle_owners_actual
ON public.vehicle_owners(vehicle_id)
WHERE hasta IS NULL;

CREATE INDEX idx_vehicle_owners_customer ON public.vehicle_owners(customer_id);

-- Los datos del cliente pasan a customers
ALTER TABLE public.vehicles
DROP COLUMN cliente_nombre,
DROP COLUMN cliente_telefono;

-- ------------------------------------------------------------------------------
-- 3. Políticas RLS
-- vehicle_owners solo se escribe mediante assign_vehicle_owner.
-- ------------------------------------------------------------------------------
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_owners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can SELECT customers from their own shop"
ON public.customers FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Staff can INSERT customers in their own shop"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Staff can UPDATE customers in their own shop"
ON public.customers FOR UPDATE
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
)
WITH CHECK (
    shop_id = public.get_auth_shop_id()
);

CREATE POLICY "Physical DELETE disabled for customers"
ON public.customers FOR DELETE
TO authenticated
USING (FALSE);

CREATE POLICY "Staff can SELECT vehicle owners from their own shop"
ON public.vehicle_owners FOR SELECT
TO authenticated
USING (
    shop_id = public.get_auth_shop_id()
);

-- ------------------------------------------------------------------------------
-- 4. Función: assign_vehicle_owner
-- p_customer_id = NULL deja el vehículo sin propietario.
-- p_es_transferencia = TRUE registra un cambio real de dueño: cierra el período anterior
-- y regenera el QR, para que el dueño anterior no siga viendo el vehículo.
-- p_es_transferencia = FALSE corrige un propietario mal cargado, sin alterar fechas ni QR.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_vehicle_owner(
    p_vehicle_id UUID,
    p_customer_id UUID,
    p_es_transferencia BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_user_id UUID;
    v_shop_id UUID;
    v_vehicle RECORD;
    v_actual RECORD;
    v_new_token TEXT := NULL;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No autorizado. Debe iniciar sesión.';
    END IF;

    SELECT shop_id INTO v_shop_id
    FROM public.staff_users
    WHERE id = v_user_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Acceso denegado: usuario sin rol de personal activo.';
    END IF;

    -- Bloquear el vehículo evita dos cambios de dueño simultáneos
    SELECT id, shop_id INTO v_vehicle
    FROM public.vehicles
    WHERE id = p_vehicle_id AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND OR v_vehicle.shop_id <> v_shop_id THEN
        RAISE EXCEPTION 'Vehículo no encontrado en este taller.';
    END IF;

    IF p_customer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.customers
        WHERE id = p_customer_id AND shop_id = v_shop_id AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Cliente no encontrado en este taller.';
    END IF;

    SELECT id, customer_id INTO v_actual
    FROM public.vehicle_owners
    WHERE vehicle_id = p_vehicle_id AND hasta IS NULL;

    -- Sin propietario actual: solo se registra el nuevo
    IF v_actual.id IS NULL THEN
        IF p_customer_id IS NOT NULL THEN
            INSERT INTO public.vehicle_owners (shop_id, vehicle_id, customer_id, created_by)
            VALUES (v_shop_id, p_vehicle_id, p_customer_id, v_user_id);
        END IF;
        RETURN jsonb_build_object('success', true, 'new_token', NULL);
    END IF;

    IF v_actual.customer_id IS NOT DISTINCT FROM p_customer_id THEN
        RETURN jsonb_build_object('success', true, 'new_token', NULL);
    END IF;

    IF NOT p_es_transferencia THEN
        IF p_customer_id IS NULL THEN
            RAISE EXCEPTION 'Una corrección debe indicar el propietario correcto.';
        END IF;

        UPDATE public.vehicle_owners
        SET customer_id = p_customer_id
        WHERE id = v_actual.id;

        RETURN jsonb_build_object('success', true, 'new_token', NULL);
    END IF;

    UPDATE public.vehicle_owners
    SET hasta = NOW()
    WHERE id = v_actual.id;

    IF p_customer_id IS NOT NULL THEN
        INSERT INTO public.vehicle_owners (shop_id, vehicle_id, customer_id, created_by)
        VALUES (v_shop_id, p_vehicle_id, p_customer_id, v_user_id);
    END IF;

    v_new_token := encode(extensions.gen_random_bytes(24), 'hex');

    PERFORM set_config('app.allow_token_mutation', 'on', true);

    UPDATE public.vehicles
    SET public_token = v_new_token,
        token_created_at = NOW(),
        token_revoked_at = NULL,
        updated_at = NOW()
    WHERE id = p_vehicle_id;

    PERFORM set_config('app.allow_token_mutation', 'off', true);

    RETURN jsonb_build_object('success', true, 'new_token', v_new_token);
END;
$$;
