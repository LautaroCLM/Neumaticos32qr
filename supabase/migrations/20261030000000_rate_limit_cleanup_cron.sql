-- ==============================================================================
-- Migración: Programación de Limpieza Periódica de Rate Limits con pg_cron
-- Totalmente tolerante: si pg_cron no está habilitado, no bloquea ni rompe db push.
-- ==============================================================================

DO $$
DECLARE
    v_cron_installed BOOLEAN := FALSE;
BEGIN
    -- 1. Verificar si pg_cron ya está habilitado en pg_extension
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') INTO v_cron_installed;

    -- 2. Si no está habilitado, intentar crearlo de manera tolerante
    IF NOT v_cron_installed THEN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
            BEGIN
                CREATE EXTENSION IF NOT EXISTS pg_cron;
                v_cron_installed := TRUE;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Aviso pg_cron: La extensión no se pudo crear automáticamente (debe activarse en Supabase Dashboard -> Database -> Extensions): %', SQLERRM;
                v_cron_installed := FALSE;
            END;
        END IF;
    END IF;

    -- 3. Si pg_cron está activo, programar la tarea usando SQL dinámico (evita errores de parseo en frío)
    IF v_cron_installed THEN
        BEGIN
            EXECUTE $cron$
                DO $inner$
                BEGIN
                    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits-hourly') THEN
                        PERFORM cron.unschedule('cleanup-rate-limits-hourly');
                    END IF;
                    PERFORM cron.schedule(
                        'cleanup-rate-limits-hourly',
                        '0 * * * *',
                        'SELECT public.cleanup_old_rate_limits();'
                    );
                END $inner$;
            $cron$;
            RAISE NOTICE 'pg_cron: Tarea horaria cleanup-rate-limits-hourly programada exitosamente.';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Aviso pg_cron: No se pudo programar la tarea en este momento: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'pg_cron no está disponible en este entorno. La migración finalizó exitosamente sin bloquear el despliegue.';
    END IF;
END $$;
