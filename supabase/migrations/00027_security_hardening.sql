-- Security hardening after the pre-launch advisor sweep:
--
--   1. SECURITY DEFINER functions were callable by anon/authenticated via
--      PostgREST /rest/v1/rpc/<name>. A logged-in user could trigger
--      arbitrary recomputes, e.g. spam calcular_puntos_partido() in a loop.
--   2. The usuarios table exposed email to every authenticated user via
--      the existing `usuarios_select_all` RLS policy — anyone could pull
--      the full email list from devtools.
--   3. mundial_iniciado() was missing SET search_path, an easy defensive
--      hardening against search_path injection.
--
-- All changes are permission/grant level — they do NOT touch any rows.
-- 8 usuarios + 85 predicciones in prod stay intact.

-- =====================================================================
-- 1. REVOKE EXECUTE on SECURITY DEFINER functions
-- =====================================================================
-- Triggers still fire correctly because they run with the function's
-- definer role (postgres), not the calling user's role.
-- service_role keeps EXECUTE so the admin can still recompute via
-- our internal helpers if needed.

REVOKE EXECUTE ON FUNCTION public.calcular_puntos_partido(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calcular_puntos_bonus(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calcular_puntos_torneo() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;

-- =====================================================================
-- 2. Column-level access: hide email from other users
-- =====================================================================
-- Postgres column-level GRANT/REVOKE is the only built-in way to do this.
-- Strategy:
--   (a) REVOKE the broad SELECT.
--   (b) GRANT SELECT only on the non-sensitive columns.
--   (c) service_role inherits and keeps full SELECT for admin pages.
--
-- App impact: zero. The codebase NEVER reads usuarios.email — the user's
-- own email comes from auth.users via the session (user.email in server
-- components, see app/(app)/layout.tsx). Admin pages that show emails
-- use the service_role client which bypasses these grants.
--
-- The existing RLS policy `usuarios_select_all USING (true)` keeps
-- working as a row filter; column-level grants are evaluated separately.

REVOKE SELECT ON public.usuarios FROM anon, authenticated;
GRANT SELECT (id, nombre, foto_url, es_admin, created_at, updated_at)
  ON public.usuarios TO authenticated;

-- =====================================================================
-- 3. SET search_path on mundial_iniciado (defensive)
-- =====================================================================
-- Belt-and-braces with the public.* fully qualified reference to keep
-- the function safe even if a future search_path injection sneaks in.

CREATE OR REPLACE FUNCTION public.mundial_iniciado()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.partidos
    WHERE fecha_hora_kickoff <= now() + interval '1 minute'
  );
$$;
