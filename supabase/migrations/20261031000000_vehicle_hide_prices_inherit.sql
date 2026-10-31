-- ==============================================================================
-- Migración: Herencia de ocultar_precios desde el taller
-- El alta de vehículos guardaba FALSE cuando no se marcaba la opción, lo que anulaba
-- la configuración general del taller. El panel solo permite marcar "ocultar", así que
-- FALSE nunca fue una elección explícita y equivale a heredar (NULL).
-- ==============================================================================

UPDATE public.vehicles
SET ocultar_precios = NULL
WHERE ocultar_precios = FALSE;
