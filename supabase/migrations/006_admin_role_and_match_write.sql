-- ============================================================
-- Rol admin + escritura de partidos desde la app
-- ============================================================
-- Un usuario es admin si tiene role='admin' en su app_metadata (seteable solo
-- del lado servidor: Dashboard → Authentication → Users → editar app_metadata,
-- o vía service_role). El usuario NO puede auto-asignárselo. El claim viaja en
-- el JWT, así que las políticas RLS lo pueden leer.

-- Para marcar un admin desde el SQL Editor (alternativa al Dashboard):
--   UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
--   WHERE email = 'tu-admin@ejemplo.com';

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

-- Escritura de partidos: solo admins (la Edge Function usa service_role, que
-- saltea RLS, así que sigue sincronizando igual). La lectura sigue siendo
-- pública por la policy matches_select ya existente.
DROP POLICY IF EXISTS "matches_admin_insert" ON public.matches;
CREATE POLICY "matches_admin_insert" ON public.matches
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "matches_admin_update" ON public.matches;
CREATE POLICY "matches_admin_update" ON public.matches
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "matches_admin_delete" ON public.matches;
CREATE POLICY "matches_admin_delete" ON public.matches
  FOR DELETE TO authenticated
  USING (public.is_admin());
