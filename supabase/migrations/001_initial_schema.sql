-- ============================================================
-- TABLAS
-- ============================================================

-- Perfil de usuario (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.users_profile (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text UNIQUE NOT NULL,
  avatar_url text,
  total_pts  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Partidos del Mundial
CREATE TABLE IF NOT EXISTS public.matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date  timestamptz NOT NULL,
  home_team   text NOT NULL,
  away_team   text NOT NULL,
  home_score  integer,
  away_score  integer,
  status      text NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled', 'live', 'finished')),
  stage       text NOT NULL
                CHECK (stage IN ('group', 'round_of_16', 'quarter', 'semi', 'final')),
  group_name  text,
  external_id text UNIQUE NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Predicciones (una por usuario por partido)
CREATE TABLE IF NOT EXISTS public.predictions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id   uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score integer NOT NULL CHECK (home_score >= 0),
  away_score integer NOT NULL CHECK (away_score >= 0),
  points     integer CHECK (points IN (0, 1, 3)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, match_id)
);

-- ============================================================
-- TRIGGER: crear perfil automáticamente al registrarse
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users_profile (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: calcular puntos cuando un partido finaliza
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_prediction_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status <> 'finished'
     AND NEW.home_score IS NOT NULL AND NEW.away_score IS NOT NULL
  THEN
    -- Asignar puntos a cada predicción del partido
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

    -- Actualizar total_pts en users_profile
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

CREATE OR REPLACE TRIGGER on_match_finished
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.calculate_prediction_points();

-- ============================================================
-- TRIGGER: updated_at en predictions
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER predictions_updated_at
  BEFORE UPDATE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- VIEW: leaderboard
-- ============================================================

CREATE OR REPLACE VIEW public.leaderboard
WITH (security_invoker = false)
AS
SELECT
  up.id,
  up.username,
  up.avatar_url,
  up.total_pts,
  RANK() OVER (ORDER BY up.total_pts DESC) AS position
FROM public.users_profile up
ORDER BY up.total_pts DESC;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions   ENABLE ROW LEVEL SECURITY;

-- users_profile: cualquier autenticado puede leer; solo uno mismo puede editar
CREATE POLICY "profiles_select" ON public.users_profile
  FOR SELECT USING (true);

CREATE POLICY "profiles_update_own" ON public.users_profile
  FOR UPDATE USING (auth.uid() = id);

-- matches: lectura pública; escritura solo service_role (Edge Function)
CREATE POLICY "matches_select" ON public.matches
  FOR SELECT USING (true);

-- predictions: el usuario solo ve y edita las suyas
CREATE POLICY "predictions_select_own" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "predictions_insert_own" ON public.predictions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    (SELECT match_date FROM public.matches WHERE id = match_id) > now()
  );

CREATE POLICY "predictions_update_own" ON public.predictions
  FOR UPDATE USING (
    auth.uid() = user_id AND
    (SELECT match_date FROM public.matches WHERE id = match_id) > now()
  );
