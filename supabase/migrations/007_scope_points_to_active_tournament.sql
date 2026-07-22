-- ============================================================
-- Puntos por torneo activo
-- ============================================================
-- Antes: users_profile.total_pts (y por ende el leaderboard) sumaba TODAS las
-- predicciones del usuario, mezclando torneos (Mundial + Clausura).
-- Ahora: total_pts cuenta SOLO las predicciones de partidos del torneo activo
-- (tournaments.is_active). No se borra nada: el historial del Mundial queda,
-- pero no suma en la tabla del Clausura. Al cambiar el torneo activo, los
-- puntos se recalculan solos.

-- ── Trigger de cálculo de puntos: recompute de total_pts scopeado ────────────
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
    -- Puntaje de cada predicción del partido (igual que antes).
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

    -- total_pts = suma SOLO de predicciones de partidos del torneo activo.
    UPDATE public.users_profile up
    SET total_pts = (
      SELECT COALESCE(SUM(pr.points), 0)
      FROM public.predictions pr
      JOIN public.matches mm     ON mm.id = pr.match_id
      JOIN public.tournaments tt ON tt.id = mm.tournament_id
      WHERE pr.user_id = up.id AND pr.points IS NOT NULL AND tt.is_active
    )
    WHERE up.id IN (
      SELECT user_id FROM public.predictions WHERE match_id = NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ── Recalcular total_pts de todos (reset/rescope) ────────────────────────────
CREATE OR REPLACE FUNCTION public.recompute_total_pts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.users_profile up
  SET total_pts = (
    SELECT COALESCE(SUM(pr.points), 0)
    FROM public.predictions pr
    JOIN public.matches mm     ON mm.id = pr.match_id
    JOIN public.tournaments tt ON tt.id = mm.tournament_id
    WHERE pr.user_id = up.id AND pr.points IS NOT NULL AND tt.is_active
  );
$$;

-- ── Al cambiar el torneo activo, recalcular todo automáticamente ─────────────
CREATE OR REPLACE FUNCTION public.on_active_tournament_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.recompute_total_pts();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tournaments_active_changed ON public.tournaments;
CREATE TRIGGER tournaments_active_changed
  AFTER UPDATE OF is_active ON public.tournaments
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION public.on_active_tournament_change();

-- ── Aplicar ahora: deja total_pts con lo del torneo activo (Clausura) ────────
SELECT public.recompute_total_pts();
