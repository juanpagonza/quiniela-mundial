-- 2026 FIFA World Cup tiene un Round of 32 (R32) extra entre fase de grupos
-- y octavos, porque pasaron de 32 a 48 equipos. Football-data.org devuelve
-- ese stage como 'LAST_32', y nuestro enum `fase_partido` no lo cubría:
-- el import-fixture fallaba con NOT NULL en partidos.fase para esas filas
-- (solo se notaba cuando ambos equipos del R32 ya estaban resueltos).
--
-- Agregamos 'dieciseisavos' (término en español para 1/16 de final) entre
-- grupos y octavos. `BEFORE 'octavos'` no afecta el almacenamiento, solo
-- el orden lexicográfico del enum — útil cuando ordenamos por fase.
--
-- IF NOT EXISTS hace la migración idempotente.

ALTER TYPE public.fase_partido ADD VALUE IF NOT EXISTS 'dieciseisavos' BEFORE 'octavos';
