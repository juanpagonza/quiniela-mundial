-- Surfaces puntos de bonus como columna propia en la vista `leaderboard`.
-- Antes el total de bonus se sumaba al `puntos_totales` y no se exponía
-- aparte — la tabla de posiciones ahora muestra una columna "Bonus" para
-- que los participantes vean qué proporción de sus puntos viene de las
-- preguntas extra que el admin habilitó.
--
-- Misma técnica del 00017 (subquery por tabla para evitar la explosión
-- cartesiana) — solo se promueve la subquery de bonus a columna nombrada.
-- `puntos_totales` sigue siendo la suma de las tres fuentes; nada cambia
-- para los consumidores existentes.
--
-- CREATE OR REPLACE VIEW exige conservar el orden y tipos de las columnas
-- existentes (Postgres rechaza con 42P16 si insertás una columna en el medio
-- o renombrás), así que `puntos_bonus` se agrega al final, después de las
-- 5 columnas originales (usuario_id, nombre, foto_url, puntos_totales,
-- marcadores_exactos). El GRANT existente se preserva intacto.

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id AS usuario_id,
  u.nombre,
  u.foto_url,
  (
    SELECT COALESCE(SUM(puntos_obtenidos), 0)::INTEGER
    FROM public.predicciones_partido
    WHERE usuario_id = u.id
  ) +
  (
    SELECT COALESCE(SUM(puntos_obtenidos), 0)::INTEGER
    FROM public.predicciones_bonus
    WHERE usuario_id = u.id
  ) +
  COALESCE(
    (
      SELECT puntos_campeon + puntos_subcampeon + puntos_goleador
      FROM public.predicciones_torneo
      WHERE usuario_id = u.id
    ),
    0
  ) AS puntos_totales,
  (
    SELECT COUNT(*)::INTEGER
    FROM public.predicciones_partido pp
    JOIN public.partidos p ON p.id = pp.partido_id
    WHERE pp.usuario_id = u.id
      AND pp.marcador_local = p.marcador_local_real
      AND pp.marcador_visitante = p.marcador_visitante_real
  ) AS marcadores_exactos,
  (
    SELECT COALESCE(SUM(puntos_obtenidos), 0)::INTEGER
    FROM public.predicciones_bonus
    WHERE usuario_id = u.id
  ) AS puntos_bonus
FROM public.usuarios u
ORDER BY puntos_totales DESC, marcadores_exactos DESC, u.nombre ASC;
