-- ============================================================
-- Torneos (multi-torneo escalable)
-- ============================================================
-- Permite tener varios torneos en la misma base (Mundial ya jugado, Clausura
-- activo, futuros Apertura/Clausura, etc.) y mostrar solo el activo, sin borrar
-- el historial. Cada partido pertenece a un torneo vía matches.tournament_id.

CREATE TABLE IF NOT EXISTS public.tournaments (
  id                 integer PRIMARY KEY,   -- 1 = Mundial 2026, 2 = Clausura 2026, ...
  name               text NOT NULL,
  slug               text UNIQUE NOT NULL,
  season             integer,
  external_league_id integer,               -- id de liga en la API de resultados (TheSportsDB: 4406 = Primera Arg.); null si la API no aplica
  round_filter       text,                  -- etiqueta del torneo dentro de la liga/temporada; se usa para elegir las posiciones de este torneo en TheSportsDB (strGroup contiene 'Clausura')
  starts_on          date,                  -- fecha de arranque; los eventos anteriores (p. ej. el Apertura) se descartan
  group_label        text NOT NULL DEFAULT 'Grupo', -- término de la fase de grupos: 'Grupo' (Mundial) / 'Zona' (Clausura)
  is_active          boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Columnas defensivas: si la tabla ya existía de una versión previa, el
-- CREATE TABLE IF NOT EXISTS de arriba es un no-op y NO agrega columnas nuevas.
-- Estos ALTER garantizan que re-ejecutar la migración deje el esquema al día.
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS season integer;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS external_league_id integer;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS round_filter text;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS starts_on date;
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS group_label text NOT NULL DEFAULT 'Grupo';
ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- A lo sumo un torneo activo a la vez (el que muestra la app).
CREATE UNIQUE INDEX IF NOT EXISTS tournaments_single_active
  ON public.tournaments (is_active) WHERE is_active;

-- Cada partido pertenece a un torneo.
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS tournament_id integer REFERENCES public.tournaments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS matches_tournament_id_idx ON public.matches (tournament_id);

-- ── Seed ─────────────────────────────────────────────────────────────────────
-- Mundial 2026: ya jugado, se conserva como historial (inactivo, sin API).
-- Clausura 2026: torneo activo, se sincroniza desde TheSportsDB (league 4406).
-- El Clausura arranca en el 2do semestre; starts_on descarta los partidos del
-- Apertura que devuelva la API para la misma temporada.
INSERT INTO public.tournaments (id, name, slug, season, external_league_id, round_filter, starts_on, group_label, is_active) VALUES
  (1, 'Mundial 2026',         'mundial-2026',  2026, NULL, NULL,       NULL,         'Grupo', false),
  (2, 'Torneo Clausura 2026', 'clausura-2026', 2026, 4406, 'Clausura', '2026-07-01', 'Zona',  true)
-- Reconcilia la config si el torneo ya existía (no pisa is_active para no
-- revertir un cambio manual de torneo activo).
ON CONFLICT (id) DO UPDATE SET
  name               = EXCLUDED.name,
  slug               = EXCLUDED.slug,
  season             = EXCLUDED.season,
  external_league_id = EXCLUDED.external_league_id,
  round_filter       = EXCLUDED.round_filter,
  starts_on          = EXCLUDED.starts_on,
  group_label        = EXCLUDED.group_label;

-- Los partidos existentes son todos del Mundial → torneo 1.
UPDATE public.matches SET tournament_id = 1 WHERE tournament_id IS NULL;

-- ── RLS: lectura pública (como matches) ──────────────────────────────────────
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments_select" ON public.tournaments
  FOR SELECT USING (true);
