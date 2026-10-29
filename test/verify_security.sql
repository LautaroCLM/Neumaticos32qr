-- ==============================================================================
-- Script de Verificación de Políticas RLS y Aislamiento en PostgreSQL / Supabase
-- Ejecutar en Supabase SQL Editor para verificar manualmente la seguridad
-- ==============================================================================

BEGIN;

-- 1. Test: Intentar SELECT directo como usuario anónimo (anon)
SET LOCAL ROLE anon;

-- Esto DEBE fallar con error de permisos o retornar 0 filas debido al bloqueo estricto de RLS
DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.vehicles;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST FALLÓ: El rol anónimo pudo leer la tabla vehicles directamente.';
    END IF;
    RAISE NOTICE 'TEST 1 PASÓ: anon no puede ver ningún registro de vehicles directamente.';
END;
$$;

DO $$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.services;
    IF v_count > 0 THEN
        RAISE EXCEPTION 'TEST FALLÓ: El rol anónimo pudo leer la tabla services directamente.';
    END IF;
    RAISE NOTICE 'TEST 2 PASÓ: anon no puede ver ningún registro de services directamente.';
END;
$$;

-- 2. Test: anon NO PUEDE ejecutar search_vehicle_public directamente
DO $$
BEGIN
    BEGIN
        PERFORM public.search_vehicle_public('AE123CD', '1.2.3.4');
        RAISE EXCEPTION 'TEST FALLÓ: anon pudo ejecutar search_vehicle_public directamente.';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'TEST 3 PASÓ: search_vehicle_public rechazó la ejecución de anon con insufficient_privilege.';
    END;
END;
$$;

-- 3. Test: Token público retorna solo su vehículo y servicios asociados
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
    RAISE NOTICE 'TEST 4 PASÓ: get_vehicle_by_token aísla correctamente el vehículo de la consulta.';
END;
$$;

ROLLBACK;
