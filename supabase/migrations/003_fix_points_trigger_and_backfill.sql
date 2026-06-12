-- ============================================================
-- FIX: el cálculo de puntos no corría para partidos finalizados.
--
-- Causa: el trigger original era AFTER UPDATE y exigía la transición
-- OLD.status <> 'finished'. Si un partido se inserta directamente como
-- 'finished' (p. ej. el cron lo levanta por primera vez cuando la API
-- ya lo da FINISHED), nunca dispara y las predicciones quedan en NULL.
--
-- Solución: el trigger corre en INSERT OR UPDATE y dispara ante cualquier
-- cambio relevante (alta, cambio de status o corrección de marcador),
-- siempre que el partido esté 'finished' y con ambos scores cargados.
-- Sigue exigiendo 'finished' para no puntuar resultados en vivo/parciales.
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'finished'
     AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL
     AND (
       TG_OP = 'INSERT'
       OR OLD.status     IS DISTINCT FROM NEW.status
       OR OLD.home_score IS DISTINCT FROM NEW.home_score
       OR OLD.away_score IS DISTINCT FROM NEW.away_score
     )
  THEN
    UPDATE public.predictions p
    SET
      points = CASE
        WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score THEN 3
        WHEN (
          (p.home_score > p.away_score AND NEW.home_score > NEW.away_score) OR
          (p.home_score < p.away_score AND NEW.home_score < NEW.away_score) OR
          (p.home_score = p.away_score AND NEW.home_score = NEW.away_score)
        ) THEN 1
        ELSE 0
      END,
      updated_at = now()
    WHERE p.match_id = NEW.id;

    UPDATE public.users_profile up
    SET total_pts = (
      SELECT COALESCE(SUM(pr.points), 0)
      FROM public.predictions pr
      WHERE pr.user_id = up.id AND pr.points IS NOT NULL
    )
    WHERE up.id IN (
      SELECT user_id FROM public.predictions WHERE match_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_match_finished ON public.matches;

CREATE TRIGGER on_match_finished
  AFTER INSERT OR UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.calculate_prediction_points();

-- ============================================================
-- BACKFILL: recalcular puntos de los partidos ya finalizados
-- ============================================================

UPDATE public.predictions p
SET
  points = CASE
    WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 3
    WHEN (
      (p.home_score > p.away_score AND m.home_score > m.away_score) OR
      (p.home_score < p.away_score AND m.home_score < m.away_score) OR
      (p.home_score = p.away_score AND m.home_score = m.away_score)
    ) THEN 1
    ELSE 0
  END,
  updated_at = now()
FROM public.matches m
WHERE p.match_id = m.id
  AND m.status = 'finished'
  AND m.home_score IS NOT NULL
  AND m.away_score IS NOT NULL;

UPDATE public.users_profile up
SET total_pts = (
  SELECT COALESCE(SUM(pr.points), 0)
  FROM public.predictions pr
  WHERE pr.user_id = up.id AND pr.points IS NOT NULL
);
