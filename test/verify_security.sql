-- ==============================================================================
-- Script de Verificación de Políticas RLS y Aislamiento en PostgreSQL / Supabase
-- Ejecutar contra la base local para verificar la seguridad. Lanza un error si algo falla.
-- ==============================================================================

BEGIN;

-- 1. Test: Toda tabla de public tiene RLS activo
DO $$
DECLARE
    v_tablas TEXT;
BEGIN
    SELECT string_agg(c.relname, ', ') INTO v_tablas
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity;

    IF v_tablas IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FALLÓ: Tablas sin RLS: %', v_tablas;
    END IF;
    RAISE NOTICE 'TEST 1 PASÓ: todas las tablas de public tienen RLS.';
END;
$$;

-- 2. Test: anon no tiene ningún permiso sobre tablas de public
DO $$
DECLARE
    v_tablas TEXT;
BEGIN
    SELECT string_agg(DISTINCT table_name, ', ') INTO v_tablas
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee = 'anon';

    IF v_tablas IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FALLÓ: anon tiene permisos sobre: %', v_tablas;
    END IF;
    RAISE NOTICE 'TEST 2 PASÓ: anon no tiene permisos sobre tablas.';
END;
$$;

-- 3. Test: anon solo puede ejecutar las dos funciones públicas
DO $$
DECLARE
    v_funciones TEXT;
BEGIN
    SELECT string_agg(p.proname, ', ') INTO v_funciones
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND p.proname NOT IN ('get_vehicle_by_token', 'get_public_shop');

    IF v_funciones IS NOT NULL THEN
        RAISE EXCEPTION 'TEST FALLÓ: anon puede ejecutar: %', v_funciones;
    END IF;
    RAISE NOTICE 'TEST 3 PASÓ: anon solo ejecuta las funciones públicas.';
END;
$$;

-- 4. Test: Solo service_role puede pedir acceso por patente
DO $$
BEGIN
    IF has_function_privilege('anon', 'public.request_vehicle_access(text, text, text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.request_vehicle_access(text, text, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'TEST FALLÓ: request_vehicle_access es ejecutable fuera de service_role.';
    END IF;
    RAISE NOTICE 'TEST 4 PASÓ: request_vehicle_access es exclusiva de service_role.';
END;
$$;

-- 4.B. Test: Solo service_role puede tocar los contadores de intentos de autenticación
DO $$
BEGIN
    IF has_function_privilege('anon', 'public.register_auth_attempt(text, text, text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.register_auth_attempt(text, text, text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.clear_login_attempts(text, text)', 'EXECUTE')
       OR has_function_privilege('authenticated', 'public.clear_login_attempts(text, text)', 'EXECUTE') THEN
        RAISE EXCEPTION 'TEST FALLÓ: los contadores de intentos son ejecutables fuera de service_role.';
    END IF;
    RAISE NOTICE 'TEST 4.B PASÓ: los contadores de intentos son exclusivos de service_role.';
END;
$$;

-- 5. Test: Como anon, leer una tabla se rechaza y un token retorna solo su vehículo
SET LOCAL ROLE anon;

DO $$
BEGIN
    BEGIN
        PERFORM 1 FROM public.vehicles LIMIT 1;
        RAISE EXCEPTION 'TEST FALLÓ: anon pudo consultar vehicles directamente.';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST 5 PASÓ: anon no puede consultar vehicles.';
    END;
END;
$$;

DO $$
DECLARE
    v_res JSONB;
BEGIN
    v_res := public.get_vehicle_by_token('demo-token-amarok-ae123cd-el32');
    IF (v_res->>'success')::BOOLEAN <> TRUE THEN
        RAISE EXCEPTION 'TEST FALLÓ: No se pudo resolver el token demo.';
    END IF;
    IF (v_res->'vehicle'->>'patente') <> 'AE123CD' THEN
        RAISE EXCEPTION 'TEST FALLÓ: El token retornó un vehículo equivocado.';
    END IF;
    IF v_res::text LIKE '%notas_internas%' THEN
        RAISE EXCEPTION 'TEST FALLÓ: La respuesta pública incluye notas internas.';
    END IF;
    IF v_res::text LIKE '%Ficticio%' THEN
        RAISE EXCEPTION 'TEST FALLÓ: La respuesta pública incluye datos del cliente.';
    END IF;
    RAISE NOTICE 'TEST 6 PASÓ: el token aísla el vehículo y no expone datos privados.';
END;
$$;

ROLLBACK;
