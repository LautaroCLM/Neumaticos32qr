-- ==============================================================================
-- Migración: Programación de Limpieza Periódica de Rate Limits con pg_cron
-- ==============================================================================
-- Si la extensión pg_cron está soportada por el entorno de base de datos,
-- programa la ejecución automática de `public.cleanup_old_rate_limits()` cada hora.
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron'
    ) THEN
        BEGIN
            CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

            -- Desprogramar si ya existía para evitar duplicados
            IF EXISTS (
                SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits-hourly'
            ) THEN
                PERFORM cron.unschedule('cleanup-rate-limits-hourly');
            END IF;

            -- Programar ejecución al minuto 0 de cada hora
            PERFORM cron.schedule(
                'cleanup-rate-limits-hourly',
                '0 * * * *',
                'SELECT public.cleanup_old_rate_limits();'
            );

            RAISE NOTICE 'pg_cron: Tarea cleanup-rate-limits-hourly programada exitosamente.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Aviso pg_cron: No se pudo habilitar automáticamente (requiere activación manual en Supabase Dashboard): %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Aviso pg_cron: La extensión no está disponible en este servidor de Postgres.';
    END IF;
END $$;
