-- Adds a new enum value `ver_perfil_usuario` to accion_auditoria so the
-- app can log READ accesses (admin opening /admin/predicciones for some
-- user), not just writes. The user's profile then surfaces these so
-- there's transparency about who looked at what.
--
-- Convention for this accion:
--   entidad_tipo = 'usuario'
--   entidad_id   = the usuario.id that was viewed
--   valor_nuevo  = { partido_id: '<uuid>' }  (optional, what they were viewing)
--   valor_anterior = null
--   motivo       = null (free text if we ever add an "explain the visit" field)
--
-- Note: ALTER TYPE … ADD VALUE cannot run inside a transaction block that
-- later uses the new value. Standalone DDL like this migration is fine —
-- Supabase runs each migration in its own implicit transaction and we don't
-- USE the value in the same migration.

ALTER TYPE accion_auditoria ADD VALUE IF NOT EXISTS 'ver_perfil_usuario';
