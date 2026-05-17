-- Tabla de posiciones consolidada por usuario.
--
-- Importante: NO se hace un único JOIN sobre las tres tablas de predicciones —
-- eso produce una explosión cartesiana y los SUM cuentan cada fila N veces
-- (clásico bug de cardinalidad). En su lugar, una subquery correlacionada por
-- tabla, cada una resolviendo el SUM en su propio contexto, después se suman.
--
-- Para 15 usuarios + ~64 partidos + (eventualmente) ~30 preguntas bonus, son
-- 4 lookups por usuario contra índices, costo despreciable.
--
-- marcadores_exactos cuenta solo predicciones con marcador igual al real
-- (los partidos no finalizados tienen marcador_*_real NULL, la comparación
-- evalúa a NULL y queda fuera del COUNT).
--
-- Cuando llegue Fase 8.6 (ajustes manuales de puntos), agregamos esa tabla
-- como cuarta subquery dentro del SUM.

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
  ) AS marcadores_exactos
FROM public.usuarios u
ORDER BY puntos_totales DESC, marcadores_exactos DESC, u.nombre ASC;

-- PostgREST necesita SELECT explícito sobre la view para exponerla a los
-- clientes autenticados. La view corre con privilegios del owner (postgres)
-- por defecto, así que ve toda la data agregada — lo que queremos para una
-- tabla de posiciones pública entre amigos.
GRANT SELECT ON public.leaderboard TO authenticated;
