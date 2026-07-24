-- ============================================================
-- Modo de sincronización por torneo
-- ============================================================
-- Permite cargar el fixture a mano y que la Edge Function SOLO complete
-- (marcador, estado, horario real, escudos) sin riesgo de duplicados.
--
--   full        → inserta y actualiza por external_id (torneo manejado por API).
--   update_only → NO inserta; solo actualiza partidos ya cargados, matcheados
--                 por equipos. Si no matchea, no hace nada (nunca duplica).
--   off         → la Edge Function ignora el torneo.
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS sync_mode text NOT NULL DEFAULT 'full'
  CHECK (sync_mode IN ('full', 'update_only', 'off'));

-- Clausura: fixture cargado a mano → la API solo completa/actualiza.
UPDATE public.tournaments SET sync_mode = 'update_only' WHERE id = 2;
-- Mundial: histórico, sin sync.
UPDATE public.tournaments SET sync_mode = 'off' WHERE id = 1;
