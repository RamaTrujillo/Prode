-- ============================================================
-- Escudos de los clubes en los partidos
-- ============================================================
-- Los clubes muestran escudo propio (no bandera de país como las selecciones
-- del Mundial). Guardamos la URL del escudo por partido; la puebla la Edge
-- Function desde el escudo que provee TheSportsDB. Nullable: en partidos sin
-- escudo (p. ej. los del Mundial, o cargas manuales) la UI cae al fallback
-- (bandera por nombre de selección, o placeholder con iniciales).
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS home_crest text;
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS away_crest text;
