-- Adds a new enum value `editar_prediccion_torneo` to accion_auditoria so the
-- admin /admin/torneo editor can log changes to a participant's tournament-
-- wide predictions (campeón, subcampeón, goleador). Same pattern as
-- 'editar_prediccion_partido' and 'editar_prediccion_bonus'.
--
-- Convention for this accion:
--   entidad_tipo  = 'prediccion_torneo'
--   entidad_id    = the usuario.id whose row was modified (usuario_id is
--                   UNIQUE in predicciones_torneo, so it identifies the row)
--   valor_anterior = { campeon_equipo_id, subcampeon_equipo_id, goleador_nombre }
--                    or null if the user didn't have a row yet
--   valor_nuevo    = { campeon_equipo_id, subcampeon_equipo_id, goleador_nombre }
--   motivo         = null
--
-- Note: ALTER TYPE … ADD VALUE cannot run inside a transaction block that
-- later uses the new value. Standalone DDL like this migration is fine —
-- Supabase runs each migration in its own implicit transaction and we don't
-- USE the value in the same migration.

ALTER TYPE accion_auditoria ADD VALUE IF NOT EXISTS 'editar_prediccion_torneo';
