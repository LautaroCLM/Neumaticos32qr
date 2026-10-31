-- ==============================================================================
-- Migración: Refuerzo de Seguridad
-- Supabase da por defecto permisos completos a anon y authenticated sobre todo lo nuevo
-- en public, y solo RLS los frena. Acá los permisos pasan a ser explícitos: si una tabla
-- futura quedara sin RLS, anon igual no podría leerla.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Objetos futuros: sin permisos automáticos
-- ------------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ------------------------------------------------------------------------------
-- 2. Tablas
-- anon no accede a ninguna: la vista pública pasa por funciones.
-- authenticated solo tiene lo que usan las políticas RLS.
-- ------------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA public FROM authenticated;

REVOKE ALL ON public.rate_limit_attempts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_revisions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.vehicle_owners FROM authenticated;
REVOKE UPDATE, DELETE ON public.services FROM authenticated;
REVOKE INSERT, DELETE ON public.shops FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.staff_users FROM authenticated;

-- ------------------------------------------------------------------------------
-- 3. Funciones: lista explícita de quién puede ejecutar cada una
-- ------------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.get_vehicle_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_shop() TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_auth_shop_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_visibilidad_jsonb(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_vehicle_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_vehicle_token(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_service_with_audit(UUID, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_vehicle_owner(UUID, UUID, BOOLEAN) TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. Alta de servicios: el estado y el autor no los decide quien carga
-- ------------------------------------------------------------------------------
DROP POLICY "Staff can INSERT services in their own shop" ON public.services;

CREATE POLICY "Staff can INSERT services in their own shop"
ON public.services FOR INSERT
TO authenticated
WITH CHECK (
    shop_id = public.get_auth_shop_id()
    AND vehicle_id IN (SELECT v.id FROM public.vehicles v WHERE v.shop_id = public.get_auth_shop_id() AND v.deleted_at IS NULL)
    AND created_by = auth.uid()
    AND anulado = FALSE
    AND editado = FALSE
);

-- ------------------------------------------------------------------------------
-- 5. Marcas de tiempo
-- NOW() AT TIME ZONE 'utc' da una hora sin zona que Postgres reinterpreta según la sesión:
-- solo es correcta si la sesión está en UTC. Se pasa a NOW() en los valores por defecto y
-- se fija UTC en las funciones que todavía usan esa expresión.
-- ------------------------------------------------------------------------------
ALTER TABLE public.shops
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.vehicles
ALTER COLUMN token_created_at SET DEFAULT NOW(),
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.services
ALTER COLUMN fecha_hora SET DEFAULT NOW(),
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.staff_users ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.rate_limit_attempts ALTER COLUMN attempted_at SET DEFAULT NOW();
ALTER TABLE public.service_revisions ALTER COLUMN editado_en SET DEFAULT NOW();

ALTER TABLE public.service_templates
ALTER COLUMN created_at SET DEFAULT NOW(),
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER FUNCTION public.regenerate_vehicle_token(UUID) SET timezone = 'UTC';
ALTER FUNCTION public.revoke_vehicle_token(UUID) SET timezone = 'UTC';
ALTER FUNCTION public.update_service_with_audit(UUID, JSONB, TEXT) SET timezone = 'UTC';
ALTER FUNCTION public.trg_vehicles_before_insert_token_fn() SET timezone = 'UTC';
