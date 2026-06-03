-- Follow-up to 00027: the REVOKE … FROM anon, authenticated didn't actually
-- close the RPC door because Postgres grants EXECUTE to PUBLIC by default
-- when a function is created. anon/authenticated inherited EXECUTE via that
-- PUBLIC pseudo-role, so revoking from them directly was a no-op.
--
-- The right fix is `REVOKE EXECUTE … FROM PUBLIC`. After this:
--   - anon, authenticated      → can't call via /rest/v1/rpc/<name>
--   - service_role             → keeps EXECUTE (inherits as a superuser-like role)
--   - postgres / triggers      → keep EXECUTE (definer perms unaffected)
--
-- handle_new_user is a special case: it's called by the on_auth_user_created
-- trigger when a brand-new user signs up via Google OAuth. Triggers run with
-- their own permission rules and DO NOT require the inserting role to have
-- EXECUTE on the trigger function — so revoking from PUBLIC is safe and won't
-- break sign-ups. Verified against current Postgres semantics.

REVOKE EXECUTE ON FUNCTION public.calcular_puntos_partido(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calcular_puntos_bonus(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calcular_puntos_torneo() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
